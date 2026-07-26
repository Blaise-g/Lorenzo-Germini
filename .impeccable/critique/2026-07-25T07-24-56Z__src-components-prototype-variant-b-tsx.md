---
target: "/cv decision set (ticket #9) + B1 Warm Print variant"
total_score: 17
max_score: 32
na_heuristics: 9,10
p0_count: 4
p1_count: 3
timestamp: 2026-07-25T07-24-56Z
slug: src-components-prototype-variant-b-tsx
---
# Critique: /cv decision set (ticket #9) + B1 "Warm Print" variant

Method: triple-agent (A: /cv decision review, A2: B1 variant review, B: detector + browser evidence). Isolated assessments.

Two scored surfaces:
- Planned /cv route + entry points (Read mode): 18/36 (h9 n/a) — Acceptable, bottom of band.
- B1 "Warm Print" homepage (Persuade/Read): 17/32 (h9, h10 n/a) — Acceptable, low end.

## Root cause both reviews converged on
The content model. Today: 6 roles x 3 bullets = 18 proof statements + Skills + Education + 2 projects with 5-6 tech tags. B1 + decision 5: 4 roles x 1 bullet = 4 proof statements, Burgeon/Roche collapsed to names, Education reduced to "EPFL MSc", Skills deleted, tech stacks .slice(0,4). Every specific technical noun in resume-data.tsx leaves the homepage because the layout renders description[0], and description[0] for Complaion is the business sentence. Violates the audit's binding constraint ("never look less technical"). NOTES.md:26's defence (mono metadata = technical signal) is a category error: typography signals designed, not technical.

## P0s
1. Real contrast failure is t.faint (opacity-55 -> rgb(128,124,120) on #faf6ef) = 3.84:1, fails AA at 11px, carries every element nominated as the technical signal. Fails LIGHT MODE ONLY (dark = 5.21:1), so the committed dark screenshot hides it. Accent itself is fine: #9c3c1c/#faf6ef = 6.16:1, #d98d63/#171412 = 6.93:1 — the contrast risk recorded in #8 was aimed at the wrong element.
2. Decision 6 deletes the homepage print path. Stripping print: utilities + scoping @media print to /cv leaves Cmd+P on / unhandled: warm paper, 60px hero, grain (no print:hidden), .dark tokens verbatim. Needs TWO blocks — global baseline + /cv-scoped.
3. B1 mobile: rail stacks first, ~380px chrome before <h1>; hero below fold. At 768px, px-10 + 240px rail + gap-16 = 384px main column while md:text-6xl fires — rail and display scale turn on at the same breakpoint. Rail -> lg:, hero -> clamp().
4. window.print() is not the deliverable. Filename from document.title; no @page; no break-inside. B's measured evidence: current print CV = 3 pages, page 2 28% blank, page 3 75% empty, one bullet cut mid-line, 17 elements at 8px ~= 6pt, print:grid-cols-3 with 2 projects. No golden incumbent to preserve. Cheap fixes: title -> Lorenzo-Germini-CV, @page A4 14mm, hint line. Build-generated PDF in public/ is a genuinely different option from the rejected hand-maintained one.

## P1s
- Decision 4's footer has no footer: variant-b.tsx ends inside <main>; zero matches for footer/ThemeToggle/skip link/StructuredData/BackToTop/CommandMenu (so NOTES.md:24 "command menu kept" is false). Page has no ending.
- Section headings (WRITING/WORK/PROJECTS) are 11px mono — smaller than the body they head. Hierarchy inverted.
- Palette as hex literals: focus rings render slate-indigo on terracotta; @media print overrides 17 unused tokens. @theme migration is a precondition, not a follow-up.

## P2s
- Reduced motion broken by omission: globals.css:228 never resets animation-delay; fade-in-up uses both fill mode; 450ms blank projects region. Six staggered regions, 950ms settle.
- z-50 grain worry: DISMISS (Radix portals append after; skip link is z-[100]). Real cost is full-viewport rasterization per scroll frame from fixed + mix-blend-multiply.
- Numbered essay index is positional (String(i+1)), renumbers on publish; realistic launch state is 0-1 essays. readingMinutes defined and never rendered.
- /cv inherits an OG image in the abandoned slate-indigo palette captioned "Full-Stack AI Engineer".

## Deterministic scan
detect.mjs on all critique-path files: exit 0, []. Directory run: 2 gray-on-color in variant-c.tsx:25 (rejected variant; one is a false positive — text-zinc-950 on bg-emerald-400 is high contrast, rule ignores lightness direction).
Overlay, current homepage 1440x900: 32 findings — line-length x20, undersized-ui-text x11 (10px tech badges), overused-font (Inter 94%), pulsing-dot (project-card.tsx:30). B1: 3 findings, all font distribution. B1 is mechanically cleaner and heuristically worse.

## Persona red flags
Marta (Talent Partner, Milan/Turin): no file; education behind an unfound link; 5 skills is not a keyword surface; two-column grid + variable Fraunces + tracking-[0.12em] mono is an ATS-extraction-mangling combination; llms.txt tells crawlers everything, ATS nothing.
Casey (mobile): never sees hero; 16px tap target vs 44pt floor; rail links ~20px apart; serif hero on swap reflows.
Sam (a11y): indigo focus rings; 3.84:1 at 11px; no skip link in VariantB (incumbent's is in page.tsx not layout.tsx, so /cv won't inherit); no theme toggle so dark is unreachable; 450ms missing content.
Riley: dark-mode homepage print; work.slice(4) dangling separator; Contact nav does nothing; EN·IT does nothing; /cv arrived at cold has no way home.

## Minor
project-card.tsx:36 hidden+print:visible is dead (visibility cannot undo display:none) — URLs have never printed. variant-b.tsx:262 normal-case loses to uppercase in t.meta. Earlier: line off by the 24px gap. Fraunces requests opsz only, never SOFT/WONK. llms.txt:7 describes homepage as "Full interactive resume and portfolio" — false after the split. structured-data.tsx hardcodes jobTitle "AI Engineer" and dateModified "2026-04-01". sitemap.ts one entry; /cv needs priority<1; /resume should 301. initials "LG" unused. Grayscale avatar is the only cool element on a warm page.

## Verdict on B1
Ship the treatment with amendments; send back the content model and the grid. Issue #8 answered a palette question while issue #7's layout carried three unexamined structural decisions into a locked state. The three treatments were pixel-cognate — composition was never a variable.
