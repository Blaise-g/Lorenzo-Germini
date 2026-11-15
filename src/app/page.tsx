/*
THESIS: The homepage is the path of Lorenzo's life — seven steps in time order a
visitor can pick from — with his professional proof as the first thing read.
OWN-WORLD: Warm Print at one reading measure: serif places, mono dates,
terracotta for the home squares, links and section labels.
STORY: Read what he does, pick a step, read what happened there.
FIRST VIEWPORT: The name, the role and a subhead that names Complaion and the
systems behind it — the fold is where the technical claim is made.
FORM: Masthead rule, intro, the drawn path, a section per step and side
project, then the writing, and how the 3D path was made.
*/

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BackToTop } from "@/components/back-to-top";
import { DrawnPath } from "@/components/flat-site/drawn-path";
import {
  FlatSiteIntro,
  FlatSiteMasthead,
} from "@/components/flat-site/flat-site-header";
import { FLAT_SITE_INSET } from "@/components/flat-site/inset";
import { MakingOf } from "@/components/flat-site/making-of";
import {
  SidePropSection,
  StepSection,
} from "@/components/flat-site/step-section";
import { RouteFrame } from "@/components/route-frame";
import { StructuredData } from "@/components/structured-data";
import { MAKING_OF } from "@/data/making-of";
import { PATH_SIDE_PROPS, PATH_STEPS } from "@/data/path";
import { RESUME_DATA } from "@/data/resume-data";
import { markdownAlternate } from "@/lib/markdown-negotiation";
import { formatEssayDate } from "@/lib/substack-feed";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: RESUME_DATA.metaTitle,
  description: RESUME_DATA.metaDescription,
  /* The retired hosts 308 here rather than disappearing, so `/` needs the same
     self-canonical `/cv` and `/writing` already carry — otherwise the redirect
     source stays indexable as a duplicate of this page. */
  alternates: {
    canonical: RESUME_DATA.personalWebsiteUrl,
    ...markdownAlternate("/"),
  },
};

const { writing } = RESUME_DATA.homepage;

/* Server-rendered whole: every step's text is in the HTML, and nothing on this
   route imports 3D code or plays sound (GH-141, implementation decision 5). */
export default function Page() {
  return (
    <>
      <StructuredData />
      <RouteFrame measure={FLAT_SITE_INSET}>
        <FlatSiteMasthead />
        <div
          data-testid="body-inset"
          className={cn(FLAT_SITE_INSET, "animate-fade-in-up pb-24 print:py-0")}
        >
          <FlatSiteIntro />

          <div className="mt-14 space-y-16 lg:mt-20 print:mt-4 print:space-y-3">
            <FlatSiteSection id="path" heading="The path">
              <DrawnPath steps={PATH_STEPS} sideProps={PATH_SIDE_PROPS} />
              <div className="mt-12 space-y-14 print:mt-2 print:space-y-2">
                {PATH_STEPS.map((step) => (
                  <StepSection key={step.slug} step={step} />
                ))}
              </div>
            </FlatSiteSection>

            <FlatSiteSection id="beside-the-path" heading="Beside the path">
              <div className="space-y-10 print:space-y-2">
                {PATH_SIDE_PROPS.map((prop) => (
                  <SidePropSection key={prop.slug} prop={prop} />
                ))}
              </div>
            </FlatSiteSection>

            <FlatSiteSection id="writing" heading="Writing">
              <WritingTeaser />
            </FlatSiteSection>

            <FlatSiteSection
              id="how-this-was-made"
              heading={MAKING_OF.heading}
              className="print:hidden"
            >
              <MakingOf />
            </FlatSiteSection>
          </div>
        </div>
        <BackToTop />
      </RouteFrame>
    </>
  );
}

function FlatSiteSection({
  children,
  className,
  heading,
  id,
}: {
  children: ReactNode;
  className?: string;
  heading: string;
  id: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      data-flat-site-section={id}
      className={cn("scroll-mt-8", className)}
    >
      <h2
        id={`${id}-heading`}
        className="text-accent font-label text-[15px] font-semibold tracking-[0.18em] uppercase"
      >
        {heading}
      </h2>
      <div className="bg-accent/30 mt-3 mb-8 h-px w-12 print:mb-2" />
      {children}
    </section>
  );
}

/* Text only: no numbering, no covers, no subscribe module. The lead link keeps
   pointing at the publication — retargeting it at `/writing` would promise an
   article and deliver an index — and `All writing →` is the quieter of the
   two. */
function WritingTeaser() {
  return (
    <div className="max-w-[42rem]">
      <p className="text-body text-base leading-relaxed text-pretty print:text-[12px]">
        {writing.standingLine}
      </p>
      <article className="group mt-4 print:mt-1">
        {writing.featured.date && writing.featured.readingMinutes ? (
          <p className="text-faint font-label text-xs tracking-[0.12em] uppercase">
            {formatEssayDate(writing.featured.date)} ·{" "}
            {writing.featured.readingMinutes} min read
          </p>
        ) : null}
        <h3 className="font-display mt-2 text-2xl leading-snug sm:text-3xl print:mt-0 print:text-base">
          <a
            className="touch-target underline-offset-4 group-hover:underline"
            href={writing.featured.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {writing.featured.title}
          </a>
        </h3>
        <p className="text-body mt-3 text-base leading-relaxed text-pretty print:mt-0 print:text-[12px]">
          {writing.featured.excerpt}
        </p>
        {/* Column below `sm`, row from `sm`. `items-start` keeps the accent
            rule to the link's own width in column, and `gap-y-5` keeps the two
            44px hit areas apart. */}
        <p className="mt-4 flex flex-col items-start gap-y-5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6 print:mt-1">
          <a
            className="text-accent border-accent touch-target font-label border-b pb-0.5 text-xs tracking-[0.12em] uppercase hover:opacity-70"
            href={writing.featured.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the field note →
          </a>
          <a
            className="text-faint hover:text-accent decoration-border hover:decoration-accent touch-target font-label text-xs tracking-[0.12em] uppercase underline underline-offset-4 print:hidden"
            href="/writing"
          >
            All writing →
          </a>
        </p>
      </article>
    </div>
  );
}
