// PROTOTYPE — Warm Print tokens (#8), copied verbatim from variant-d.tsx (#12).
//
// variant-d.tsx is #12's evidence artifact and is deliberately left untouched,
// so these are duplicated rather than imported out of it. Values must stay
// identical: the /writing prototype (#13) is only a fair test of #10's
// decisions if the palette is the settled one.
//
// Delete with the rest of src/components/prototype/ only when the Phase 2 §2.6
// homepage swap merges.

import { Fraunces } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});

export const t = {
  page: "bg-[#faf6ef] text-[#1c1917] dark:bg-[#171412] dark:text-[#ece7de]",
  meta: "font-mono text-[11px] uppercase tracking-[0.12em]",
  heading:
    "font-mono text-[15px] font-semibold uppercase tracking-[0.18em] text-[#9c3c1c] dark:text-[#d98d63]",
  headingRule: "mt-2 border-t border-current/20",
  accent: "text-[#9c3c1c] dark:text-[#d98d63]",
  accentBorder: "border-[#9c3c1c] dark:border-[#d98d63]",
  body: "text-[#3f3a35] dark:text-[#c9c2b7]",
  /* #10 constraint 1: the metadata row must NOT use opacity-55 (3.84:1 at 11px,
     AA fail in light mode). Explicit tokens: 6.4:1 light / 6.1:1 dark. */
  faint: "text-[#5c554e] dark:text-[#a49a8e]",
  masthead: "border-b-2 border-current pb-4",
  projectRule: "border-t-2 border-current/70 pt-4",
} as const;

/* #8's one faint grain overlay, copied from variant-b.tsx's warm treatment —
   the object #13 question 1 is about. fixed + mix-blend-multiply across the
   whole viewport, so every cover image is multiplied by it. */
export const GRAIN_URL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

export const SUBSTACK_BASE = "https://lorenzogermini.substack.com";

/* ─── Prototype-only border shim ───────────────────────────────────────────
   globals.css declares `* { border-color: var(--color-border) }` OUTSIDE any
   cascade layer, and Tailwind v4 puts every `border-*` utility inside
   @layer utilities — so the unlayered `*` rule wins on layer order no matter
   how specific the utility is. Measured live: on this route, on the #12
   prototype and on the current production homepage, EVERY bordered element
   computes to the slate `--color-border` (#e8e6e3 light / #25252d dark). No
   Warm Print rule, hairline or terracotta underline has ever rendered.

   The spec fix is to delete that global rule (the `@theme` migration is
   already a spec item). Until then the prototype cannot be judged on its
   intended pixels, so borders are declared here as unlayered rules keyed off
   `data-rule`, which do beat `*` on specificity. Marked, not hidden. */
export const BORDER_SHIM = `
[data-rule="ink"]{border-color:#1c1917}
.dark [data-rule="ink"]{border-color:#ece7de}
[data-rule="ink-70"]{border-color:rgb(28 25 23 / .7)}
.dark [data-rule="ink-70"]{border-color:rgb(236 231 222 / .7)}
[data-rule="hair"]{border-color:rgb(28 25 23 / .15)}
.dark [data-rule="hair"]{border-color:rgb(236 231 222 / .15)}
[data-rule="hair-20"]{border-color:rgb(28 25 23 / .2)}
.dark [data-rule="hair-20"]{border-color:rgb(236 231 222 / .2)}
[data-rule="accent"]{border-color:#9c3c1c}
.dark [data-rule="accent"]{border-color:#d98d63}
[data-rule="field"]{border-color:rgb(28 25 23 / .4)}
.dark [data-rule="field"]{border-color:rgb(236 231 222 / .4)}
[data-rule="field"]:focus-visible{border-color:#9c3c1c}
.dark [data-rule="field"]:focus-visible{border-color:#d98d63}
[data-rule="error"]{border-color:#a32f13}
.dark [data-rule="error"]{border-color:#e8836a}
`;
