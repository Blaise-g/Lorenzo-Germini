// PROTOTYPE — the /writing index as pixels (issue #13).
//
// #10 decided this surface in prose. Three of its choices cannot be judged
// without a rendered page, and each is a parameter here so it can be seen
// both ways in the same file:
//
//   ?n=1|3|6        count-aware states (1 = the actual launch state)
//   ?reveal=mount|stagger   own-mount reveal vs the page-level delay stagger
//                           the live site uses today (question 2)
//   ?stream=on|off  simulate the Suspense boundary cacheComponents introduces
//   ?it=on          Italian copy, for the subscribe module's expansion budget
//
// Held to #10's constraints: metadata is date + computed reading time only
// (no language chips, no tags — the feed has neither); numbering is by
// publication order ascending; thumbnails use fill + a fixed aspect ratio
// because <enclosure> reports length="0" and no intrinsic dimensions; a
// coverless post falls back to a typographic panel rather than a gap.
//
// Delete with the rest of src/components/prototype/ only when the Phase 2 §2.6
// homepage swap merges.

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { FloatingActionCluster } from "@/components/floating-action-cluster";
import { ThemeToggle } from "@/components/theme-toggle";
import { SUBSTACK_BASE, t } from "./warm-print";
import {
  FEED,
  type FeedItem,
  formatDate,
  readingMinutes,
} from "./writing-feed";
import { SubscribeModule } from "./subscribe-module";

export type WritingParams = {
  n: number;
  reveal: "mount" | "stagger";
  stream: boolean;
  lang: "en" | "it";
};

/* The live site's stagger: animate-fade-in-up plus a page-level animation-delay
   class. globals.css:228's reduced-motion block collapses animation-duration
   but never resets animation-delay, and fade-in-up fills `both` — so under
   reduced motion these elements hold the 0% keyframe (opacity 0) for the whole
   delay. Reproduced verbatim so the defect can be measured rather than argued. */
const STAGGER = [
  "",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-400",
  "delay-500",
];

function revealClass(params: WritingParams, index: number) {
  if (params.reveal === "stagger") {
    return `animate-fade-in-up ${STAGGER[Math.min(index, STAGGER.length - 1)]}`;
  }
  /* mount: the animation starts when this element's own chunk is inserted,
     which is the only clock that survives streaming. No delay class → nothing
     for the reduced-motion block to leave un-reset. */
  return "animate-fade-in-up";
}

/* ─── Thumbnails ─── */

function Cover({ item, size }: { item: FeedItem; size: "lead" | "row" }) {
  /* #13: 16:9 for rows too. In a 4:3 box, 16:9 cover art lost ~25% of its
     width and decapitated Substack's auto-generated title cards ("Costruire"
     rendered as "ostruire"). A hairline in both modes is not decoration: a
     near-white cover measured 1.04:1 against the paper (no edge at all) and
     12–17:1 against the near-black (brighter than any text on the page). */
  const box = "relative aspect-[16/9] w-full overflow-hidden rounded-sm border";

  if (!item.cover) {
    /* #10 decision 7: the feed does not guarantee <enclosure>. A coverless post
       gets a typographic panel at the same aspect ratio, so the rhythm of the
       index does not break on one missing image. */
    return (
      <div
        className={`${box} border-border flex items-end bg-current/[0.06]`}
        aria-hidden
      >
        <p className={`${t.meta} ${t.faint} p-3`}>{formatDate(item.pubDate)}</p>
      </div>
    );
  }

  return (
    <div className={`${box} border-border`}>
      <Image
        src={item.cover}
        alt=""
        fill
        /* was sizes="160px" for rows — but below sm the row thumb is full
           width, so a 327px/DPR-2 slot was served a 160px file on every
           phone. */
        sizes={
          size === "lead"
            ? "(min-width: 768px) 42rem, 100vw"
            : "(min-width: 640px) 160px, 100vw"
        }
        /* the lead cover is the LCP element; Next logs the warning */
        priority={size === "lead"}
        className="object-cover dark:brightness-[0.82]"
      />
    </div>
  );
}

/* ─── Metadata row: date + computed reading time, nothing else (#10 dec. 8) ─── */

function Meta({ item }: { item: FeedItem }) {
  const minutes = readingMinutes(item);
  return (
    <p className={`${t.meta} ${t.faint}`}>
      {formatDate(item.pubDate)}
      {minutes ? ` · ${minutes} min read` : ""}
    </p>
  );
}

/* ─── The lead treatment ─── */

function Lead({ item, params }: { item: FeedItem; params: WritingParams }) {
  return (
    <article className={revealClass(params, 0)}>
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
      >
        <Cover item={item} size="lead" />
        <div className="mt-5">
          <Meta item={item} />
        </div>
        <h2 className="font-display mt-2 text-3xl leading-snug underline-offset-4 group-hover:underline sm:text-4xl">
          {item.title}
        </h2>
        <p className={`mt-3 text-base leading-relaxed ${t.body}`}>
          {item.excerpt}
        </p>
        <span
          className={`mt-4 inline-block border-b pb-1 ${t.meta} ${t.accent} ${t.accentBorder}`}
        >
          Read the essay →
        </span>
      </a>
    </article>
  );
}

/* ─── A row in the index ─── */

function Row({
  item,
  params,
  index,
}: {
  item: FeedItem;
  params: WritingParams;
  index: number;
}) {
  return (
    <article
      className={`border-border border-t pt-7 ${revealClass(params, index)}`}
    >
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid gap-4 sm:grid-cols-[10rem_1fr] sm:gap-6"
      >
        <Cover item={item} size="row" />
        <div>
          <Meta item={item} />
          <h3 className="font-display mt-1.5 text-2xl leading-snug underline-offset-4 group-hover:underline">
            {item.title}
          </h3>
          <p className={`mt-2 text-base leading-relaxed ${t.body}`}>
            {item.excerpt}
          </p>
        </div>
      </a>
    </article>
  );
}

/* ─── The count-aware list (#10 decision 3) ─────────────────────────────────
   1     → lead only. No numbering, no archive link, nothing that implies a
           back catalogue exists. This is the launch state.
   2–3   → lead + compact rows, still unnumbered.
   4+    → numbered index (publication order ascending) + archive link.
   ------------------------------------------------------------------------- */

async function EssayList({ params }: { params: WritingParams }) {
  if (params.stream) {
    /* stand-in for the Suspense boundary cacheComponents introduces on a cold
       cache: the section arrives after the shell has painted. */
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  const items = FEED.slice(0, params.n);
  if (items.length === 0) return null; /* #10 dec. 10: absent, never broken */

  /* #13: numbering dropped. It derived from the fetched feed window, not the
     archive, so the same essay was 04 at four items and 06 at six — the exact
     renumbering #10 decision 4 existed to prevent — and the critique measured
     that no reader can decode the scheme anyway. Date + reading time carry the
     metadata row alone. This also removes the numbers from the homepage teaser. */
  const showArchive = params.n >= 4;
  const [lead, ...rest] = items;

  return (
    <div>
      <Lead item={lead} params={params} />
      {rest.length > 0 ? (
        <div className="mt-14 space-y-7">
          {rest.map((item, i) => (
            <Row key={item.link} item={item} params={params} index={i + 1} />
          ))}
        </div>
      ) : null}
      {showArchive ? (
        <p className={`mt-12 ${t.meta}`}>
          <a
            href={`${SUBSTACK_BASE}/archive`}
            target="_blank"
            rel="noopener noreferrer"
            className={`border-b pb-1 ${t.accent} ${t.accentBorder} hover:opacity-70`}
          >
            Read all essays on Substack →
          </a>
        </p>
      ) : null}
    </div>
  );
}

function ListFallback() {
  /* Deliberately not a spinner: the shell should hold the space the essays
     will occupy so the page does not jump when the chunk lands. */
  return (
    <div aria-hidden className="space-y-5">
      <div className="aspect-[16/9] w-full rounded-sm bg-current/[0.06]" />
      <div className="h-3 w-40 rounded-sm bg-current/[0.06]" />
      <div className="h-8 w-4/5 rounded-sm bg-current/[0.06]" />
      <div className="h-4 w-full rounded-sm bg-current/[0.06]" />
    </div>
  );
}

/* ─── The page ─── */

export function WritingIndex({ params }: { params: WritingParams }) {
  return (
    <div className={`min-h-screen ${t.page}`}>
      <ThemeToggle />
      <FloatingActionCluster />

      <div className="mx-auto max-w-[46rem] px-6">
        <header className="pt-10">
          <div className={`flex items-baseline justify-between ${t.masthead}`}>
            <Link
              href="/"
              className="font-display text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
            >
              Lorenzo Germini
            </Link>
            {/* Visible at every width — the homepage prototypes hid their nav
                below sm/lg, which is the map's one unresolved shell item. */}
            <nav className={`flex gap-5 ${t.meta}`} aria-label="Sections">
              <Link href="/" className="underline-offset-4 hover:underline">
                Home
              </Link>
              <a
                href="/writing"
                aria-current="page"
                className={`${t.accent} underline-offset-4 hover:underline`}
              >
                Writing
              </a>
              <a href="/cv" className="underline-offset-4 hover:underline">
                CV
              </a>
            </nav>
          </div>
        </header>

        <div className="pt-12">
          <div className="max-w-[34rem]">
            <h1 className="font-display text-4xl leading-[1.1] font-medium tracking-tight">
              Writing
            </h1>
            <p className={`mt-4 text-base leading-relaxed ${t.body}`}>
              Essays on frontier AI, the companies being built on it, and what
              it does to the economics of software. Published on Substack.
            </p>
            {/* #13: at n=1 the plural standfirst delivered one essay with
                nothing framing it as new. One launch line fixes it, and it
                disappears the moment there is a second post. */}
            {params.n === 1 ? (
              <p className={`mt-3 ${t.meta} ${t.faint}`}>
                First essay published {formatDate(FEED[0].pubDate)} · new ones
                roughly fortnightly
              </p>
            ) : null}
          </div>

          <div className="mt-14">
            {/* Always behind the boundary; ?stream=off simply removes the
                delay, so the two arms differ only in when the chunk lands. */}
            <Suspense fallback={<ListFallback />}>
              <EssayList params={params} />
            </Suspense>
          </div>

          {/* #10 decision 6: placement one of two — the full module at the end
              of the index, after the essays, where intent is highest. */}
          <SubscribeModule lang={params.lang} />
        </div>
      </div>
    </div>
  );
}
