import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export const metadata: Metadata = {
  title: `${RESUME_DATA.name} | ${RESUME_DATA.about}`,
  description: RESUME_DATA.summary,
};

export default function Page() {
  return (
    <>
      <StructuredData />
      <main className="container relative mx-auto scroll-my-12 overflow-auto p-4 print:p-12 md:p-16">
        <ThemeToggle />
        <BackToTop />
      <section className="mx-auto w-full max-w-2xl space-y-8 bg-white dark:bg-transparent print:space-y-4">
        <div className="flex items-center justify-between animate-fade-in-up">
          <div className="flex-1 space-y-1.5">
            <h1 className="text-2xl font-bold">{RESUME_DATA.name}</h1>
            <p className="max-w-md text-pretty font-mono text-sm text-muted-foreground print:text-[12px]">
              {RESUME_DATA.about}
            </p>
            <p className="max-w-md items-center text-pretty font-mono text-xs text-muted-foreground">
              <a
                className="inline-flex gap-x-1.5 align-baseline leading-none hover:underline"
                href={RESUME_DATA.locationLink}
                target="_blank"
              >
                <GlobeIcon className="size-3" />
                {RESUME_DATA.location}
              </a>
            </p>
            <div className="flex gap-x-1 pt-1 font-mono text-sm text-muted-foreground print:text-[10px]">
              {RESUME_DATA.contact.email ? (
                <Button
                  className="size-8 print:size-8"
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={`mailto:${RESUME_DATA.contact.email}`}>
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
                  <a href={`tel:${RESUME_DATA.contact.tel}`}>
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
                  <a href={social.url}>
                    {React.createElement(
                      social.icon as React.ComponentType<{ className: string }>,
                      { className: "h-4 w-4 print:h-5 print:w-5" },
                    )}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <div className="relative size-28 border-4 border-brand-blue/20 rounded-full transition-smooth hover:border-brand-blue hover:scale-105 overflow-hidden">
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
        <Section className="animate-fade-in-up animation-delay-100">
          <h2 className="text-xl font-bold bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">About</h2>
          <p className="text-pretty font-mono text-sm text-muted-foreground print:text-[12px]">
            {RESUME_DATA.summary}
          </p>
        </Section>
        <Section className="animate-fade-in-up animation-delay-200">
          <h2 className="text-xl font-bold bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">Work Experience</h2>
          {RESUME_DATA.work.map((work, index) => {
            return (
              <Card key={work.company} className="card-hover border-l-4 border-l-transparent hover:border-l-brand-blue pl-6 pr-6"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-x-2 text-base">
                    <h3 className="inline-flex items-center justify-center gap-x-1 font-semibold leading-none">
                      <a className="hover:underline" href={work.link}>
                        {work.company}
                      </a>

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
                    <div className="text-sm tabular-nums text-gray-500">
                      {work.start} - {work.end ?? "Present"}
                    </div>
                  </div>

                  <h4 className="font-mono text-sm leading-none print:text-[12px]">
                    {work.title}
                  </h4>
                </CardHeader>
                <CardContent className="mt-2 text-xs print:text-[10px]">
                  {typeof work.description === "string" ? (
                    <p>{work.description}</p>
                  ) : (
                    work.description?.map((desc) => {
                      return (
                        <p key={desc} className="mb-1">
                          <span className="mr-2">
                            {work?.customBullet || "•"}
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
        <Section className="animate-fade-in-up animation-delay-300">
          <h2 className="text-xl font-bold bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">Education</h2>
          {RESUME_DATA.education.map((education) => {
            return (
              <Card key={education.school} className="card-hover px-6">
                <CardHeader>
                  <div className="flex items-center justify-between gap-x-2 text-base">
                    <h3 className="font-semibold leading-none">
                      {education.school}
                    </h3>
                    <div className="text-sm tabular-nums text-gray-500">
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
        <Section className="animate-fade-in-up animation-delay-400">
          <h2 className="text-xl font-bold bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">Skills</h2>
          <div className="flex flex-wrap gap-1">
            {RESUME_DATA.skills.map((skill) => {
              return (
                <Badge className="print:text-[10px] transition-smooth hover:scale-110 hover:bg-brand-blue hover:text-white cursor-default" key={skill}>
                  {skill}
                </Badge>
              );
            })}
          </div>
        </Section>

        <Section className="print-force-new-page scroll-mb-16 animate-fade-in-up animation-delay-400">
          <h2 className="text-xl font-bold bg-gradient-to-r from-brand-blue to-brand-blue-dark bg-clip-text text-transparent">Projects</h2>
          <div className="-mx-3 grid grid-cols-1 gap-3 print:grid-cols-3 print:gap-2 md:grid-cols-2 lg:grid-cols-3">
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
