import { RESUME_DATA } from "@/data/resume-data";
import { SUBSTACK_FEED_URL } from "@/lib/substack";

/**
 * The markdown an agent reads, rendered from `RESUME_DATA` rather than written
 * out a second time (GH-117; ADR-0005 for the decision and the sibling set).
 *
 * `public/llms.txt` and `public/llms-full.txt` are the only identity surfaces
 * holding their own copy of the prose, which is why they drift the worst, and
 * this module exists so the markdown surfaces cannot join them. Both routes
 * prerender: nothing here reads the request, so the generation happens at build
 * and the freshness guarantee is the deploy, exactly as for every other surface
 * `RESUME_DATA` feeds.
 */

/** Empty parts drop out, so an absent optional field costs no blank line. */
const join = (separator: string, parts: readonly string[]) =>
  parts.filter((part) => part !== "").join(separator);

/** A blank line between blocks is the only separator markdown needs. */
const document = (blocks: readonly string[]) => `${join("\n\n", blocks)}\n`;

const lines = (items: readonly string[]) => join("\n", items);

const site = (path: string) =>
  new URL(path, RESUME_DATA.personalWebsiteUrl).href;

/**
 * What every sibling says before it says anything surface-specific: who this
 * is, the bio, and when to engage him.
 *
 * Repeated across siblings rather than split into a shared `/profile.md` an
 * agent would have to fetch second — a sibling is read whole, once, on a
 * context budget. Repetition is only a drift risk when it is hand-typed, and
 * this is the same expression evaluated twice.
 */
const identityCore = () => [
  `> ${RESUME_DATA.about}. Based in ${RESUME_DATA.location}.`,
  "## Profile",
  RESUME_DATA.summary,
  "## When to use this",
  RESUME_DATA.agentGuidance,
  /* The address is not in `agentGuidance` — it already exists as
     `contact.email` — so the section is only complete once this line lands
     inside it. `content-correctness.spec.ts` reads the section, not the file. */
  `Contact: ${RESUME_DATA.contact.email}`,
];

const contactSection = () => {
  const { contact, personalWebsiteUrl } = RESUME_DATA;

  return [
    "## Contact",
    lines([
      `- Email: ${contact.email}`,
      contact.tel ? `- Phone: ${contact.tel}` : "",
      `- Website: ${personalWebsiteUrl}`,
      ...contact.social.map(({ name, url }) => `- ${name}: ${url}`),
    ]),
  ];
};

const roleBlock = (role: (typeof RESUME_DATA.work)[number]) =>
  lines([
    `### ${role.title} at ${role.company} (${role.start} - ${role.end})`,
    role.badges.length > 0 ? `Location: ${role.badges.join(", ")}` : "",
    role.link ? `Link: ${role.link}` : "",
    ...[role.description].flat().map((bullet) => `- ${bullet}`),
  ]);

/** `/cv.md`: the complete record, in the section order `/cv` renders. */
export function renderCvMarkdown(): string {
  return document([
    `# ${RESUME_DATA.name} — CV`,
    ...identityCore(),
    `The same CV as HTML: ${site("/cv")} — as a PDF: ${site("/lorenzo-germini-cv.pdf")}`,
    ...contactSection(),
    "## Experience",
    ...RESUME_DATA.work.map(roleBlock),
    "## Projects",
    ...RESUME_DATA.projects.map((project) =>
      lines([
        `### ${project.title}`,
        /* "Tags", not "Tech stack": the field mixes stack entries with status
           labels ("Side Project", "Live"), and `/cv` renders it as an unlabelled
           metadata line for exactly that reason. */
        `Tags: ${project.techStack.join(", ")}`,
        project.description,
        project.link ? `Link: ${project.link.href}` : "",
      ]),
    ),
    "## Education",
    ...RESUME_DATA.education.map((entry) =>
      lines([
        `### ${entry.degree}`,
        `${entry.school}, ${entry.start}-${entry.end}`,
        entry.grade ? `Grade: ${entry.grade}` : "",
      ]),
    ),
    "## Skills",
    lines(
      RESUME_DATA.skillGroups.map(
        (group) => `- ${group.name}: ${group.skills.join(", ")}`,
      ),
    ),
  ]);
}

/**
 * `/writing.md`: the frame around the essays, not the essays.
 *
 * The index itself renders the live germinai feed, which nothing in
 * `RESUME_DATA` holds and no generated file can restate without inventing a
 * cache of its own. So this points at the feed and at the index, and says which
 * one is authoritative. The current role comes along because an agent reading
 * only this file should still know who is writing.
 */
export function renderWritingMarkdown(): string {
  const { newsletter, writingPage } = RESUME_DATA;
  const [currentRole] = RESUME_DATA.work;

  return document([
    `# ${RESUME_DATA.name} — Writing`,
    ...identityCore(),
    "## Currently",
    roleBlock(currentRole),
    "## Writing",
    writingPage.standfirst,
    lines([
      `- Publication: ${newsletter.name} — ${newsletter.url}`,
      `- Feed: ${SUBSTACK_FEED_URL}`,
      `- Index: ${site("/writing")} — the essays listed on this site; each one links out to Substack, which hosts the full text`,
    ]),
    `The essay list is read live from the ${newsletter.name} feed rather than restated here, so the index above is the current one: ${writingPage.cadence}.`,
    ...contactSection(),
  ]);
}

/**
 * One content-type, set once, so the sibling routes cannot disagree about what
 * they serve — which is the whole reason an agent asked for a `.md` URL.
 */
export function markdownResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      /* GH-118 probe: does a route-handler `Vary` survive the CDN? */
      vary: "Accept, Accept-Encoding",
      "x-probe-route": "matched",
    },
  });
}
