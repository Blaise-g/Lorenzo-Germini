import Image from "next/image";
import Link from "next/link";

import { FLAT_SITE_INSET } from "@/components/flat-site/inset";
import {
  FLAT_SITE_LINK_CLASS_NAME,
  FLAT_SITE_LINK_ROW_CLASS_NAME,
} from "@/components/flat-site/step-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { RESUME_DATA } from "@/data/resume-data";
import { cn } from "@/lib/utils";

const routeLinkClassName =
  "touch-target hover:text-accent underline-offset-4 hover:underline";

/** The masthead row: the name, which is the page's `<h1>`, the role beside it
 *  from `lg`, the route links and the theme toggle. Its own full-bleed rule, so
 *  the row stays a separate box from the body inset. */
export function FlatSiteMasthead() {
  return (
    <div
      data-testid="masthead-rule"
      className="animate-fade-in border-ink border-b-2"
    >
      <header
        data-testid="masthead-inset"
        data-profile-orientation="masthead"
        /* `py-3` seats the 36px toggle against the rule: 62px at 375, 70px at
           1024 (ADR-0003). */
        className={cn(FLAT_SITE_INSET, "py-3 lg:py-4 print:pt-0")}
      >
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-baseline gap-x-4">
            <h1
              data-testid="masthead-name"
              data-identity-name="true"
              className="font-display text-lg font-semibold tracking-tight"
            >
              {RESUME_DATA.name}
            </h1>
            <p
              data-testid="masthead-role"
              className="text-faint font-label hidden text-xs tracking-[0.12em] uppercase lg:block print:hidden"
            >
              {RESUME_DATA.roleLabel}
            </p>
          </div>
          {/* `gap-6`, not the links' `gap-5`: at gap-5 the toggle's 44px hit
              area and `CV`'s crossed by 1px. */}
          <div className="flex items-center gap-6">
            <nav
              aria-label="Site"
              data-testid="masthead-routes"
              className="text-faint font-label hidden gap-5 text-xs tracking-[0.12em] uppercase lg:flex print:hidden"
            >
              <Link href="/writing" className={routeLinkClassName}>
                Writing
              </Link>
              <Link href="/cv" className={routeLinkClassName}>
                CV
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
    </div>
  );
}

/** Under the rule: the portrait, the role and place, the current subhead, and
 *  the three ways on — Email, CV, Writing. It comes before the path in both DOM
 *  and visual order, because the subhead is what puts the technical claim in
 *  the first viewport (`tests/homepage-fold.spec.ts`). */
export function FlatSiteIntro() {
  return (
    <div
      data-testid="flat-site-intro"
      data-profile-orientation="identity"
      className="flex max-w-[42rem] items-start gap-4 pt-6 lg:pt-10 print:pt-0"
    >
      {/* 4:5, because the source is a 4:5 studio portrait and a square frame
          centre-crops the face out of it. Two elements, one per medium:
          `sizes` takes no print condition, and this frame is 56px on screen
          and 96px on paper. The screen portrait paints first, so it is the
          first LCP candidate before the subhead replaces it as the largest,
          at 375 and 1440 alike: eager, so that first paint is not held back,
          but not `fetchPriority="high"`, which belongs to the final LCP. Eager
          means it is fetched in any medium; the print element stays lazy, and
          a lazy hidden image is never fetched, so screen never pays for the
          print file. */}
      <div className="border-accent/20 portrait-warm relative h-[70px] w-14 shrink-0 overflow-hidden rounded-sm border-2 print:h-[120px] print:w-24">
        <Image
          src={RESUME_DATA.avatarUrl}
          alt={RESUME_DATA.name}
          fill
          sizes="56px"
          loading="eager"
          className="object-cover print:hidden"
        />
        <Image
          src={RESUME_DATA.avatarUrl}
          alt={RESUME_DATA.name}
          fill
          sizes="96px"
          loading="lazy"
          className="hidden object-cover print:block"
        />
      </div>
      <div className="min-w-0 space-y-3 print:space-y-1">
        <p className="text-faint font-label text-xs tracking-[0.12em] uppercase">
          {/* From `lg` the masthead states the role beside the name. */}
          <span className="lg:hidden print:inline">
            {RESUME_DATA.roleLabel} ·{" "}
          </span>
          {RESUME_DATA.location}
        </p>
        <p className="text-body text-base leading-relaxed text-pretty sm:text-lg print:text-[12px]">
          {RESUME_DATA.homepage.hero.subhead}
        </p>
        <p className={FLAT_SITE_LINK_ROW_CLASS_NAME}>
          <a
            href={`mailto:${RESUME_DATA.contact.email}`}
            className={FLAT_SITE_LINK_CLASS_NAME}
          >
            Email
          </a>
          <Link href="/cv" className={FLAT_SITE_LINK_CLASS_NAME}>
            CV
          </Link>
          <Link href="/writing" className={FLAT_SITE_LINK_CLASS_NAME}>
            Writing
          </Link>
        </p>
      </div>
    </div>
  );
}
