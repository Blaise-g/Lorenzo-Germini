import Image from "next/image";
import type { ReactNode } from "react";

import { FloatingActionCluster } from "@/components/floating-action-cluster";
import {
  StickyRailNavigation,
  type HubDestination,
} from "@/components/sticky-rail";
import { ThemeToggle } from "@/components/theme-toggle";

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
  name: string;
  role: string;
  summary: string;
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

      {/* The rule is a border on a block that is already the width of the
          viewport, so it stays flush to both edges no matter what the inset
          below it reserves for the fixed theme toggle. */}
      <div
        data-testid="masthead-rule"
        className="animate-fade-in-up border-ink border-b-2 print:hidden"
      >
        <header
          data-testid="shell-inset"
          className={`${shellInset} pt-20 pb-4 lg:pt-10`}
        >
          <div className="flex items-baseline justify-between gap-8">
            <p className="font-display text-lg font-semibold tracking-tight">
              {profile.name}
            </p>
            <p className="text-faint hidden font-mono text-xs tracking-[0.12em] uppercase lg:block">
              {profile.role}
            </p>
          </div>
        </header>
      </div>

      <div
        data-testid="shell-inset"
        className={`${shellInset} pb-24 print:py-0`}
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

        <div className="grid gap-10 pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 print:block print:pt-0">
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
          : "flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between print:flex-row print:items-center"
      }
    >
      <div className={isRail ? "space-y-4" : "flex items-center gap-4"}>
        <div
          className={
            isRail
              ? "border-accent/20 relative size-20 overflow-hidden rounded-sm border-2 grayscale"
              : "border-accent/20 relative size-20 shrink-0 overflow-hidden rounded-sm border-2 grayscale print:size-24"
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
          {!isRail ? (
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              {profile.name}
            </h1>
          ) : null}
          <p className="text-body text-sm leading-relaxed">
            {isRail ? profile.summary : profile.role}
          </p>
          {!isRail ? (
            <p className="text-faint font-mono text-xs">{profile.location}</p>
          ) : null}
        </div>
      </div>
      <div className={isRail ? "pt-1" : "shrink-0"}>{profile.actions}</div>
    </div>
  );
}
