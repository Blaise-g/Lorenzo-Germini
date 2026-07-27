# Current site audit — gap to product-engineer positioning

_Ticket [#4](https://github.com/Blaise-g/Lorenzo-Germini/issues/4). Snapshot of `main` @ commit 4ebb010. Feeds the phased redesign spec (map [#3](https://github.com/Blaise-g/Lorenzo-Germini/issues/3))._

## The 10-second read (what the site says today)

A visitor landing on `lorenzo-germini.vercel.app` sees, above the fold: name → **"Full-Stack AI Engineer shipping production systems end-to-end across compliance, health, and education"** → location → contact icons → avatar. Scrolling reveals **About → Work Experience → Education → Skills → Projects** — a single-column, print-optimized chronological CV.

The read is: **"A competent AI engineer's résumé."** It is clean, fast, and technically credible. But it is a _document to be read top-to-bottom_, not a hub to be explored.

## The positioning gap

Target positioning (map #3): **product engineer** — technical depth **+** product thinking **+** business strategy — with **essays as a first-class part of his professional identity**.

| Intended signal                           | Present today? | Gap                                                                                                                                                        |
| ----------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product engineer (not "only AI engineer") | ❌             | Hero literally leads with "Full-Stack **AI Engineer**"; product/business framing is buried in About prose and bullet tails.                                |
| Technical depth                           | ✅             | Well conveyed — LLM infra, RAG, evals, full-stack. Keep this.                                                                                              |
| Product + business thinking               | ⚠️             | Stated ("intersection of technical execution, product thinking, business strategy") but never _shown_ structurally — no section, no artifacts, no writing. |
| Writing / essays as first-class identity  | ❌             | Completely absent. No essays, no link to Substack, no "Writing" section. This is the single largest gap.                                                   |
| Central professional hub                  | ⚠️             | Reads as a static CV, not a hub. No content that would bring a repeat visitor back.                                                                        |

**Bottom line:** the site is a strong _chronological CV_ and a weak _professional hub_. The redesign's core job is (1) reframe the top-line identity from "AI engineer" to "product engineer," and (2) introduce writing as a structural, first-class element — without ever looking _less_ technical.

## Section / element inventory

Verdict key: **Retain** (keep ~as-is) · **Reframe** (keep, change framing/copy) · **Condense** · **Move** · **Remove** · **Add** (net-new for positioning).

| Element                           | Where                      | Verdict                | Note                                                                                                                                  |
| --------------------------------- | -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Name + avatar (GitHub avatar)     | Header                     | Retain                 | Consider a hosted/optimized image vs. remote GitHub avatar (see perf).                                                                |
| Tagline "Full-Stack AI Engineer…" | `about` field              | **Reframe**            | Product-engineer voice; lead with product + technical breadth. Copy rewrite is its own ticket.                                        |
| Location + contact icons          | Header                     | Retain                 | Fine.                                                                                                                                 |
| About (2 paragraphs)              | `summary`                  | **Reframe / Condense** | Already gestures at product+business; sharpen and tighten.                                                                            |
| Work Experience (6 roles)         | `work`                     | Retain / Condense      | Content strong. Older internships (Roche, Burgeon) are condense/collapse candidates for hierarchy.                                    |
| Education (2)                     | `education`                | Retain                 | Fine; low prominence is correct.                                                                                                      |
| Skills (5 badges)                 | `skills`                   | **Reframe**            | Only 5 generic badges (Generative AI, LLMs, RAG, Full-Stack, Python) — thin and under-sells breadth; doesn't signal product/business. |
| Projects (2 cards)                | `projects`                 | Retain / **Add**       | Good proof-of-work. Room for more, and a clearer "what I build" narrative.                                                            |
| **Writing / Essays section**      | —                          | **Add**                | Net-new. First-class section + Substack integration (approach is a separate ticket).                                                  |
| Command menu (⌘K)                 | `command-menu`             | Retain                 | Nice-to-have; keep.                                                                                                                   |
| Theme toggle / Back-to-top        | components                 | Retain                 | Fine.                                                                                                                                 |
| Print CV styling                  | extensive `print:` classes | **Decide**             | Print-CV fate is an open map question. Heavy `print:` styling everywhere — keep as PDF export, or drop? Affects markup complexity.    |

## Improvement candidates for the phased spec

Raw candidates only — which land in the spec vs. fold into phases is decided when the phased plan is drafted (per map's Not-yet-specified).

### Information hierarchy & scanning

- Single flat top-to-bottom column reads as a document. Consider a hub layout: hero + intro, then parallel entry points (Work, Writing, Projects) rather than a linear scroll.
- Skills section (5 badges) is disproportionately thin vs. the depth in Work bullets — either enrich or restructure into grouped competencies (e.g. AI/ML, Product, Full-stack).
- Older roles (Roche, Burgeon, Self-Employed teaching) could be collapsed/condensed to sharpen the recency hierarchy.

### Typography & spacing

- Body uses `text-base`/`text-sm` `text-muted-foreground` heavily — long muted paragraphs reduce contrast and scanability. Consider stronger foreground for primary copy.
- `space-y-12` section rhythm is generous and clean; keep as a baseline.
- Single Inter/JetBrains Mono pairing is solid; a distinctive display treatment for the hero could raise "hub" feel.

### Accessibility (a11y)

- **External links open with `target="_blank"` but no `rel="noopener noreferrer"`** (header location link, work links, project card links) — security/best-practice fix.
- Location & work links open in new tab with no visible "opens in new tab" affordance / `aria` hint.
- Muted-foreground body text: verify **WCAG AA contrast** in both themes (`--color-muted-foreground` light `240 5% 38%`, dark `40 5% 55%`) — dark-mode muted on dark card may be borderline.
- Decorative pulse dot on project links (`animate-pulse`) — ensure it respects `prefers-reduced-motion`; likewise the `fade-in-up` entrance animations.
- Skills badges use `cursor-default` + hover color change but aren't interactive — hover styling on non-interactive elements can mislead.

### SEO & metadata

- Metadata is strong: OG image, Twitter card, JSON-LD `ProfilePage` + `WebSite`, sitemap, `manifest`, AI-crawler `robots.txt`, `llms.txt` / `llms-full.txt`. **Retain all of this.**
- Everything derives from `about`/`summary` — when positioning copy changes, metadata, JSON-LD `jobTitle`, `hasOccupation.name` ("AI Engineer" hardcoded), and `llms.txt`/`llms-full.txt` must all be updated in lockstep. Flag as a coupled change.
- `structured-data.tsx` has hardcoded `dateModified: "2026-04-01"` and `jobTitle` fallback — will drift; consider deriving.
- Adding a Writing section → opportunity for `Article`/`Blog` structured data and sitemap entries.

### Performance

- Avatar loaded from remote `avatars.githubusercontent.com` with `priority` — external dependency on GitHub CDN; `preconnect`/`dns-prefetch` already added. Consider self-hosting/optimizing via `next/image` local asset.
- Single static page, App Router, Turbopack — posture is already excellent. No obvious perf debt.
- Entrance animations use staggered `delay-*` fade-in — fine, but gate on reduced-motion.

### Copy / voice (flagged, owned by copy-rewrite ticket)

- Hero, About, and Skills all need the product-engineer reframe. This audit only marks _where_; the rewrite is map "Not yet specified → Copy and messaging rewrite."

## Handoffs this audit unblocks

- Positioning/direction grilling — has a concrete gap table to react to.
- Homepage prototypes — have a retain/reframe/add inventory to build from.
- Phased spec — has the a11y/SEO/perf candidate list to slot into phases.
