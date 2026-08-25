import { Suspense } from "react";

import { RESUME_DATA } from "@/data/resume-data";
import { FooterCvLink } from "@/components/footer-cv-link";
import { FooterSubscribeLink } from "@/components/footer-subscribe-link";
import { cn } from "@/lib/utils";

const underline = "underline decoration-border underline-offset-4";

/** The nav's links: discrete targets on their own rows, so they take the 44px
 *  hit-area expansion. Exported because the not-found shell's recovery links are
 *  the same kind of target and have to stay the same language — a second hand
 *  copy of the string would let the two drift silently (GH-121). */
export const footerLinkClass = `touch-target ${underline} hover:decoration-accent`;

/** The colophon's links, deliberately without `touch-target`. These two sit
 *  inline inside one running 12px sentence that wraps, where a 44px hit area
 *  would need roughly 3.7× the leading of the smallest type on the site — and
 *  short of that the overlays overlap each other and the nav row above, so a
 *  thumb aimed at one fires the other. Prose is not a control strip.
 *  They still carry the 24px floor explicitly, because that is WCAG 2.2 SC
 *  2.5.8's actual requirement and the bare text box measures 16px. */
const colophonLinkClass = `inline-flex min-h-6 items-center ${underline} hover:decoration-accent`;

/** `measure` is the host route's own inset, passed down by its shell. The old
 *  `container … max-w-3xl` matched none of the three shells, so the last rule on
 *  every page missed the content above it — 16px in on `/cv`, a 40px overhang
 *  both sides on `/writing`, and a third distinct left edge on `/`. */
export function SiteFooter({ measure }: { measure: string }) {
  return (
    <footer className={cn(measure, "pb-20 print:pb-0")}>
      <div className="flex w-full flex-col gap-5 border-t pt-6 text-sm sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div className="space-y-1">
          <p className="font-semibold">{RESUME_DATA.name}</p>
          <p className="text-faint font-mono text-xs">{RESUME_DATA.location}</p>
        </div>

        {/* `space-y-5`: the nav's last wrapped row carries a 44px hit area, and
            at 12px of separation it reached down over the colophon link below
            it. */}
        <div className="space-y-5 sm:text-right">
          <nav aria-label="Footer">
            {/* `gap-y-5`, not `gap-y-1`: this list wraps at 375, and 44px hit
                areas on a 24px pitch would put each line's target inside its
                neighbour's — a thumb aimed between two links would fire
                whichever painted last. */}
            <ul className="flex flex-wrap gap-x-4 gap-y-5 sm:justify-end">
              {RESUME_DATA.contact.email ? (
                <li>
                  <a
                    className={footerLinkClass}
                    href={`mailto:${RESUME_DATA.contact.email}`}
                  >
                    Email
                  </a>
                </li>
              ) : null}
              {RESUME_DATA.contact.tel ? (
                <li>
                  <a
                    className={footerLinkClass}
                    href={`tel:${RESUME_DATA.contact.tel}`}
                  >
                    Phone
                  </a>
                </li>
              ) : null}
              {/* Both read the pathname, which is runtime data on a route
                  with dynamic segments — without a boundary they block the
                  whole page there under Cache Components. Every statically
                  routed page still prerenders them; the fallback is `null`
                  because each link is already conditional on the route, so an
                  absent one is a shape the footer holds anyway. */}
              <Suspense fallback={null}>
                <FooterCvLink className={footerLinkClass} />
                <FooterSubscribeLink
                  className={footerLinkClass}
                  href={`${RESUME_DATA.newsletter.url}/subscribe`}
                />
              </Suspense>
              {RESUME_DATA.contact.social.map((social) => (
                <li key={social.name}>
                  <a
                    className={footerLinkClass}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {social.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-faint font-mono text-xs">
            <a
              className={colophonLinkClass}
              href={`${RESUME_DATA.newsletter.url}/feed`}
            >
              RSS feed →
            </a>{" "}
            · agents welcome →{" "}
            <a className={colophonLinkClass} href="/llms.txt">
              /llms.txt
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
