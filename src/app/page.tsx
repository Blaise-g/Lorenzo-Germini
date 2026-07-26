import React from "react";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommandMenu } from "@/components/command-menu";
import { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { GlobeIcon, MailIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESUME_DATA } from "@/data/resume-data";
import { ProjectCard } from "@/components/project-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackToTop } from "@/components/back-to-top";
import { StructuredData } from "@/components/structured-data";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import { VariantA } from "@/components/prototype/variant-a";
import { VariantB } from "@/components/prototype/variant-b";
import { VariantC } from "@/components/prototype/variant-c";
import { VariantD } from "@/components/prototype/variant-d";

export const metadata: Metadata = {
  title: `${RESUME_DATA.name} | ${RESUME_DATA.about}`,
  description: RESUME_DATA.summary,
};

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
  return (
    <>
      <StructuredData />
      <div className="relative container mx-auto overflow-auto p-4 pt-20 pr-16 pb-20 md:p-16 print:p-0">
        <ThemeToggle />
        <BackToTop />
        <section className="mx-auto w-full max-w-3xl space-y-12 print:space-y-2">
          {/* Header */}
          <div className="animate-fade-in-up flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {RESUME_DATA.name}
              </h1>
              <p className="text-muted-foreground max-w-md text-sm leading-relaxed text-pretty print:text-[12px]">
                {RESUME_DATA.about}
              </p>
              <p className="text-muted-foreground max-w-md items-center text-sm text-pretty">
                <a
                  className="touch-target gap-x-1.5 align-baseline leading-none hover:underline"
                  href={RESUME_DATA.locationLink}
                  target="_blank"
                >
                  <GlobeIcon className="size-3" />
                  {RESUME_DATA.location}
                </a>
              </p>
              <div className="text-muted-foreground flex gap-x-1 pt-1 text-sm print:text-[12px]">
                {RESUME_DATA.contact.email ? (
                  <Button
                    className="print:size-8"
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a
                      href={`mailto:${RESUME_DATA.contact.email}`}
                      aria-label="Email"
                    >
                      <MailIcon className="size-4 print:size-5" />
                    </a>
                  </Button>
                ) : null}
                {RESUME_DATA.contact.tel ? (
                  <Button
                    className="print:size-8"
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a
                      href={`tel:${RESUME_DATA.contact.tel}`}
                      aria-label="Phone"
                    >
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
            </div>

            <div className="border-primary/20 transition-refined hover:border-primary hover:shadow-primary/25 relative size-28 overflow-hidden rounded-full border-2 hover:scale-105 hover:shadow-[0_0_20px_-4px]">
              <Image
                src={RESUME_DATA.avatarUrl}
                alt={RESUME_DATA.name}
                width={112}
                height={112}
                priority
                className="object-cover"
              />
            </div>
          </div>

          {/* About */}
          <Section className="animate-fade-in-up print:gap-y-1">
            <h2 className="text-primary text-xl font-bold tracking-tight">
              About
            </h2>
            <div className="bg-primary/30 h-px w-12" />
            <div className="text-muted-foreground space-y-3 text-base leading-relaxed text-pretty print:space-y-1 print:text-[12px] print:leading-[1.35]">
              {RESUME_DATA.summary.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </Section>

          {/* Work Experience */}
          <Section className="animate-fade-in-up print:gap-y-1">
            <h2 className="text-primary text-xl font-bold tracking-tight">
              Work Experience
            </h2>
            <div className="bg-primary/30 h-px w-12" />
            {RESUME_DATA.work.map((work) => {
              return (
                <Card
                  key={`${work.company}-${work.start}`}
                  className="card-hover print-keep-together border-l-border hover:border-l-primary border-l px-6 py-4 hover:border-l-[3px] print:px-0 print:py-1"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-x-2 text-base">
                      <h3 className="inline-flex items-center justify-center gap-x-1 leading-none font-semibold">
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
                      <div className="text-muted-foreground text-sm tabular-nums">
                        {work.start} - {work.end ?? "Present"}
                      </div>
                    </div>
                    <h4 className="text-muted-foreground text-sm leading-none print:text-[12px]">
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
          <Section className="animate-fade-in-up print:gap-y-1">
            <h2 className="text-primary text-xl font-bold tracking-tight">
              Education
            </h2>
            <div className="bg-primary/30 h-px w-12" />
            {RESUME_DATA.education.map((education) => {
              return (
                <Card
                  key={education.school}
                  className="card-hover border-l-border hover:border-l-primary border-l px-6 py-4 hover:border-l-[3px] print:px-0 print:py-1"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-x-2 text-base">
                      <h3 className="leading-none font-semibold">
                        {education.school}
                      </h3>
                      <div className="text-muted-foreground text-sm tabular-nums">
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
          <Section className="animate-fade-in-up print:gap-y-1">
            <h2 className="text-primary text-xl font-bold tracking-tight">
              Skills
            </h2>
            <div className="bg-primary/30 h-px w-12" />
            <div className="flex flex-wrap gap-1.5">
              {RESUME_DATA.skills.map((skill) => {
                return (
                  <Badge
                    className="bg-primary cursor-default print:text-[12px]"
                    key={skill}
                  >
                    {skill}
                  </Badge>
                );
              })}
            </div>
          </Section>

          {/* Projects */}
          <Section className="print-projects-section animate-fade-in-up scroll-mb-16 print:gap-y-1">
            <h2 className="text-primary text-xl font-bold tracking-tight">
              Projects
            </h2>
            <div className="bg-primary/30 h-px w-12 print:my-1" />
            <div className="-mx-3 grid grid-cols-1 gap-3 md:grid-cols-2 print:mx-0 print:grid-cols-2 print:gap-2">
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
        </section>

        <CommandMenu
          links={[
            {
              url: RESUME_DATA.personalWebsiteUrl,
              title: "Personal Website",
            },
            ...RESUME_DATA.contact.social.map((socialMediaLink) => ({
              url: socialMediaLink.url,
              title: socialMediaLink.name,
            })),
          ]}
        />
      </div>
    </>
  );
}
