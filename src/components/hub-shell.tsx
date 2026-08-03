import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BackToTop } from "@/components/back-to-top";
import { RouteFrame } from "@/components/route-frame";
import { SectionAnchorRow } from "@/components/section-anchor-row";
import {
  StickyRailNavigation,
  type HubDestination,
} from "@/components/sticky-rail";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/* Shared by the masthead and the body below it, which are separate boxes so the
   masthead rule can span the viewport. Symmetric since #89 put the theme toggle
   in the masthead: the `pr-20` that stood here reserved a 56px exclusion zone
   for the toggle in its fixed top-right slot, and with the control in flow there
   is nothing overhead to reserve against.
   Exported because the footer takes it too — its rule has to end where this
   shell's content ends. */
export const HUB_SHELL_INSET =
  "mx-auto max-w-5xl px-6 md:px-10 print:max-w-none print:px-0";

type HubProfile = {
  actions: ReactNode;
  avatarAlt: string;
  avatarUrl: string;
  location: string;
  /** Rail only. The band states the role and location instead: below lg the
   *  hero is one screen away, so a bio there just delays it. */
  bio: string;
  name: string;
  roleLabel: string;
};

export function HubShell({
  children,
  destinations,
  profile,
}: {
  children: ReactNode;
  destinations: readonly HubDestination[];
  profile: HubProfile;
}) {
  return (
    <RouteFrame measure={HUB_SHELL_INSET}>
      <div className="min-h-screen">
        {/* Prints: with the band's `<h1>` gone (#26), this is the only surface
          that states the name, and a printed homepage still has to say whose
          it is. The role label beside it stays on screen only — the band
          repeats it directly underneath in print. */}
        <div
          data-testid="masthead-rule"
          className="animate-fade-in-up border-ink border-b-2"
        >
          {/* Its own orientation value, because this surface coexists with
            band-or-rail rather than replacing either. */}
          <header
            data-testid="masthead-inset"
            data-profile-orientation="masthead"
            /* Symmetric and tight since the toggle came in flow (#89). Every
               earlier value here was clearance for the fixed toggle overhead —
               `pt-12` for a claimed vertical overlap that measurement disproved,
               then `pt-5`/`lg:pt-9` to keep this box's bottom rule below the
               toggle's 60px bottom edge. Neither constraint exists now: the
               toggle is inside this box, so the padding only has to seat a 36px
               control against the rule, and `py-3` measures 62px at 375 against
               the 66px `pt-5` held and 70px at 1024 against 82px. */
            className={cn(HUB_SHELL_INSET, "py-3 lg:py-4 print:pt-0")}
          >
            <div className="flex items-center justify-between gap-8">
              {/* The role label rides beside the name rather than opposite it.
                Held at the far edge it left ~600px of dead space between the
                two at 1024, which the route links now occupy — so what is left
                between the clusters reads as margin instead of as a gap. */}
              <div className="flex items-baseline gap-x-4">
                <p
                  data-testid="masthead-name"
                  data-identity-name="true"
                  className="font-display text-lg font-semibold tracking-tight"
                >
                  {profile.name}
                </p>
                <p
                  data-testid="masthead-role"
                  className="text-faint hidden font-mono text-xs tracking-[0.12em] uppercase lg:block print:hidden"
                >
                  {profile.roleLabel}
                </p>
              </div>
              {/* Both routes already exist, so this is wiring, not a new surface.
                `/writing` had zero inbound links from this page at any
                breakpoint while the hero pointed readers at the publication.
                ≥lg only: below it the dead space this fills does not exist, and
                the Writing section's own `All writing →` covers the phone
                without adding to a masthead already carrying too much. */}
              {/* One cluster, because the toggle now sits here too: `gap-6`
                rather than the links' own `gap-5`, so the toggle's 44px hit area
                and `CV`'s do not overlap — measured, at gap-5 they crossed by
                1px and a tap on the link's right edge hit-tested as the
                toggle. */}
              <div className="flex items-center gap-6">
                <nav
                  aria-label="Site"
                  data-testid="masthead-routes"
                  className="text-faint hidden gap-5 font-mono text-xs tracking-[0.12em] uppercase lg:flex print:hidden"
                >
                  <Link
                    href="/writing"
                    className="touch-target hover:text-accent underline-offset-4 hover:underline"
                  >
                    Writing
                  </Link>
                  <Link
                    href="/cv"
                    className="touch-target hover:text-accent underline-offset-4 hover:underline"
                  >
                    CV
                  </Link>
                </nav>
                <ThemeToggle />
              </div>
            </div>
          </header>
        </div>

        <div
          data-testid="body-inset"
          className={cn(HUB_SHELL_INSET, "pb-24 print:py-0")}
        >
          <div
            data-testid="mobile-identity"
            data-profile-orientation="identity"
            className="pt-5 lg:hidden print:block print:pt-0"
          >
            <ProfileIdentity profile={profile} variant="band" />
          </div>

          {/* `lg:hidden`: from `lg` the sticky rail carries these same
              destinations, with the active one marked. */}
          <SectionAnchorRow
            destinations={destinations}
            className="mt-5 lg:hidden"
          />

          <div className="grid gap-10 pt-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:pt-10 print:block print:pt-0">
            <aside
              aria-label="Profile and page sections"
              data-profile-orientation="identity"
              className="hidden space-y-6 self-start lg:sticky lg:top-8 lg:col-start-1 lg:row-start-1 lg:block print:hidden"
            >
              <ProfileIdentity profile={profile} variant="rail" />
              <StickyRailNavigation destinations={destinations} />
            </aside>

            {/* The printed section gap was 8px against ~4px paragraph gaps inside
              About, so printed sections ran together and the 48×1px 30%-opacity
              accent rule was doing all the separating on its own. */}
            <div className="min-w-0 space-y-12 lg:col-start-2 lg:row-start-1 print:space-y-5">
              {children}
            </div>
          </div>
        </div>

        <BackToTop />
      </div>
    </RouteFrame>
  );
}

/** One `<Image>` per slot the portrait is actually drawn into, so each declares
 *  its own `sizes`. Never `priority`: the variants render on every route with at
 *  least one inside a `display: none` ancestor, and a preload is not
 *  media-gated — so `priority` would cost a `rel=preload` per element and pull a
 *  256w file for a slot the medium hid. The portrait is not the LCP element; the
 *  hero `<h1>` is. */
function PortraitImage({
  className,
  profile,
  sizes,
}: {
  className?: string;
  profile: HubProfile;
  sizes: string;
}) {
  return (
    <Image
      src={profile.avatarUrl}
      alt={profile.avatarAlt}
      fill
      sizes={sizes}
      loading="lazy"
      className={cn("object-cover", className)}
    />
  );
}

function ProfileIdentity({
  profile,
  variant,
}: {
  profile: HubProfile;
  variant: "band" | "rail";
}) {
  const isRail = variant === "rail";

  return (
    <div
      className={
        isRail
          ? "space-y-4"
          : "flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between print:flex-row print:items-center"
      }
    >
      <div className={isRail ? "space-y-4" : "flex items-center gap-4"}>
        {/* 4:5 in both variants, because the source is a 4:5 studio portrait and
            a square frame center-crops the face out of it. `portrait-warm` is
            the monochrome: a plain `grayscale` puts neutral grey against warm
            paper, which is the one place the system's "warm" claim visibly
            breaks — and it breaks harder the larger the portrait gets. */}
        <div
          className={
            isRail
              ? "border-accent/20 portrait-warm relative h-45 w-36 overflow-hidden rounded-sm border-2"
              : "border-accent/20 portrait-warm relative h-[70px] w-14 shrink-0 overflow-hidden rounded-sm border-2 print:h-[120px] print:w-24"
          }
        >
          {isRail ? (
            <PortraitImage profile={profile} sizes="144px" />
          ) : (
            <>
              {/* The band is drawn into two different slots — 56px on a phone
                screen, 96px on paper (`print:w-24` above, deliberately enlarged
                because print has no rail to carry the portrait). `sizes` takes
                no print condition, so one element cannot declare both: at
                `56px` the printed slot gets a 64w file and upscales ~1.5×, and
                at `96px` every phone pays for it — measured, 128w → 256w at DPR
                2 and 256w → 384w at DPR 3, which is the regression #86 fixed by
                moving this off `96px` in the first place.
                Two elements cost nothing instead, because a hidden one is never
                fetched: measured at 1024, the only image request on screen is
                the rail's 256w, and the band's arrives only once print media
                makes it displayed. Splitting the slot splits the request with
                it — each variant loads in exactly the medium it is sized for,
                and neither medium pays for the other. */}
              <PortraitImage
                profile={profile}
                sizes="56px"
                className="print:hidden"
              />
              <PortraitImage
                profile={profile}
                sizes="96px"
                className="hidden print:block"
              />
            </>
          )}
        </div>
        <div className={isRail ? "space-y-2" : "space-y-1"}>
          {isRail ? (
            <p className="text-body text-sm leading-relaxed">{profile.bio}</p>
          ) : (
            /* #26: the band used to restate the name in a second `<h1>`, 38px
               below the masthead's — two thirds of a 375px fold spent on
               identity before the hero. It carries the role, the location and
               the CV route instead; the hero below is the page's only `<h1>`. */
            <p className="text-faint font-mono text-xs leading-relaxed tracking-[0.12em] uppercase">
              {profile.roleLabel} · {profile.location}
              <br />
              <a
                href="/cv"
                className="text-accent decoration-border hover:decoration-accent touch-target underline underline-offset-4"
              >
                CV →
              </a>
            </p>
          )}
        </div>
      </div>
      <div className={isRail ? "pt-1" : "shrink-0"}>{profile.actions}</div>
    </div>
  );
}
