import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { FloatingActionCluster } from "@/components/floating-action-cluster";
import { RouteFrame } from "@/components/route-frame";
import { SectionAnchorRow } from "@/components/section-anchor-row";
import {
  StickyRailNavigation,
  type HubDestination,
} from "@/components/sticky-rail";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/* Shared by the masthead and the body below it, which are separate boxes so the
   masthead rule can span the viewport. The right padding below xl reserves room
   for the fixed theme toggle, which is why the inset is not symmetric.
   Exported because the footer takes it too — its rule has to end where this
   shell's content ends. */
export const HUB_SHELL_INSET =
  "mx-auto max-w-5xl px-6 pr-20 md:px-10 md:pr-20 xl:px-10 print:max-w-none print:px-0";

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
  commandLinks,
  destinations,
  profile,
}: {
  children: ReactNode;
  commandLinks: { title: string; url: string }[];
  destinations: readonly HubDestination[];
  profile: HubProfile;
}) {
  return (
    <RouteFrame measure={HUB_SHELL_INSET}>
      <div className="min-h-screen">
        <ThemeToggle />

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
            /* The old comment here claimed `pt-12` was needed to clear the fixed
             theme toggle. Measured, that reasoning is wrong: at 375 the name
             sits at x=24..164 and the toggle at x=315..359, so they never
             overlap horizontally and vertical clearance was never the
             constraint. The real one is that this box's bottom rule stays below
             the toggle's 60px bottom edge — `pt-5` puts it at y=64, which holds
             it while returning 28px of the 303px of chrome that sat above the
             `<h1>` on a 375×812 screen. */
            /* `lg:pt-9`, not the old `lg:pt-10`: the route links' 44px hit-area
               row measures 24px against the name's 28px, and at pt-10 the box
               came to 86px against the 84px it is held to. */
            className={cn(HUB_SHELL_INSET, "pt-5 pb-4 lg:pt-9 print:pt-0")}
          >
            <div className="flex items-baseline justify-between gap-8">
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

        <FloatingActionCluster commandLinks={commandLinks} />
      </div>
    </RouteFrame>
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
          <Image
            src={profile.avatarUrl}
            alt={profile.avatarAlt}
            fill
            /* The slot, measured, not a guess: the rail frame is 144px wide and
               the band's 56px. A bare value wider than the slot serves a file
               the layout never uses; one narrower upscales on every phone. */
            sizes={isRail ? "144px" : "56px"}
            /* Never `priority` here. Both variants render on every route, one
               always inside a `display: none` ancestor, and a preload is not
               media-gated — so `priority` costs two `rel=preload` tags and pulls
               a 256w file for the slot the breakpoint hid. Measured at 1024:
               lazy, the hidden band takes 64w against the rail's 256w.
               It is still requested — `loading=lazy` defers on viewport
               proximity and a `display: none` image has none — so the second
               request only goes away by rendering one variant instead of two,
               which is what keeps this server-rendered and shift-free.
               The portrait is not the LCP element; the hero `<h1>` is. */
            loading="lazy"
            className="object-cover"
          />
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
