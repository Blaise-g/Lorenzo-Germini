import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { GlobeIcon, MailIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESUME_DATA } from "@/data/resume-data";
import { ProjectCard } from "@/components/project-card";
import { StructuredData } from "@/components/structured-data";
import { cn } from "@/lib/utils";
import { HubShell } from "@/components/hub-shell";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import { VariantA } from "@/components/prototype/variant-a";
import { VariantB } from "@/components/prototype/variant-b";
import { VariantC } from "@/components/prototype/variant-c";
import { VariantD } from "@/components/prototype/variant-d";

export const metadata: Metadata = {
  title: `${RESUME_DATA.name} | ${RESUME_DATA.about}`,
  description: RESUME_DATA.summary,
};

const HUB_SECTIONS = {
  about: { id: "about", label: "About" },
  education: { id: "education", label: "Education" },
  projects: { id: "projects", label: "Projects" },
  skills: { id: "skills", label: "Skills" },
  work: { id: "work", label: "Work" },
} as const;

const HUB_DESTINATIONS = [
  HUB_SECTIONS.about,
  HUB_SECTIONS.work,
  HUB_SECTIONS.education,
  HUB_SECTIONS.skills,
  HUB_SECTIONS.projects,
] as const;

// PROTOTYPE (issue #7): dev-only homepage direction variants, switchable via
// ?variant=a|b|c. Never reads searchParams in production, so the page stays
// static there. Delete this block + src/components/prototype/ only when the
// Phase 2 §2.6 homepage swap merges.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  if (process.env.NODE_ENV !== "production") {
    const { variant } = await searchParams;
    // Issue #8: b1/b2/b3 are visual treatments of the chosen Variant B.
    // Issue #12: composition is the variable — d = single measure, b1a = amended rail.
    const compositions = { d: "single", b1a: "rail" } as const;
    if (variant && variant in compositions) {
      return (
        <>
          <VariantD
            composition={compositions[variant as keyof typeof compositions]}
          />
          <PrototypeSwitcher />
        </>
      );
    }
    const treatments = {
      b: "warm",
      b1: "warm",
      b2: "slate",
      b3: "broadsheet",
    } as const;
    if (variant && variant in treatments) {
      return (
        <>
          <VariantB
            treatment={treatments[variant as keyof typeof treatments]}
          />
          <PrototypeSwitcher />
        </>
      );
    }
    if (variant === "a" || variant === "c") {
      const Variant = { a: VariantA, c: VariantC }[variant];
      return (
        <>
          <Variant />
          <PrototypeSwitcher />
        </>
      );
    }
    return (
      <>
        <CurrentHome />
        <PrototypeSwitcher />
      </>
    );
  }
  return <CurrentHome />;
}

function CurrentHome() {
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
          location: RESUME_DATA.location,
          name: RESUME_DATA.name,
          role: RESUME_DATA.about,
          summary: RESUME_DATA.summary.split("\n\n")[0],
        }}
      >
        {/* About */}
        <Section
          id={HUB_SECTIONS.about.id}
          data-reading-measure="true"
          className="animate-fade-in-up max-w-[42rem] scroll-mt-24 print:gap-y-1"
        >
          <SectionHeading>About</SectionHeading>
          <div className="text-body space-y-3 text-base leading-relaxed text-pretty print:space-y-1 print:text-[12px] print:leading-[1.35]">
            {RESUME_DATA.summary.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </Section>

        {/* Work Experience */}
        <Section
          id={HUB_SECTIONS.work.id}
          data-reading-measure="true"
          className="animate-fade-in-up max-w-[42rem] scroll-mt-24 print:gap-y-1"
        >
          <SectionHeading>Work Experience</SectionHeading>
          {RESUME_DATA.work.map((work) => {
            return (
              <Card
                key={`${work.company}-${work.start}`}
                className="card-hover print-keep-together border-l-border hover:border-l-accent border-l px-6 py-4 print:px-0 print:py-1"
              >
                <CardHeader>
                  <div className="flex flex-col items-start gap-2 text-base sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-display flex flex-wrap items-center gap-x-1 gap-y-1 leading-none font-semibold">
                      {work.link ? (
                        <a
                          className="touch-target hover:underline"
                          href={work.link}
                        >
                          {work.company}
                        </a>
                      ) : (
                        <span>{work.company}</span>
                      )}
                      <span className="inline-flex gap-x-1">
                        {work.badges.map((badge) => (
                          <Badge
                            variant="secondary"
                            className="align-middle text-xs print:px-1 print:py-0.5 print:text-[12px] print:leading-tight"
                            key={badge}
                          >
                            {badge}
                          </Badge>
                        ))}
                      </span>
                    </h3>
                    <div className="text-faint shrink-0 font-mono text-xs tabular-nums">
                      {work.start} - {work.end ?? "Present"}
                    </div>
                  </div>
                  <h4 className="text-faint font-mono text-xs leading-none print:text-[12px]">
                    {work.title}
                  </h4>
                </CardHeader>
                <CardContent className="mt-2 text-sm print:mt-1 print:text-[12px] print:leading-[1.25]">
                  {typeof work.description === "string" ? (
                    <p>{work.description}</p>
                  ) : (
                    work.description?.map((desc) => {
                      return (
                        <p key={desc} className="mb-1">
                          <span className="mr-2">
                            {work?.customBullet || "\u2022"}
                          </span>
                          {desc}
                        </p>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Section>

        {/* Education */}
        <Section
          id={HUB_SECTIONS.education.id}
          data-reading-measure="true"
          className="animate-fade-in-up max-w-[42rem] scroll-mt-24 print:gap-y-1"
        >
          <SectionHeading>Education</SectionHeading>
          {RESUME_DATA.education.map((education) => {
            return (
              <Card
                key={education.school}
                className="card-hover border-l-border hover:border-l-accent border-l px-6 py-4 print:px-0 print:py-1"
              >
                <CardHeader>
                  <div className="flex flex-col items-start gap-2 text-base sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-display leading-none font-semibold">
                      {education.school}
                    </h3>
                    <div className="text-faint shrink-0 font-mono text-xs tabular-nums">
                      {education.start} - {education.end}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-2 print:text-[12px]">
                  {education.degree}
                </CardContent>
              </Card>
            );
          })}
        </Section>

        {/* Skills */}
        <Section
          id={HUB_SECTIONS.skills.id}
          data-reading-measure="true"
          className="animate-fade-in-up max-w-[42rem] scroll-mt-24 print:gap-y-1"
        >
          <SectionHeading>Skills</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {RESUME_DATA.skills.map((skill) => {
              return (
                <Badge
                  className="border-border bg-ground text-faint cursor-default font-mono print:text-[12px]"
                  key={skill}
                >
                  {skill}
                </Badge>
              );
            })}
          </div>
        </Section>

        {/* Projects */}
        <Section
          id={HUB_SECTIONS.projects.id}
          data-reading-measure="true"
          className="print-projects-section animate-fade-in-up max-w-[42rem] scroll-mt-24 scroll-mb-16 lg:max-w-none print:gap-y-1"
        >
          <SectionHeading ruleClassName="print:my-1">Projects</SectionHeading>
          <div
            data-testid="projects-grid"
            className="grid grid-cols-1 gap-3 lg:-mx-3 lg:grid-cols-2 print:mx-0 print:grid-cols-2 print:gap-2"
          >
            {RESUME_DATA.projects.map((project) => {
              return (
                <ProjectCard
                  key={project.title}
                  title={project.title}
                  description={project.description}
                  tags={project.techStack}
                  link={"link" in project ? project.link?.href : undefined}
                />
              );
            })}
          </div>
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
      <Button className="print:size-8" variant="outline" size="icon" asChild>
        <a
          href={RESUME_DATA.locationLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Location: ${RESUME_DATA.location}`}
        >
          <GlobeIcon className="size-4 print:size-5" />
        </a>
      </Button>
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
