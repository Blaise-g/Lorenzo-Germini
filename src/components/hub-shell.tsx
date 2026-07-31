import Image from "next/image";
import type { ReactNode } from "react";

import { FloatingActionCluster } from "@/components/floating-action-cluster";
import {
  StickyRailNavigation,
  type HubDestination,
} from "@/components/sticky-rail";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/* Shared by the masthead and the body below it, which are separate boxes so the
   masthead rule can span the viewport. The right padding below xl reserves room
   for the fixed theme toggle, which is why the inset is not symmetric. */
const shellInset =
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
          /* pt-12 clears the fixed theme toggle's 52px bottom edge by a hair
             rather than by 28px: measured, the old pt-20 pushed the phone hero
             to y=416 on a 375×812 screen, half the fold spent above the `<h1>`. */
          className={cn(shellInset, "pt-12 pb-4 lg:pt-10 print:pt-0")}
        >
          <div className="flex items-baseline justify-between gap-8">
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
        </header>
      </div>

      <div
        data-testid="body-inset"
        className={cn(shellInset, "pb-24 print:py-0")}
      >
        <div
          data-testid="mobile-identity"
          data-profile-orientation="identity"
          className="pt-5 lg:hidden print:block print:pt-0"
        >
          <ProfileIdentity profile={profile} variant="band" />
        </div>

        <nav
          aria-label="On this page"
          className="border-border -mx-1 mt-5 flex flex-wrap gap-x-1 border-y py-1 font-mono text-xs tracking-[0.08em] uppercase lg:hidden print:hidden"
        >
          {destinations.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="touch-target text-faint hover:text-accent px-2 py-1.5 underline-offset-4 hover:underline"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="grid gap-10 pt-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:pt-10 print:block print:pt-0">
          <aside
            aria-label="Profile and page sections"
            data-profile-orientation="identity"
            className="hidden space-y-6 self-start lg:sticky lg:top-8 lg:col-start-1 lg:row-start-1 lg:block print:hidden"
          >
            <ProfileIdentity profile={profile} variant="rail" />
            <StickyRailNavigation destinations={destinations} />
          </aside>

          <div className="min-w-0 space-y-12 lg:col-start-2 lg:row-start-1 print:space-y-2">
            {children}
          </div>
        </div>
      </div>

      <FloatingActionCluster commandLinks={commandLinks} />
    </div>
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
        <div
          className={
            isRail
              ? "border-accent/20 relative size-20 overflow-hidden rounded-sm border-2 grayscale"
              : "border-accent/20 relative size-14 shrink-0 overflow-hidden rounded-sm border-2 grayscale print:size-24"
          }
        >
          <Image
            src={profile.avatarUrl}
            alt={profile.avatarAlt}
            fill
            sizes={isRail ? "80px" : "96px"}
            priority
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
