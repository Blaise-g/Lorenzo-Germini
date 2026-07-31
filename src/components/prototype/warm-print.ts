// PROTOTYPE — shared Warm Print utility classes for the /writing evidence
// surface. The palette values now live in globals.css; this module keeps only
// the prototype's typography and composition class groups.
//
// Delete with the rest of src/components/prototype/ only when the Phase 2 §2.6
// homepage swap merges.

export const t = {
  page: "bg-ground text-ink",
  meta: "font-mono text-xs uppercase tracking-[0.12em]",
  heading:
    "font-mono text-[15px] font-semibold uppercase tracking-[0.18em] text-accent",
  headingRule: "mt-2 border-t border-current/20",
  accent: "text-accent",
  accentBorder: "border-accent",
  body: "text-body",
  faint: "text-faint",
  masthead: "border-b-2 border-current pb-4",
  projectRule: "border-t-2 border-current/70 pt-4",
} as const;

/* Derived from the resume data so the prototype cannot drift from the shipped
   publication URL. */
import { RESUME_DATA } from "@/data/resume-data";
export const SUBSTACK_BASE = RESUME_DATA.newsletter.url;
