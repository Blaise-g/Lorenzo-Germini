import { connection } from "next/server";

import { RESUME_DATA } from "@/data/resume-data";
import { MARKDOWN_MEDIA_TYPE } from "@/lib/markdown-negotiation";
import { SUBSTACK_FEED_URL } from "@/lib/substack";

/**
 * The markdown an agent reads, rendered from `RESUME_DATA` rather than written
 * out a second time (GH-117; ADR-0005 for the decision and the sibling set).
 *
 * `public/llms.txt` and `public/llms-full.txt` are the only identity surfaces
 * holding their own copy of the prose, which is why they drift the worst, and
 * this module exists so the markdown surfaces cannot join them. Nothing here
 * reads the request, so every sibling says the same thing on every request and
 * the freshness guarantee is the deploy, exactly as for every other surface
 * `RESUME_DATA` feeds.
 *
 * They no longer prerender, though, and that is deliberate: `markdownResponse`
 * awaits `connection()` so the response can carry `Vary` (GH-118, and the
 * reasoning is with that function).
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

const projectBlock = (project: (typeof RESUME_DATA.projects)[number]) =>
  lines([
    `### ${project.title}`,
    /* "Tags", not "Tech stack": the field mixes stack entries with status
       labels ("Side Project", "Live"), and `/cv` renders it as an unlabelled
       metadata line for exactly that reason. */
    `Tags: ${project.techStack.join(", ")}`,
    project.description,
    project.link ? `Link: ${project.link.href}` : "",
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
    ...RESUME_DATA.projects.map(projectBlock),
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
 * `/index.md`: the homepage as markdown, and the root's negotiation target.
 *
 * It exists because the is-agentic.com check probes `/` — a verified client
 * asking for markdown at the root, which is what amended ADR-0005's rule against
 * inventing sibling paths. Its shape follows the homepage rather than the CV:
 * positioning first, the writing as the first door, the proof underneath. That
 * makes the overlap with `/llms-full.txt` deliberate — this one is addressable as the root's representation, which a
 * `.txt` manifest is not.
 */
export function renderIndexMarkdown(): string {
  const { earlierRoles, hero, systems, writing } = RESUME_DATA.homepage;
  const { headline } = hero;

  return document([
    `# ${RESUME_DATA.name} — ${RESUME_DATA.roleLabel}`,
    ...identityCore(),
    "## What I do",
    `${headline.lead}${headline.emphasis}${headline.trail}`,
    hero.subhead,
    "## Writing",
    writing.standingLine,
    lines([
      `### ${writing.featured.title}`,
      writing.featured.excerpt,
      `Link: ${writing.featured.href}`,
    ]),
    `- Index: ${site("/writing")} — as markdown: ${site("/writing.md")}`,
    "## Work",
    /* The roles the homepage stands behind, in its own words. The rest fold
       into one line there rather than rendering a CV bullet, and folding them
       here too keeps this file the homepage's representation — `/cv.md` is
       where an agent goes for the complete record. */
    ...RESUME_DATA.work.filter((role) => role.homepageProof).map(roleBlock),
    `Earlier: ${earlierRoles.join("; ")}.`,
    `The complete record, with every role, project and grade: ${site("/cv")} — as markdown: ${site("/cv.md")}`,
    "## Projects",
    ...RESUME_DATA.projects
      .filter((project) => project.homepage !== false)
      .map(projectBlock),
    "## Systems",
    systems,
    ...contactSection(),
  ]);
}

/**
 * One content-type and one `Vary`, set once, so the sibling routes cannot
 * disagree about what they serve — which is the whole reason an agent asked for
 * a `.md` URL.
 *
 * `Vary: Accept` is here rather than in `src/proxy.ts` because this is the only
 * layer whose header survives production: a header the proxy appends is
 * stripped by the CDN, and asserting it would pass against `next dev` and be
 * false where it matters (GH-118). It also only survives from a route that is
 * not prerendered, which is what the `connection()` await buys — a prerendered
 * route has its `Vary` overwritten with Next's router headers. `force-dynamic`
 * is not the lever: it build-errors under `cacheComponents`, and only in the
 * build log.
 *
 * `s-maxage` is the offer to put back the CDN caching that leaving the prerender
 * cost — how much of it comes back is unmeasured, since `x-vercel-cache` does
 * not exist against `next dev` and Vercel folds `Vary`-named headers into the
 * cache key, so the entries may fragment per `Accept` value rather than per URL.
 * The body is a pure function of `RESUME_DATA` either way: it can only change on
 * a deploy, and a deploy invalidates the edge cache, so the window below is an
 * upper bound on nothing.
 */
export async function markdownResponse(body: string): Promise<Response> {
  await connection();

  return new Response(body, {
    headers: {
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "content-type": `${MARKDOWN_MEDIA_TYPE}; charset=utf-8`,
      vary: "Accept",
    },
  });
}
