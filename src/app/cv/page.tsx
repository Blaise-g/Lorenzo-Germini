/*
THESIS: A complete technical CV should read as a trusted document, not a second
portfolio homepage.
OWN-WORLD: Warm paper, near-black ink, terracotta rules, serif identity, sans
prose, and mono metadata inherit the signed Warm Print system at tighter density.
STORY: Verify Lorenzo's scope, inspect role-level proof, then download or print.
FIRST VIEWPORT: Identity and freshness lead; document actions and full contact
sit immediately beneath, followed by a concise profile and chronological proof.
FORM: The signed single-column CV contract; compact blocks preserve ATS order
and collapse unchanged into A4 or Letter output.
*/

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { FloatingActionCluster } from "@/components/floating-action-cluster";
import { PrintCvButton } from "@/components/print-cv-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { RESUME_DATA } from "@/data/resume-data";
import { BUILD_DATE_ISO, BUILD_MONTH_YEAR } from "@/lib/build-metadata";
import { buildPersonStructuredData } from "@/lib/person-structured-data";

const cvUrl = new URL("/cv", RESUME_DATA.personalWebsiteUrl).href;
const cvDescription = `Curriculum vitae for ${RESUME_DATA.name}, covering work in AI product engineering, education, technical skills, and selected systems.`;

export const metadata: Metadata = {
  title: { absolute: "Lorenzo-Germini-CV" },
  description: cvDescription,
  alternates: { canonical: cvUrl },
  openGraph: {
    type: "profile",
    url: cvUrl,
    title: `${RESUME_DATA.name} — CV`,
    description: cvDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${RESUME_DATA.name} — CV`,
    description: cvDescription,
  },
};

const commandLinks = RESUME_DATA.contact.social.map((social) => ({
  title: social.name,
  url: social.url,
}));

export default function CvPage() {
  return (
    <div className="cv-route min-h-screen">
      <CvStructuredData />
      <ThemeToggle />

      <article
        data-cv-document
        className="mx-auto max-w-4xl px-6 pt-20 pr-20 pb-24 sm:px-10 sm:pr-20 lg:px-12 lg:pt-12 print:max-w-none print:p-0"
      >
        <header className="cv-header border-b-ink border-b-2 pb-6 print:pb-2">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
            <div>
              <p className="text-accent font-mono text-xs font-semibold tracking-[0.16em] uppercase">
                Curriculum vitae
              </p>
              <h1 className="font-display mt-2 text-4xl leading-none font-semibold tracking-tight sm:text-5xl print:mt-1 print:text-[28px]">
                {RESUME_DATA.name}
              </h1>
              <p className="text-body mt-2 max-w-2xl text-base leading-relaxed print:mt-1 print:text-[12px]">
                {RESUME_DATA.about}
              </p>
            </div>
            <p className="text-faint font-mono text-xs tabular-nums">
              Updated {BUILD_MONTH_YEAR}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 font-mono text-xs print:hidden">
            <Button
              asChild
              size="lg"
              className="touch-target rounded-none font-mono text-xs font-semibold"
            >
              <a
                href="/lorenzo-germini-cv.pdf"
                download="lorenzo-germini-cv.pdf"
              >
                Download CV (PDF)
              </a>
            </Button>
            <PrintCvButton />
            <Link
              href="/"
              className="text-accent touch-target decoration-border px-2 py-2 underline underline-offset-4"
            >
              Back home
            </Link>
          </div>

          <p className="text-faint mt-3 font-mono text-xs">
            For clean output, uncheck browser headers and footers.
          </p>

          <address className="text-faint mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs not-italic print:mt-2 print:text-[9pt]">
            <a
              className="touch-target"
              href={`mailto:${RESUME_DATA.contact.email}`}
            >
              {RESUME_DATA.contact.email}
            </a>
            <a className="touch-target" href={`tel:${RESUME_DATA.contact.tel}`}>
              {RESUME_DATA.contact.tel}
            </a>
            <span>{RESUME_DATA.location}</span>
            <a className="touch-target" href={RESUME_DATA.personalWebsiteUrl}>
              {RESUME_DATA.personalWebsiteUrl.replace(/^https?:\/\//, "")}
            </a>
            {RESUME_DATA.contact.social.map((social) => (
              <a key={social.name} className="touch-target" href={social.url}>
                {social.name}
              </a>
            ))}
          </address>
        </header>

        <div className="mt-7 space-y-8 print:mt-3 print:space-y-3">
          <CvSection id="cv-profile" title="Profile">
            <div className="text-body max-w-[74ch] space-y-3 text-sm leading-relaxed print:max-w-none print:space-y-1 print:text-[9pt] print:leading-[1.3]">
              {RESUME_DATA.summary.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </CvSection>

          <CvSection id="cv-experience" title="Experience">
            <div className="space-y-5 print:space-y-2">
              {RESUME_DATA.work.map((work) => (
                <article
                  key={`${work.company}-${work.start}`}
                  className="cv-entry print-keep-together"
                >
                  <div className="cv-entry-heading flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="font-display text-lg leading-tight font-semibold print:text-[11pt]">
                      {work.title}
                    </h3>
                    {work.link ? (
                      <a
                        className="text-accent touch-target font-mono text-xs font-semibold print:text-[9pt]"
                        href={work.link}
                      >
                        {work.company}
                      </a>
                    ) : (
                      <span className="text-accent font-mono text-xs font-semibold print:text-[9pt]">
                        {work.company}
                      </span>
                    )}
                    <span className="text-faint font-mono text-xs tabular-nums print:text-[9pt]">
                      {work.start} - {work.end}
                    </span>
                    <span className="text-faint font-mono text-xs print:text-[9pt]">
                      {work.badges.join(" · ")}
                    </span>
                  </div>
                  <ul className="text-body mt-2 space-y-1 text-sm leading-relaxed print:mt-1 print:space-y-0 print:text-[9pt] print:leading-[1.25]">
                    {(typeof work.description === "string"
                      ? [work.description]
                      : work.description
                    ).map((description) => (
                      <li
                        key={description}
                        className="relative pl-4 before:absolute before:left-0 before:content-['•']"
                      >
                        {description}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </CvSection>

          <CvSection id="cv-selected-systems" title="Selected systems">
            <div className="space-y-4 print:space-y-2">
              {RESUME_DATA.projects.map((project) => (
                <article
                  key={project.title}
                  className="cv-entry print-keep-together"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-lg leading-tight font-semibold print:text-[11pt]">
                      {project.link ? (
                        <a className="touch-target" href={project.link.href}>
                          {project.title}
                        </a>
                      ) : (
                        project.title
                      )}
                    </h3>
                    <p className="text-faint font-mono text-xs print:text-[9pt]">
                      {project.techStack.join(" · ")}
                    </p>
                  </div>
                  <p className="text-body mt-1 text-sm leading-relaxed print:text-[9pt] print:leading-[1.25]">
                    {project.description}
                  </p>
                </article>
              ))}
            </div>
          </CvSection>

          <CvSection id="cv-education" title="Education">
            <div className="space-y-4 print:space-y-2">
              {RESUME_DATA.education.map((education) => (
                <article
                  key={education.school}
                  className="cv-entry print-keep-together"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="font-display text-base font-semibold print:text-[10pt]">
                      {education.degree}
                    </h3>
                    <span className="text-accent font-mono text-xs font-semibold print:text-[9pt]">
                      {education.school}
                    </span>
                    <span className="text-faint font-mono text-xs tabular-nums print:text-[9pt]">
                      {education.start} - {education.end}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </CvSection>

          <CvSection id="cv-skills" title="Skills">
            <div className="text-body space-y-1 font-mono text-xs leading-relaxed print:text-[9pt]">
              {RESUME_DATA.skillGroups.map((group) => (
                <p key={group.name}>
                  <span className="text-ink font-semibold">{group.name}:</span>{" "}
                  {group.skills.join(" · ")}
                </p>
              ))}
            </div>
          </CvSection>
        </div>
      </article>

      <FloatingActionCluster commandLinks={commandLinks} />
    </div>
  );
}

function CvSection({
  children,
  id,
  title,
}: {
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex items-center gap-4 print:mb-1">
        <h2
          id={id}
          className="text-accent shrink-0 font-mono text-[15px] font-semibold tracking-[0.18em] uppercase print:text-[9pt]"
        >
          {title}
        </h2>
        <div className="bg-border h-px flex-1" />
      </div>
      {children}
    </section>
  );
}

function CvStructuredData() {
  const structuredData = {
    ...buildPersonStructuredData(cvUrl),
    dateModified: BUILD_DATE_ISO,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
