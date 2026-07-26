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
    const treatments = { b: "warm", b1: "warm", b2: "slate", b3: "broadsheet" } as const;
    if (variant && variant in treatments) {
      return (
        <>
          <VariantB treatment={treatments[variant as keyof typeof treatments]} />
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>
      <main id="main-content" className="container relative mx-auto scroll-my-12 overflow-auto p-4 print:p-12 md:p-16">
        <ThemeToggle />
        <BackToTop />
        <section className="mx-auto w-full max-w-3xl space-y-12 print:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between animate-fade-in-up">
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {RESUME_DATA.name}
              </h1>
              <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground print:text-[12px]">
                {RESUME_DATA.about}
              </p>
              <p className="max-w-md items-center text-pretty text-sm text-muted-foreground">
                <a
                  className="inline-flex gap-x-1.5 align-baseline leading-none hover:underline"
                  href={RESUME_DATA.locationLink}
                  target="_blank"
                >
                  <GlobeIcon className="size-3" />
                  {RESUME_DATA.location}
                </a>
              </p>
              <div className="flex gap-x-1 pt-1 text-sm text-muted-foreground print:text-[10px]">
                {RESUME_DATA.contact.email ? (
                  <Button
                    className="size-8 print:size-8"
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={`mailto:${RESUME_DATA.contact.email}`} aria-label="Email">
                      <MailIcon className="size-4 print:size-5" />
                    </a>
                  </Button>
                ) : null}
                {RESUME_DATA.contact.tel ? (
                  <Button
                    className="size-8 print:size-8"
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={`tel:${RESUME_DATA.contact.tel}`} aria-label="Phone">
                      <PhoneIcon className="size-4 print:size-5" />
                    </a>
                  </Button>
                ) : null}
                {RESUME_DATA.contact.social.map((social) => (
                  <Button
                    key={social.name}
                    className="size-8 print:size-8"
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a href={social.url} aria-label={social.name}>
                      {React.createElement(
                        social.icon as React.ComponentType<{ className: string }>,
                        { className: "h-4 w-4 print:h-5 print:w-5" },
                      )}
                    </a>
                  </Button>
                ))}
              </div>
            </div>

            <div className="relative size-28 rounded-full border-2 border-primary/20 overflow-hidden transition-refined hover:border-primary hover:scale-105 hover:shadow-[0_0_20px_-4px] hover:shadow-primary/25">
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
          <Section className="animate-fade-in-up delay-100">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              About
            </h2>
            <div className="h-px w-12 bg-primary/30" />
            <div className="space-y-3 text-pretty text-base leading-relaxed text-muted-foreground print:text-[12px]">
              {RESUME_DATA.summary.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </Section>

          {/* Work Experience */}
          <Section className="animate-fade-in-up delay-200">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              Work Experience
            </h2>
            <div className="h-px w-12 bg-primary/30" />
            {RESUME_DATA.work.map((work) => {
              return (
                <Card
                  key={`${work.company}-${work.start}`}
                  className="card-hover border-l border-l-border hover:border-l-[3px] hover:border-l-primary px-6 py-4 print:px-0"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-x-2 text-base">
                      <h3 className="inline-flex items-center justify-center gap-x-1 font-semibold leading-none">
                        {work.link ? (
                          <a className="hover:underline" href={work.link}>
                            {work.company}
                          </a>
                        ) : (
                          <span>{work.company}</span>
                        )}
                        <span className="inline-flex gap-x-1">
                          {work.badges.map((badge) => (
                            <Badge
                              variant="secondary"
                              className="align-middle text-xs print:text-[8px] print:leading-tight print:px-1 print:py-0.5"
                              key={badge}
                            >
                              {badge}
                            </Badge>
                          ))}
                        </span>
                      </h3>
                      <div className="text-sm tabular-nums text-muted-foreground">
                        {work.start} - {work.end ?? "Present"}
                      </div>
                    </div>
                    <h4 className="text-sm leading-none text-muted-foreground print:text-[12px]">
                      {work.title}
                    </h4>
                  </CardHeader>
                  <CardContent className="mt-2 text-sm print:text-[10px]">
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
          <Section className="animate-fade-in-up delay-300">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              Education
            </h2>
            <div className="h-px w-12 bg-primary/30" />
            {RESUME_DATA.education.map((education) => {
              return (
                <Card
                  key={education.school}
                  className="card-hover border-l border-l-border hover:border-l-[3px] hover:border-l-primary px-6 py-4 print:px-0"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-x-2 text-base">
                      <h3 className="font-semibold leading-none">
                        {education.school}
                      </h3>
                      <div className="text-sm tabular-nums text-muted-foreground">
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
          <Section className="animate-fade-in-up delay-400">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              Skills
            </h2>
            <div className="h-px w-12 bg-primary/30" />
            <div className="flex flex-wrap gap-1.5">
              {RESUME_DATA.skills.map((skill) => {
                return (
                  <Badge
                    className="print:text-[10px] transition-refined hover:scale-105 hover:bg-primary hover:text-primary-foreground cursor-default"
                    key={skill}
                  >
                    {skill}
                  </Badge>
                );
              })}
            </div>
          </Section>

          {/* Projects */}
          <Section className="print-force-new-page scroll-mb-16 animate-fade-in-up delay-500">
            <h2 className="text-xl font-bold tracking-tight text-primary">
              Projects
            </h2>
            <div className="h-px w-12 bg-primary/30" />
            <div className="-mx-3 grid grid-cols-1 gap-3 print:grid-cols-3 print:gap-2 md:grid-cols-2">
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
      </main>
    </>
  );
}
