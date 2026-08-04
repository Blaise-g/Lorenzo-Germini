/*
THESIS: The essay index is the destination the whole site points at, so it must
never imply more writing exists than does — and never break when the feed does.
OWN-WORLD: Warm Print at a single 46rem measure: serif titles, mono metadata,
terracotta reserved for links and rules.
STORY: Read what the writing is, read the lead essay, then subscribe.
FIRST VIEWPORT: The `<h1>`, the standfirst, and the count-aware line that says
exactly how much writing there is.
FORM: Masthead rule, one reading measure, lead treatment over a row list.
*/

import Link from "next/link";

import { BackToTop } from "@/components/back-to-top";
import { CoverImage } from "@/components/cover-image";
import { RouteFrame } from "@/components/route-frame";
import { SubscribeModule } from "@/components/subscribe-module";
import { ThemeToggle } from "@/components/theme-toggle";
import { RESUME_DATA } from "@/data/resume-data";
import { SUBSTACK_ARCHIVE_URL } from "@/lib/substack";
import { formatEssayDate, type Essay } from "@/lib/substack-feed";
import { cn } from "@/lib/utils";

/* Locked count-aware transitions (spec §2.5): 0 → no list at all, 1 → lead
   only, 2–3 → lead plus rows, 4+ → the archive link joins them. Only the last
   one needs a constant; the others fall out of the array itself. */
const ARCHIVE_LINK_AT = 4;

const meta = "font-mono text-xs uppercase tracking-[0.12em]";

/* Symmetric since #89. The `pr-20 lg:pr-6` that stood here was decision 2's
   top-right exclusion zone: below `lg` this measure runs to the viewport edge,
   where the fixed theme toggle sat on top of it — the masthead's CV link
   hit-tested as "Toggle theme" over 63px² at 375 on the prototype. The toggle is
   in the masthead now, so the collision it guarded against cannot happen, and
   the zone's own side effects go with it — one of them was that the reservation
   survived into print and put every printed page 56px off-centre.

   Exported for symmetry with `HUB_SHELL_INSET` and `CV_DOCUMENT_INSET`, not
   because anything outside this module needs it yet: two of the three insets
   being importable and this one being private made the set look like two shared
   values and one local detail, when all three are the same kind of thing. */
export const WRITING_MEASURE_INSET =
  "mx-auto max-w-[46rem] px-6 print:max-w-none print:px-0";

const { writingPage } = RESUME_DATA;

export function WritingIndex({
  essays,
  lang = "en",
}: {
  essays: Essay[];
  /** Dev-only knob on the fixture route: the module's Italian copy is the
   *  text-expansion budget this layout was measured against. */
  lang?: "en" | "it";
}) {
  const [lead, ...rows] = essays;

  return (
    <RouteFrame measure={WRITING_MEASURE_INSET}>
      <div className="min-h-screen">
        <div className="border-ink border-b-2">
          {/* `py-3`, where `pt-12 pb-4 lg:pt-10` stood: the top value was
            clearance for the fixed toggle, which is inside this row now. */}
          <header className={cn(WRITING_MEASURE_INSET, "py-3 lg:py-4")}>
            <div className="flex items-center justify-between gap-8">
              <Link
                href="/"
                data-identity-name="true"
                className="touch-target font-display text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
              >
                {RESUME_DATA.name}
              </Link>
              {/* The masthead's other half carries cross-route navigation here
                rather than the role label: this route has no rail, so it is the
                only way back to the hub. */}
              {/* `gap-6` between the links and the toggle, `gap-5` inside the
                links: see `hub-shell.tsx` — at gap-5 the toggle's 44px hit area
                crossed `CV`'s. */}
              <div className="flex items-center gap-6">
                <nav
                  aria-label="Site"
                  className={cn("text-faint flex gap-5 print:hidden", meta)}
                >
                  <Link
                    href="/"
                    className="touch-target hover:text-accent underline-offset-4 hover:underline"
                  >
                    Home
                  </Link>
                  <a
                    href="/cv"
                    className="touch-target hover:text-accent underline-offset-4 hover:underline"
                  >
                    CV
                  </a>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>
        </div>

        <div className={cn(WRITING_MEASURE_INSET, "pb-24")}>
          <div className="max-w-[34rem] pt-12">
            <h1 className="font-display animate-fade-in-up text-4xl leading-[1.1] font-medium tracking-tight">
              Writing
            </h1>
            <p className="text-body animate-fade-in-up mt-4 text-base leading-relaxed text-pretty">
              {writingPage.standfirst}
            </p>
            <CountAwareLine essays={essays} />
          </div>

          {lead ? (
            <div className="mt-14">
              <Lead essay={lead} />
              {rows.length > 0 ? (
                /* List semantics, so the rows are announced as a set of five
                 rather than as sections of the lead essay. */
                <ul className="mt-14 space-y-7">
                  {rows.map((essay) => (
                    <li key={essay.url} className="border-border border-t pt-7">
                      <Row essay={essay} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <SubscribeModule lang={lang} />

          {/* Below the module, never at the end of the list: the end-of-list
            placement took the reader off-site before the conversion point. */}
          {essays.length >= ARCHIVE_LINK_AT ? (
            <p className={cn("mt-10", meta)}>
              <a
                href={SUBSTACK_ARCHIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent border-accent touch-target border-b pb-1 hover:opacity-70"
              >
                {writingPage.archiveLabel}
              </a>
            </p>
          ) : null}
        </div>

        <BackToTop />
      </div>
    </RouteFrame>
  );
}

/** The launch line keeps a plural standfirst honest while there is one essay.
 *  At zero the feed-backed surface goes absent; from two essays up the list
 *  speaks for itself. */
function CountAwareLine({ essays }: { essays: Essay[] }) {
  if (essays.length !== 1) return null;

  const line = `First post published ${formatEssayDate(essays[0].publishedAt)} · ${writingPage.cadence}`;

  return (
    <p className={cn("text-faint animate-fade-in-up mt-3", meta)}>{line}</p>
  );
}

function Lead({ essay }: { essay: Essay }) {
  return (
    <article className="group animate-fade-in-up relative">
      <Cover essay={essay} size="lead" />
      <div className="mt-5">
        <Meta essay={essay} />
      </div>
      <h2 className="font-display mt-2 text-[1.75rem] leading-snug">
        <EssayLink essay={essay} />
      </h2>
      <p
        data-essay-excerpt
        className="text-body mt-3 max-w-[34rem] text-base leading-relaxed text-pretty"
      >
        {essay.excerpt}
      </p>
      <span
        className={cn(
          "text-accent border-accent mt-4 inline-block border-b pb-1",
          meta,
        )}
        aria-hidden
      >
        {writingPage.leadCta}
      </span>
    </article>
  );
}

function Row({ essay }: { essay: Essay }) {
  return (
    <article className="group relative grid gap-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <Cover essay={essay} size="row" />
      <div>
        <Meta essay={essay} />
        {/* Same rank as the lead: rows are peers of it, not sections of it. */}
        <h2 className="font-display mt-1.5 text-xl leading-snug">
          <EssayLink essay={essay} />
        </h2>
        <p
          data-essay-excerpt
          className="text-body mt-2 text-base leading-relaxed text-pretty"
        >
          {essay.excerpt}
        </p>
      </div>
    </article>
  );
}

/* One link per essay, named by the title alone. As prototyped, each essay was
   a single 221–268-character link — ~1,500 characters of link text across six
   tab stops. The overlay keeps the whole card clickable without putting the
   cover, the date and the excerpt inside the accessible name. */
function EssayLink({ essay }: { essay: Essay }) {
  return (
    <a
      href={essay.url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline-offset-4 group-hover:underline after:absolute after:inset-0 after:content-['']"
    >
      {essay.title}
    </a>
  );
}

/** Date, plus reading time when the feed carried enough body to compute one.
 *  No `Paid` label and no placeholder when it did not — the site cannot prove
 *  why a body was short (decision 7). */
function Meta({ essay }: { essay: Essay }) {
  return (
    <p className={cn("text-faint", meta)}>
      <time dateTime={essay.publishedAt}>
        {formatEssayDate(essay.publishedAt)}
      </time>
      {essay.readingMinutes ? ` · ${essay.readingMinutes} min read` : ""}
    </p>
  );
}

/* The two treatments side by side, rather than four separate `size ===` tests
   inside the component. */
const COVERS = {
  lead: {
    /* The LCP element. Not `priority` — deprecated in Next 16 — and not
       `preload`, which is for images the parser has not reached; this one is
       in the route's initial HTML. */
    loading: "eager",
    fetchPriority: "high",
    sizes: "(min-width: 768px) 42rem, 100vw",
    fallbackVisibility: "flex",
  },
  row: {
    loading: "lazy",
    fetchPriority: undefined,
    /* A bare `sizes="160px"` served a 160px file into a 325px slot at DPR 2 on
       every phone, where the row thumb is full width. */
    sizes: "(min-width: 640px) 160px, 100vw",
    /* Full width on a phone, the coverless panel is just a large empty box. */
    fallbackVisibility: "hidden sm:flex",
  },
} as const;

function Cover({ essay, size }: { essay: Essay; size: keyof typeof COVERS }) {
  /* 16:9 for rows too: a 4:3 row box cropped ~25% of 16:9 art and decapitated
     Substack's auto-generated title cards. The hairline is functional, not
     decoration — a near-white cover measures 1.04:1 against the paper and
     17:1 against the near-black, so without an edge it either vanishes or
     out-shouts every word on the page. */
  const box =
    "border-border relative aspect-[16/9] w-full overflow-hidden rounded-sm border";
  const cover = COVERS[size];

  /* The feed does not guarantee an `<enclosure>`, and the URL in one it does
     carry can still fail. Both land here: a typographic panel at the same
     aspect ratio rather than a gap or an empty bordered box. */
  const coverless = (
    <div
      aria-hidden
      className={cn(box, cover.fallbackVisibility, "bg-ink/[0.06] items-end")}
    >
      <p className={cn("text-faint p-3", meta)}>
        {formatEssayDate(essay.publishedAt)}
      </p>
    </div>
  );

  if (!essay.coverUrl) return coverless;

  return (
    <CoverImage
      src={essay.coverUrl}
      boxClassName={box}
      sizes={cover.sizes}
      loading={cover.loading}
      fetchPriority={cover.fetchPriority}
      fallback={coverless}
      /* Light covers are knocked back in dark, where they otherwise out-shout
         every word on the page. */
      imageClassName="object-cover dark:brightness-[0.82]"
    />
  );
}

/** Holds the lead's geometry while the feed read streams in, so the subscribe
 *  module below it does not jump when the essays land. */
export function WritingIndexFallback() {
  return (
    <div
      aria-hidden
      className={cn(WRITING_MEASURE_INSET, "space-y-5 pt-14 pb-24")}
    >
      <div className="bg-ink/[0.06] aspect-[16/9] w-full rounded-sm" />
      <div className="bg-ink/[0.06] h-3 w-40 rounded-sm" />
      <div className="bg-ink/[0.06] h-8 w-4/5 rounded-sm" />
      <div className="bg-ink/[0.06] h-4 w-full rounded-sm" />
    </div>
  );
}
