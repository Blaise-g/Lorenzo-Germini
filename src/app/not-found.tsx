import Link from "next/link";

import { CV_DOCUMENT_INSET } from "@/app/cv/inset";
import { RouteFrame } from "@/components/route-frame";
import { footerLinkClass } from "@/components/site-footer";

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
            className="primary-control bg-accent text-accent-foreground transition-refined font-label inline-flex items-center gap-2 rounded-md px-6 py-3 text-xs font-medium uppercase shadow-sm hover:scale-105 hover:shadow-md"
          >
            Back to resume
          </Link>
          {/* GH-121: a stale or guessed link is a dead end for an agent unless
              the shell names somewhere else to fetch. These two are the machine-
              readable entry points — each one indexes the rest — and they are
              useful to a reader on a dead link either way.
              No wrap guard: measured at 320 and 375, both links sit on one row
              (65px + 86px + the 16px gap, in a 288px box at the narrower width),
              so the footer nav's `gap-y-5` would be inert here. Adding a link
              would change that, and the 44px overlays would then need it. */}
          <nav aria-label="Elsewhere on this site">
            <ul className="text-faint flex justify-center gap-x-4 font-mono text-xs">
              <li>
                <a className={footerLinkClass} href="/llms.txt">
                  /llms.txt
                </a>
              </li>
              <li>
                <a className={footerLinkClass} href="/sitemap.xml">
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
