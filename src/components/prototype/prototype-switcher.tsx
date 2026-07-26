"use client";

// PROTOTYPE — dev-only floating variant switcher (issue #7). Not rendered in production.

import { Suspense, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const VARIANTS: { key: string; name: string }[] = [
  { key: "current", name: "Current site" },
  { key: "a", name: "Refined dossier" },
  { key: "b1", name: "B · Warm Print" },
  { key: "b2", name: "B · Slate Editorial" },
  { key: "b3", name: "B · Broadsheet" },
  { key: "c", name: "Agent-native index" },
  { key: "b1a", name: "B1a · Amended rail" },
  { key: "d", name: "D · Single measure" },
];

function SwitcherInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("variant") ?? "current";
  const index = Math.max(0, VARIANTS.findIndex((v) => v.key === current));

  const go = useCallback(
    (delta: number) => {
      const next = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
      const params = new URLSearchParams(searchParams.toString());
      if (next.key === "current") params.delete("variant");
      else params.set("variant", next.key);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [index, pathname, router, searchParams],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="fixed bottom-4 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-900 px-2 py-1.5 font-mono text-xs text-zinc-100 shadow-xl ring-1 ring-white/20 print:hidden">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="rounded-full px-2 py-1 hover:bg-zinc-700"
      >
        ←
      </button>
      <span className="min-w-44 text-center tabular-nums">
        {VARIANTS[index].key.toUpperCase()} — {VARIANTS[index].name}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next variant"
        className="rounded-full px-2 py-1 hover:bg-zinc-700"
      >
        →
      </button>
    </div>
  );
}

export function PrototypeSwitcher() {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <Suspense fallback={null}>
      <SwitcherInner />
    </Suspense>
  );
}
