import Link from "next/link";

import { CV_DOCUMENT_INSET } from "@/app/cv/inset";
import { RouteFrame } from "@/components/route-frame";

/* The same underline language the footer's links use, so a dead end reads as
   part of the site rather than as an error screen with its own vocabulary. */
const recoveryLinkClass =
  "touch-target underline decoration-border underline-offset-4 hover:decoration-accent";

export default function NotFound() {
  return (
    /* The 404 has no shell of its own, so it borrows the widest single-column
       measure on the site rather than leaving the footer to guess. */
    <RouteFrame measure={CV_DOCUMENT_INSET}>
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-fade-in-up space-y-6 text-center">
          <h1 className="font-display text-accent text-7xl font-bold tracking-tighter md:text-9xl">
            404
          </h1>
          <div className="bg-accent/30 mx-auto h-px w-16" />
          <p className="text-body mx-auto max-w-md text-lg">
            This page doesn&apos;t exist. You were probably looking for my
            resume.
          </p>
          <Link
            href="/"
            className="primary-control bg-accent text-accent-foreground transition-refined inline-flex items-center gap-2 rounded-md px-6 py-3 font-mono text-xs font-medium uppercase shadow-sm hover:scale-105 hover:shadow-md"
          >
            Back to resume
          </Link>
          {/* GH-121: a stale or guessed link is a dead end for an agent unless
              the shell names somewhere else to fetch. These two are the whole
              machine-readable index, and they are useful to a reader on a dead
              link either way. `gap-y-5`, as in the footer's nav: the row wraps
              at 375, and two 44px hit areas on a tighter pitch would put each
              one inside its neighbour's. */}
          <nav aria-label="Elsewhere on this site">
            <ul className="text-faint flex flex-wrap justify-center gap-x-4 gap-y-5 font-mono text-xs">
              <li>
                <a className={recoveryLinkClass} href="/llms.txt">
                  /llms.txt
                </a>
              </li>
              <li>
                <a className={recoveryLinkClass} href="/sitemap.xml">
                  /sitemap.xml
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </RouteFrame>
  );
}
