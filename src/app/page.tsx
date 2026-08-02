/*
THESIS: The homepage is a positioning statement with the writing as its first
door, not a chronological résumé that happens to mention essays.
OWN-WORLD: Warm Print at one reading measure — serif hero, mono metadata,
terracotta reserved for the accent italic, the section rules, and links.
STORY: Read what he does, read the essay, then check the proof underneath.
FIRST VIEWPORT: The `<h1>` and a subhead that names Complaion and the systems
behind it, above the writing CTA — the fold is where the technical claim is made.
FORM: Masthead rule, band-or-rail identity, then five sections at 42rem.
*/

import React from "react";
import { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { MailIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESUME_DATA } from "@/data/resume-data";
import { ProjectCard } from "@/components/project-card";
import { StructuredData } from "@/components/structured-data";
import { cn } from "@/lib/utils";
import { HubShell } from "@/components/hub-shell";
import { formatEssayDate } from "@/lib/substack-feed";

export const metadata: Metadata = {
  title: `${RESUME_DATA.name} | ${RESUME_DATA.about}`,
  description: RESUME_DATA.summary,
  /* The retired hosts 308 here rather than disappearing, so `/` needs the same
     self-canonical `/cv` and `/writing` already carry — otherwise the redirect
     source stays indexable as a duplicate of this page. */
  alternates: { canonical: RESUME_DATA.personalWebsiteUrl },
};

const HUB_SECTIONS = {
  about: { id: "about", label: "About" },
  projects: { id: "projects", label: "Projects" },
  systems: { id: "systems", label: "Systems" },
  work: { id: "work", label: "Work" },
  writing: { id: "writing", label: "Writing" },
} as const;

/* Writing leads: it is the page's single primary CTA (spec §2.6 constraint 6),
   so it is also the first destination the rail offers. */
const HUB_DESTINATIONS = [
  HUB_SECTIONS.writing,
  HUB_SECTIONS.about,
  HUB_SECTIONS.work,
  HUB_SECTIONS.projects,
  HUB_SECTIONS.systems,
] as const;

const sectionClassName =
  "animate-fade-in-up max-w-[42rem] scroll-mt-24 print:gap-y-1";

const { hero, writing, earlierRoles, systems } = RESUME_DATA.homepage;

export default function Page() {
  const commandLinks = [
    {
      url: RESUME_DATA.personalWebsiteUrl,
      title: "Personal Website",
    },
    ...RESUME_DATA.contact.social.map((socialMediaLink) => ({
      url: socialMediaLink.url,
      title: socialMediaLink.name,
    })),
  ];

  /* Roles without hand-written homepage proof fold into one earlier line rather
     than rendering a CV bullet the homepage was not written for. */
  const provenRoles = RESUME_DATA.work.filter((work) => work.homepageProof);
  /* Oldest start year to newest end year, so a folded role that ran into a
     later year is not undersold by its start date. */
  const foldedRoles = RESUME_DATA.work.filter((work) => !work.homepageProof);
  const earlierRolesSpan = [
    (foldedRoles.at(0)?.end ?? foldedRoles.at(0)?.start)?.slice(-4),
    foldedRoles.at(-1)?.start.slice(-4),
  ];

  return (
    <>
      <StructuredData />
      <HubShell
        commandLinks={commandLinks}
        destinations={HUB_DESTINATIONS}
        profile={{
          actions: <ProfileActions />,
          avatarAlt: RESUME_DATA.name,
          avatarUrl: RESUME_DATA.avatarUrl,
          bio: RESUME_DATA.about,
          location: RESUME_DATA.location,
          name: RESUME_DATA.name,
          roleLabel: RESUME_DATA.roleLabel,
        }}
      >
        {/* Hero — the page's only <h1>. */}
        <Section
          data-reading-measure="true"
          className={cn(sectionClassName, "gap-y-0")}
        >
          <h1 className="font-display text-[clamp(2rem,5.2vw,3.25rem)] leading-[1.08] font-medium tracking-tight text-pretty">
            {hero.headline.lead}
            <em className="text-accent italic">{hero.headline.emphasis}</em>
            {hero.headline.trail}
          </h1>
          <p className="text-body mt-6 text-base leading-relaxed text-pretty print:mt-2 print:text-[12px]">
            {hero.subhead}
          </p>
          <a
            href={`#${HUB_SECTIONS.writing.id}`}
            className="text-accent border-accent touch-target mt-7 inline-block self-start border-b-2 pb-0.5 font-mono text-xs tracking-[0.12em] uppercase hover:opacity-70 print:hidden"
          >
            {hero.cta}
          </a>
        </Section>

        {/* Writing — text-only lead teaser: no numbering, no covers, no
            subscribe module, so the single CTA stays uncontested (§2.6). */}
        <Section
          id={HUB_SECTIONS.writing.id}
          data-reading-measure="true"
          className={sectionClassName}
        >
          <SectionHeading>Writing</SectionHeading>
          <p className="text-body text-base leading-relaxed text-pretty print:text-[12px]">
            {writing.standingLine}
          </p>
          <article className="group mt-2">
            {writing.featured.date && writing.featured.readingMinutes ? (
              <p className="text-faint font-mono text-xs tracking-[0.12em] uppercase">
                {formatEssayDate(writing.featured.date)} ·{" "}
                {writing.featured.readingMinutes} min read
              </p>
            ) : null}
            <h3 className="font-display mt-2 text-2xl leading-snug sm:text-3xl">
              <a
                className="underline-offset-4 group-hover:underline"
                href={writing.featured.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {writing.featured.title}
              </a>
            </h3>
            <p className="text-body mt-3 text-base leading-relaxed text-pretty print:text-[12px]">
              {writing.featured.excerpt}
            </p>
            <p className="mt-4">
              <a
                className="text-accent border-accent touch-target inline-block border-b pb-0.5 font-mono text-xs tracking-[0.12em] uppercase hover:opacity-70"
                href={writing.featured.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the field note →
              </a>
            </p>
          </article>
        </Section>

        {/* About */}
        <Section
          id={HUB_SECTIONS.about.id}
          data-reading-measure="true"
          className={sectionClassName}
        >
          <SectionHeading>About</SectionHeading>
          <div className="text-body space-y-3 text-base leading-relaxed text-pretty print:space-y-1 print:text-[12px] print:leading-[1.35]">
            {RESUME_DATA.summary.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Section>

        {/* Work — one hand-written proof line per role; the CV carries the
            bullets. */}
        <Section
          id={HUB_SECTIONS.work.id}
          data-reading-measure="true"
          className={sectionClassName}
        >
          <SectionHeading>Work</SectionHeading>
          <div className="space-y-7 print:space-y-1">
            {provenRoles.map((work) => (
              <div
                key={`${work.company}-${work.start}`}
                className="print-keep-together grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6"
              >
                <p className="text-faint font-mono text-xs tabular-nums sm:pt-1.5">
                  {work.start} – {work.end ?? "Present"}
                </p>
                <div>
                  <h3 className="font-display text-xl leading-snug">
                    {work.title} ·{" "}
                    {work.link ? (
                      <a
                        className="touch-target underline-offset-4 hover:underline"
                        href={work.link}
                      >
                        {work.company}
                      </a>
                    ) : (
                      work.company
                    )}
                  </h3>
                  <p className="text-body mt-1.5 text-sm leading-relaxed text-pretty print:text-[12px]">
                    {work.homepageProof}
                  </p>
                </div>
              </div>
            ))}
            <div className="print-keep-together grid gap-1 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <p className="text-faint font-mono text-xs tabular-nums sm:pt-1.5">
                {earlierRolesSpan.at(-1)} – {earlierRolesSpan.at(0)}
              </p>
              <p className="text-faint text-sm leading-relaxed text-pretty print:text-[12px]">
                {earlierRoles}
              </p>
            </div>
          </div>
          <p className="mt-3 print:hidden">
            <a
              href="/cv"
              className="text-accent border-accent touch-target inline-block border-b pb-0.5 font-mono text-xs tracking-[0.12em] uppercase hover:opacity-70"
            >
              Full CV →
            </a>
          </p>
        </Section>

        {/* Projects */}
        <Section
          id={HUB_SECTIONS.projects.id}
          data-reading-measure="true"
          className={cn(
            sectionClassName,
            "print-projects-section scroll-mb-16 lg:max-w-none",
          )}
        >
          <SectionHeading ruleClassName="print:my-1">Projects</SectionHeading>
          <div
            data-testid="projects-grid"
            className="grid grid-cols-1 gap-3 lg:-mx-3 lg:grid-cols-2 print:mx-0 print:grid-cols-2 print:gap-2"
          >
            {RESUME_DATA.projects
              .filter((project) => project.homepage !== false)
              .map((project) => (
                <ProjectCard
                  key={project.title}
                  title={project.title}
                  description={project.description}
                  tags={project.techStack}
                  link={"link" in project ? project.link?.href : undefined}
                />
              ))}
          </div>
        </Section>

        {/* Systems — the colophon stack line: the technical nouns a peer scans
            for, at the foot rather than competing with the proof above. */}
        <Section
          id={HUB_SECTIONS.systems.id}
          data-reading-measure="true"
          className={sectionClassName}
        >
          <SectionHeading>Systems</SectionHeading>
          <p className="text-body font-mono text-xs leading-relaxed">
            {systems}
          </p>
        </Section>
      </HubShell>
    </>
  );
}

function ProfileActions() {
  return (
    <div className="text-faint flex gap-x-1 font-mono text-xs print:text-[12px]">
      {RESUME_DATA.contact.email ? (
        <Button className="print:size-8" variant="outline" size="icon" asChild>
          <a href={`mailto:${RESUME_DATA.contact.email}`} aria-label="Email">
            <MailIcon className="size-4 print:size-5" />
          </a>
        </Button>
      ) : null}
      {RESUME_DATA.contact.tel ? (
        <Button className="print:size-8" variant="outline" size="icon" asChild>
          <a href={`tel:${RESUME_DATA.contact.tel}`} aria-label="Phone">
            <PhoneIcon className="size-4 print:size-5" />
          </a>
        </Button>
      ) : null}
      {RESUME_DATA.contact.social.map((social) => (
        <Button
          key={social.name}
          className="print:size-8"
          variant="outline"
          size="icon"
          asChild
        >
          <a href={social.url} aria-label={social.name}>
            {React.createElement(
              social.icon as React.ComponentType<{
                className: string;
              }>,
              { className: "h-4 w-4 print:h-5 print:w-5" },
            )}
          </a>
        </Button>
      ))}
    </div>
  );
}

function SectionHeading({
  children,
  ruleClassName,
}: {
  children: React.ReactNode;
  ruleClassName?: string;
}) {
  return (
    <>
      <h2 className="text-accent font-mono text-[15px] font-semibold tracking-[0.18em] uppercase">
        {children}
      </h2>
      <div className={cn("bg-accent/30 h-px w-12", ruleClassName)} />
    </>
  );
}
