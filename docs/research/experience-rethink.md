# Rethinking the site as an experience

Research and proposal, 2026-10-28. Nothing here is implemented. Four rounds of grilling chose
direction A and reshaped it into a path of his life's steps, picked in any order. The flat site at
`/` shows the path in plain HTML. A door in its header leads to `/path`, where each step's small 3D
scene builds on demand (§5). Sections 1–4 are the research that led there. §6 is the later
research, §7 the storyboard, §8 the staged plan, §12 what stays open.

## 0. Purpose, and the bar it sets

Felix Rieseberg's [_Hunger beats tenure_](https://felixrieseberg.com/hunger-beats-tenure-advice-for-junior-engineers/)
(27 Oct 2026) ends on the line this site is being measured against: "I'm scanning resumes and
portfolios for little prototypes that exhibit taste, empathy, and principled thinking." The
essay argues that execution is cheap now ("Execution isn't expensive anymore"), that one good idea
beats "three excellent ideas among 20 bad ones", and that a prototype should "communicate an idea so
well" that the reader understands the opportunity and the builder at once.

Read as a brief for a personal site, that means:

- **Taste.** One idea, carried all the way through, with things left out.
- **Empathy.** For the visitor's time, device, motion settings and attention. The visitor who only
  wants the email address gets it at once.
- **Principled thinking.** It shows in the fallbacks, budgets and honesty of the thing, and the
  site never asserts it.
- **Hunger.** It is visibly more than anyone asked for, and visibly self-started.

## 1. What is known about Lorenzo, and what is not

Tags used throughout this document:

| Tag   | Meaning                                                                               |
| ----- | ------------------------------------------------------------------------------------- |
| **F** | Documented fact, with its source in this repo or tracker                              |
| **P** | Public fact about a place: true, but not his. Not re-verified unless stated           |
| **I** | Interpretation: a reading of the facts that Lorenzo has to accept or reject           |
| **M** | Missing memory: only Lorenzo can supply it. Nothing in the repo or tracker answers it |
| **S** | Stated by Lorenzo in the grilling session (2026-10-28), not yet in the repo           |

### 1.1 Documented facts

| Fact                                                                                                                                                                                                                | Source                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Based in Cuneo, Piedmont, CET                                                                                                                                                                                       | `src/data/resume-data.tsx` `location`; JSON-LD `addressRegion`     |
| BSc Electrical Engineering, Polytechnic of Turin, 2017–2020                                                                                                                                                         | `resume-data.tsx` `education`                                      |
| MSc Life Sciences Engineering (Neuroscience & Neuroengineering), EPFL, 2020–2022                                                                                                                                    | `resume-data.tsx` `education`                                      |
| Roche, Basel, Jul–Oct 2021: personalized-medicine filling prototype through HW/SW integration; gradient-boosted model tuning fill parameters 20% faster than manual                                                 | `resume-data.tsx` `work`                                           |
| Burgeon Labs, Geneva, Feb–Oct 2022: fine-tuned models summarising biomedical literature, the company's first digital health product                                                                                 | `resume-data.tsx` `work`                                           |
| MSc thesis: biomedical paper summariser (detailed analysis or TL;DR), longevity and human-health literature, on Hugging Face                                                                                        | `resume-data.tsx` `projects`                                       |
| Nov 2022–Aug 2023, Cuneo: taught maths and physics "at my old high school"; built a Stable Diffusion + Dreambooth interior-design MVP on a dataset he curated, "killed it on the evidence after customer discovery" | `resume-data.tsx` `work`                                           |
| GSK, Saint-Amand-les-Eaux, France, Sep 2023–Oct 2024: anomaly detection and forecasting on plant sensor data, NLP for fault detection, water-rejection strategy projected to save 10,000 m³ a year                  | `resume-data.tsx` `work`                                           |
| Stealth GenAI EdTech startup, Cuneo, Nov 2024–Apr 2025: founding AI engineer, RAG with parsing for handwritten content, managed two developers                                                                      | `resume-data.tsx` `work`; #95                                      |
| Complaion, Cuneo, May 2025–present: the agentic AI core of an ISO-compliance platform, "and knowing when they're not" reliable                                                                                      | `resume-data.tsx` `work`, `summary`                                |
| Quadrell, his independent studio (websites, automations for small businesses)                                                                                                                                       | `resume-data.tsx` `projects`; #131, #132                           |
| L'Oracolo della Ghigliottina: archived AI companion for the final round of Rai 1's _L'Eredità_, five clues to one word, accepted a photo of the TV                                                                  | `resume-data.tsx` `projects`                                       |
| Speaks English, Italian, French                                                                                                                                                                                     | `src/lib/person-structured-data.ts:54` (hardcoded `knowsLanguage`) |
| Italy described as "Lorenzo's roots"; EN+IT publishing planned                                                                                                                                                      | #6                                                                 |
| "germinai" is Italian for "I sprouted"; the publication mark is a seed sprouting as an open book                                                                                                                    | #53, #57, #72                                                      |
| Interests: sports, side projects, rabbit holes on tech entrepreneurship and biohacking; "I'm a rabbit-hole person"                                                                                                  | `resume-data.tsx` `summary`; #51, #72                              |
| Voice: direct, jargon-light, "no LinkedIn gloss", sceptical of confident advice, "the advice changes every two days anyway"                                                                                         | #52, #55, #72                                                      |
| A studio portrait exists, 4:5 (who took it is not recorded)                                                                                                                                                         | `public/lorenzo-germini-portrait.jpg`; `resume-data.tsx`           |
| **[S]** Grew up in Cuneo: the "old high school" is there. Back in Cuneo now                                                                                                                                         | Grilling round one                                                 |
| **[S]** As a child, loved the Star Wars edition of Monopoly                                                                                                                                                         | Grilling round one                                                 |
| **[S]** The Bisalta is a landmark of Cuneo for him                                                                                                                                                                  | Grilling round one                                                 |

### 1.2 The one structural fact the life already has

The work and study locations run Turin (2017–20), Lausanne (2020–22) with Basel and Geneva during
and after it, Cuneo (2022–23), Saint-Amand-les-Eaux (2023–24), then Cuneo again (2024–now) **[F]**.
These are where the institutions were, not a record of where he lived.

Lorenzo confirmed in round one that he grew up in Cuneo and is back there now **[S]**. So the path
leaves home and returns twice. Reading that as a board-game loop is still an interpretation
**[I]**, but it is one his life supports. **Why** he came back is **[M]**.

### 1.3 Interpretations on offer (each needs a yes or no)

- **[I]** The killed interior-design MVP is the clearest documented instance of "principled
  thinking": he built something and then stopped it on evidence.
- **[I]** The paper-summariser work (Geneva, the thesis) is literally folding a long paper into a
  short one, so paper is native to his work and not only a style.
- **[I]** Water connects several stops: the GSK water strategy **[F]**, the lake at Lausanne and
  Geneva **[P]**, the Rhine at Basel **[P]**, the Po at Turin **[P]**, and "les-Eaux" in Saint-Amand's
  name **[P]**. This is a pattern in geography, not in his memory, and it is only worth using if it
  means something to him.
- **[I]** "Agents in the background, and the evals that show when they can't be trusted" **[F]** is
  a front-of-house/backstage idea. That reading drives direction B below.
- **[I]** Teaching at his own old high school is a return, not a pause.

### 1.4 Missing memories (the blocking input)

Nothing in the repo or the 140 issues gives any of these:

- ~~**Hometown.**~~ Answered in round one: Cuneo **[S]**.
- ~~One object, image, sound or habit per stop.~~ Replaced in round one by one landmark per stop,
  with no photos.
- **[M]** **Sport.** Which one; nothing says.
- **[M]** **Leaving and returning.** Why he left each time, and why he came back.
- ~~**Handmade work.**~~ Ruled out in round one: all scenes are 3D.
- **[M]** **Rabbit holes.** Which ones mattered.
- ~~**Cultural ties.**~~ Answered in round one: not the gioco dell'oca, but the Star Wars
  edition of Monopoly **[S]**.
- **[M]** **Work evidence.** What customer discovery showed before he killed the interior-design
  MVP, and anything shareable from each role. Lorenzo offered to supply more.

The search that found nothing covered the repo, `docs/`, and the titles and comments of the 140
issues and PRs. It didn't cover his Substack, LinkedIn or anything private.

## 2. The current site, and which decisions to reopen

**What exists.** `/` is a hub of Hero, Writing, About, Work, Projects and Systems. Alongside it sit
`/cv` (which generates a PDF), `/writing` (live Substack, n=1), markdown siblings and `llms.txt`.
On desktop the hub has a 220px sticky rail, which became a "road with stops" route map in #138; on
mobile a fixed route bar takes over (#140). The palette is Warm Print: paper ground, ink, one
terracotta (ADR-0001). Type is Fraunces, Inter, Space Grotesk and JetBrains Mono (ADR-0006).
Motion is one reveal per section, opacity-only under reduced motion (#139). The spec is
owner-signed with "every design decision locked", reopenable by explicit owner decision.

**What already points this way.** The rail is a route with stops, and Warm Print is paper. A board
or paper world extends both rather than discarding them.

| Constraint                                                                                     | Source                                      | A Board               | B Theatre                | C Notebook | If the experience lives on a separate route                                                                      |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------- | ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Spec "every design decision locked"                                                            | `docs/spec/redesign-implementation-spec.md` | reopen                | reopen                   | reopen     | Homepage clauses can stay locked                                                                                 |
| First screen: ≥3 technical terms and a named system at 375 and 1440                            | `tests/homepage-fold.spec.ts`, #12          | hard                  | hard                     | soft       | Applies only to `/`                                                                                              |
| Retained proof: 46 terms must stay visible across `/` and `/cv` combined                       | `docs/spec/retained-proof.json`             | keep                  | keep                     | keep       | Survives any homepage if the terms stay visible somewhere on the two routes                                      |
| "Never less technical-looking"                                                                 | #3                                          | hard                  | medium                   | low        | Still governs the hub                                                                                            |
| No continuous motion; WebGL not authorized; Ambient Current deferred on _quality_, not metrics | spec decision 10, #11, #27                  | retire                | retire                   | keep       | Retire for the experience only                                                                                   |
| Reduced motion = opacity-only                                                                  | #139                                        | revise                | revise                   | keep       | A designed reduced-motion version replaces opacity-only                                                          |
| Seven colour roles, accent never a large fill, three token sets                                | ADR-0001                                    | revise                | revise                   | keep       | A scene palette layer would need a new ADR, not an exception                                                     |
| Design-system guard: no colour literals in `src/`                                              | ADR-0004                                    | medium                | medium                   | low        | Baked textures and GLB files sit outside `src/`; shader colours do not                                           |
| Fonts: Fraunces / Inter / Space Grotesk / Mono                                                 | ADR-0006                                    | medium                | medium                   | medium     | Route-specific lettering needn't touch the CV or OG cards; changing shared type has broken PDF extraction before |
| Fixed controls may not cover content; nothing fixed without margin to sit in                   | ADR-0003                                    | medium                | low                      | low        | A HUD or bottom sheet needs an explicit rule for not covering content                                            |
| Sticky rail + scroll-spy as the desktop navigation                                             | #12, spec §2.2                              | replaced by the board | replaced by the playbill | keep       | Hub keeps it                                                                                                     |
| AA contrast, 24/44px targets, focus ≥3:1, first focusable in first viewport                    | spec §accessibility                         | keep                  | keep                     | keep       | Non-negotiable everywhere                                                                                        |
| 12px floor for faint text; no visual reordering (`order-*`, `*-reverse`); link names ≤80 chars | ADR-0001, spec                              | keep                  | keep                     | keep       | Tiny board labels and a looping layout collide with these                                                        |
| One `contentinfo` per route; each shell owns its landmarks                                     | ADR-0002                                    | keep                  | keep                     | keep       | A new shell must own its own                                                                                     |
| `/cv` and the PDF untouched; ≤2 pages                                                          | spec, #74                                   | keep                  | keep                     | keep       | Unaffected                                                                                                       |
| Identity surfaces in lockstep (8 hand-maintained)                                              | GLOSSARY "Identity surface"                 | keep                  | keep                     | keep       | New taglines must land in all eight                                                                              |
| Content in data modules; markdown siblings generated; `llms*.txt` hand-maintained              | AGENTS.md, ADR-0005, GLOSSARY               | keep                  | keep                     | keep       | Stop copy goes in a data module; the manifests are updated by hand                                               |
| Cache Components: runtime reads inside `<Suspense>`                                            | AGENTS.md                                   | low                   | low                      | low        | A client island; the board's HTML can stay static                                                                |
| The Playwright suite: 386 tests in 26 files (`playwright test --list`)                         | `tests/`                                    | unknown               | unknown                  | unknown    | No inventory yet of which tests a new `/` breaks                                                                 |

Round one put the board on `/` (§5), so the "separate route" column no longer applies. It is kept as
the record of the comparison.

## 3. References, and what each one teaches

Inspected live on 2026-10-28 in headless Chromium (desktop, iPhone 14 emulation, reduced-motion
where noted). **O** = observed, **I** = inferred from code or reading, **R** = reported by a source.
Page weights are lower bounds from `Content-Length` on a warm-cache load. Mobile checks ran on a
desktop GPU and say nothing about phone frame rates.

**Caveat, found in round three.** A site can tell it is being driven by automation
(`navigator.webdriver`) and show it a different page. Felix Rieseberg's does: it skips its enter
gate and its tape cycle for automated browsers (below). Any site here inspected headless may have
hidden a gate the same way.

### Personal sites built as worlds

**felixrieseberg.com.** A 90s journalist's room at night in Berlin, rendered in WebGL2.

- **Arrival.** A baked still paints first and the live room replaces it within seconds, with the
  name and nav in an HTML HUD **[O, automated]**. Real visitors most likely get a "CLICK TO ENTER"
  gate on the CRT first: it appears with `?gate=1` **[O]**, and the code skips it whenever
  `navigator.webdriver` is set **[I, from `desktop.js`]**.
- **Navigation [O].** Each section is a machine suited to its content:
  - Work is a handwritten legal pad, and choosing an entry plays its VHS tape (§6.6 has the
    detail: a tape is a small drawn program, not a video).
  - Posts are a teletext service, with ↑↓, Enter and ←→ keys.
  - About is a `less` pager on a CRT.
  - Online is a modem dial into a BBS.
- **URLs [O].** Every view has a real URL (`/#work`, `/about-me/`). A post opens as a plain reading
  page, and Back returns to the room.
- **The fallback ladder.** This is the lesson.
  - **[I]** Without WebGL2, or on a software renderer, a static page with an explanatory note
    replaces the room. The note was added after the Hacker News launch hung machines.
  - **[O]** It ships a LO-FI switch, `?reading=1` and `?plain=1`.
  - **[O]** Every 3D view has an accessible DOM region of real buttons and links.
  - **[I]** Under reduced motion, camera flights become cuts.
- **Sound.** Fully diegetic: rain, S-Bahn, VCR, CRT. It looked off by default under automation
  **[O]**, but the gate shows a Sound switch that starts **on** **[O, `?gate=1`]**.
- **Weight [O].** About 31 MB on desktop: 22 MB of baked JPEG lightmaps, about 2 MB of JS, plus
  6.5 MB of audio after opt-in.
- **Gap [O].** No email anywhere.
- **What it teaches.** The objects tell the biography: there is no "about me" hero line. Plain
  links always beat exploration. The trust comes from the fallbacks more than from the 3D.
- **Making-of.** In [_Made by mechanical means_](https://felixrieseberg.com/made-by-mechanical-means/)
  he describes about 60 Claude threads, 25 brainstorm sites, Blender driven by about 3,000 lines of
  Python, baked Cycles lighting, and "No PRs were made." **[R]**
- **For this proposal.** The making-of is part of the portfolio piece.

**bruno-simon.com.** Drive a toy truck around an island.

- **[O]** A hamburger panel holds plain-text intro content. A map button shows the island from
  above with about 15 waypoints you can jump to.
- **[O]** 6.7 MB or more, including a 1.7 MB physics WASM, with about 2 MB of looping audio
  downloaded before any consent. The two DOM buttons have no accessible names.
- **Teaches.** A world needs a map so people can skip the journey. Gate audio _downloads_, not
  just playback.

**henryheffernan.com.** A 3D desk and CRT running "HeffernanOS". Inspected in depth, with source
read from public sourcemaps and two public repos:
[portfolio-website](https://github.com/henryjeff/portfolio-website) (MIT) and
[portfolio-inner-site](https://github.com/henryjeff/portfolio-inner-site).

- **Arrival.**
  - **[O]** A fake BIOS log on black lists the assets as they load, then a "Click start to begin
    [START]" popup appears within about 1.5 s.
  - **[O]** After START, the camera orbits the desk and "Click anywhere to begin" types itself in:
    a second gate.
  - **[O]** START is not a load gate: about 12.6 of 13.0 MB is fetched before it, including all
    the audio and two MP4s.
  - **[I]** What START really unlocks is the AudioContext.
- **Technique.**
  - **[I]** The monitor is a live 1280×1024 iframe placed in 3D with `CSS3DRenderer`, not a
    texture. An invisible WebGL plane cuts a hole so the desk can occlude it.
  - **[I]** Layered over the glass: a smudge texture at 12%, an inner shadow, and the two MP4s as
    additive glare and scanlines. A noise shader covers the whole viewport.
  - **[I]** Lighting is baked in Blender into about 2.7 MB of JPGs. three 0.137, tween.js, and a
    React HUD.
- **Navigation.**
  - **[O]** Hovering the monitor dollies the camera into it; moving off pulls back.
  - **[O]** Inside, a Win95 desktop has a Showcase window (About, Experience, Projects, Contact),
    plus games (Doom, Oregon Trail, Scrabble in js-dos, and a Wordle clone).
  - **[O]** The parent URL never changes, and `/experience` returns 404.
  - **[O]** A working 2D version with real deep links exists at `os.henryheffernan.com`, linked
    from nowhere.
- **Sound.**
  - **[I]** On by default after START, and the mute choice isn't persisted.
  - **[I]** The design is the best of the set: the office ambience is low-pass filtered by camera
    distance, so the room muffles as you zoom into the screen; key and mouse clicks are
    positional, with random variants.
- **Discovery [O].** "Shut down" fails with a typed log, then reboots, and ten escalating scripts
  follow.
- **Access.**
  - **[O]** START is a `div` with no `tabIndex`, so the keyboard can't pass it.
  - **[O]** The HUD and social buttons have no names, and the screen reader hears
    "abcdefghijklmnopqrstuvwxzy" four times from font-preload spans.
  - **[O]** Once inside, the iframe's own HTML is keyboard-navigable and well structured.
- **Reduced motion [I/O].** Not handled anywhere: the camera tweens and a looping CSS jitter on
  the iframe are unguarded.
- **Fallback [I].** Without WebGL, an error popup and nothing else. There is no `noscript`.
- **Mobile [O].** 390 px gets the same 12.6 MB, and the in-monitor text is about 3–5 CSS px.
  Below 768 px a "best viewed on a desktop" warning appears.
- **Teaches.**
  - Glass is a material made of cheap layers (smudge, glare, noise), not expensive geometry.
  - Sound that responds to camera distance makes space audible.
  - One diegetic object can carry a whole identity.
- **And the pitfalls.** Two gates, no URLs, no reduced motion and a keyboard-locked start. A good
  2D site exists but is hidden, where Felix advertises his. It is also still 2022 content: a world
  is expensive to update, so it goes stale.

**messenger.abeto.co.** A cel-shaded tiny planet.

- **[O]** Loading is staged: a title card with "Begin", then a hand-drawn envelope loader covers
  the heavier load. One line of dialogue sets up role and goal ("I better start today's
  deliveries"). There is one ambience loop per zone.
- **[O]** 5.5 MB of audio is fetched before Begin. The accessibility tree is empty, and Begin
  exists only on the canvas.
- **Teaches.** A loader can work like a theatre curtain, and one ambience per place works well. It
  also shows what not to do with accessibility.

**lynnandtonic.com.** 19 yearly redesigns since 2007, all archived with case studies.

- **[R]** The 2020 header was "folded like paper" and creased as the window resized. Lynn used
  `skewY` with shading instead of `perspective`, because 3D transforms were "much more dynamic on
  resize than I wanted". Each fold state was drawn so the sentence stays legible.
- **Teaches.** Paper folds on the web are cheaper and steadier as 2D skews. Change the costume and
  keep the skeleton.

**joshwcomeau.com.**

- **[O]** A named "Disable sounds" button, repeated in the footer, toggles to "Enable sounds" and
  persists in `localStorage`.
- **Teaches.** Sound is a stored preference with a real control. Copy the control and flip the
  default to off.

### The October 2026 batch shared on X

Eight 3D portfolios posted on X after Felix's launch (14 Oct), passed to us as a summary of about 25
posts. They were inspected live on 2026-10-28 in headless Chrome at 1440×900, at 390 px, and with
reduced motion on. X metrics were read through the fxtwitter API. Weights are cold-cache and
unthrottled.

**Caveat.** `/tmp` was wiped mid-run, so some of the phone and reduced-motion screenshots behind
these findings no longer exist.

**How the summary's claims held up.**

- **Popularity was overstated for half the list.** Zhee (312 likes) and fleetingbits (174) hold.
  Paolo, Zilu, Jimmy and Juan had 1–6 likes and 71–430 views, and Muzli's post had 2 likes.
- **Bruno Simon's quote holds:** "might be my new favorite portfolio of 2026". Its context is his
  Three.js Journey selection, so Lyo is a student of his course.
- **"Built with Claude" appears on a site only once:** Paolo's Projects board. For fleetingbits and
  Zilu it is in the X post only.
- **Felix credited as inspiration:** only in Zilu's post, which quote-tweets him. Nothing on any of
  the eight sites mentions him.
- **Jimmy credits Henry Heffernan on the site.**

**zheeportfolio.netlify.app.** A film backlot for a motion designer, toured with a voiced avatar.

- **[O]** The h1 and a live 3D street paint in about 150 ms, with two choices: "Press Start" and
  "Skip it, show me the portfolio".
- **[O]** Below the game, the same document is a complete HTML portfolio with Work, Process, About
  and Contact.
- **[O]** 4.6 MB loads before the gate, almost all of it billboard sprite atlases (so the "films" on
  the billboards aren't video).
- **[O]** All 1.6 MB of audio downloads only after Start, the one site in the batch that defers it.
- **[O]** Hand-written WebGL2 with no library. Without WebGL, the start button becomes "Open the
  portfolio".
- **[O]** Reduced motion freezes the DOM effects but not the 3D tour.
- **Teaches.** The world can sit on top of a complete document, with heavy media loaded only on
  consent. It is also the closest match between metaphor and job (a filmmaker's backlot).

**fleetingbits.io.** Philip Johnson's Glass House as a stippled pen-and-ink estate.

- **[O]** No gate. The 3D house costs only 0.52 MB, with geometry built in code, but 4.1 MB of cat
  photos are preloaded.
- **[O]** Phones are redirected to `/phone/`, a separate build of pre-rendered video and AVIF stills
  (2.5 MB, no WebGL), though it drops two of the four sections.
- **[O]** No name or role anywhere, and the places in the house are 3D-only, absent from the
  accessibility tree.
- **[O]** The map doesn't navigate (a code comment says "the map is for looking").
- **[O]** No reduced-motion handling and no audio.
- **Teaches.** An ink-and-stipple material is cheap and unmistakable. A pre-rendered phone build
  is a real alternative to live 3D. Borrowed architecture with no identity is the pitfall: it is
  memorable and says nothing about who made it.

**longhoang-lyo.com (Lyo).** A toy tank in a construction-site city, three.js WebGPU with Rapier
physics.

- **[O]** A "LET'S GO" gate, with 10.3 MB loaded before it, 4 MB of that audio. Sound is on by
  default.
- **[O]** Real routes, the best in the batch. `/work/hanzii`, `/about` and `/contact` each serve
  their own title, and a deep link opens the case study without the game.
  - "Skip gameplay" has its own URL.
  - `/map` fast-travels to every section.
  - A visually hidden index (name, role, work links, email) and a full `<noscript>` block serve
    crawlers and screen readers.
- **[O]** The loading copy pre-empts the AI charge: "Think this was just an AI prompt, huh? Think
  again! … 2300+ hours".
- **Teaches.** A game shell can have crawlable, deep-linkable case-study routes and a fast-travel
  map. Sighted visitors still see only the gate, and the tank has little to do with a designer of
  ed-tech products.

**daikifujita.com (via the Muzli page).** A "Wake" scroll site and a "Dream" flying game ("Sites
for waking. Worlds for dreaming.").

- **[O]** A black "[ ENTER ]" screen with no apparent reason. It stays up on phones and under
  reduced motion.
- **[O]** CLS 0.37. Hash anchors only, and case studies open as overlays without URLs.
- **[O]** The banner's accessible name concatenates into one string, and a heading reads out as
  spaced letters.
- **[O]** Sound is generated entirely in code with WebAudio: no audio files at all.
- **Teaches.** A persistent read/play switch, and audio with zero download cost. The rest is a list
  of pitfalls.

**paolodelucia.com.** Drive a Porsche 911 through downtown Toronto, built from the city's open
data. "Why a drivable Toronto? Toronto is home."

- **[O]** About is at Union Station, Projects at the Royal York, Leadership at Royal Bank Plaza, and
  Work at Brookfield Place: a timeline up Bay Street.
- **[O]** The data is credited: City of Toronto and Ontario open data (OGL), OpenStreetMap and
  Ontario LiDAR.
- **[O]** The changelog records the hand work behind "real data": one tower missing from the
  dataset was modelled by hand, Front Street was rebuilt from his own photos, and a curb from Street
  View.
- **[O]** Since v2.1 (25 Oct), `/` is a server-rendered page with name, role, work, projects and a
  mailto, and the drive is behind a "Drive it" button. The X post (23 Oct) went out when `/` still
  opened into the drive **[I, from the changelog]**. He moved the world behind the document within
  three days of launch.
- **[O]** Weights: `/` is 515 KB with reduced motion and 420 KB on mobile. The drive is 8.2 MB (a
  4.8 MB Draco city).
- **[O]** Touch devices are redirected away from `/drive`.
- **[O]** Reduced motion cuts the camera flights and shader animation.
- **[O]** The engine sound is synthesised with Web Audio, and the AudioContext starts on the first
  key press. Finding all four sections lights a beam from the CN Tower.
- **Teaches.** It is the closest precedent for a site built on the author's real places:
  - One tightly scoped area, with each landmark mapped to one section.
  - Real data still needs hand modelling from your own photographs, and that hand work is where it
    becomes his.
  - The data licence credit is part of the craft.
  - The changelog is the best first-hand source in the set on why the world moved behind the
    document.

**ziluwang.com.** Tao Yuanming's _Peach Blossom Spring_: a boat through a blossom grove into a
village where lantern-holding villagers each stand for a section ("The lanterns in the village
remember these things for Zilu").

- **[O]** The page HTML is an empty shell, then a gate: "Enter with sound" or "Enter muted".
- **[O]** About 26 MB of models loads before the gate (about 8 MB on phones).
- **[O]** No URLs, no reduced-motion handling (petals kept falling), and a canvas-only
  accessibility tree.
- **[O]** A complete bilingual text CV with a mailto exists at `/text.html`. It is reached only
  through the no-WebGL redirect and `noscript`.
- **[O]** Bilingual subtitles are announced in an aria-live region.
- **[O]** About 12 analytics beacons per visit report device memory, CPU cores and network type.
- **Teaches.** A borrowed cultural form gives a site an arrival, a motif per section and an ending
  for free. That is the strongest argument for a gioco dell'oca. But the form is shared heritage,
  not biography, and the site never says why this tale belongs to him.

**cyyeh.github.io (Jimmy Yeh).** His desk in about 1 MB: walnut desk, monitor, MacBook, a DGX
Spark, a Reachy Mini robot and a ukulele. That it is his real desk is **[R]** only, and the repo
isn't public.

- **[O]** No model files: the furniture is built in code.
- **[O]** A boot log, then a click gate.
- **[O]** The portfolio runs as live DOM inside the monitor (CSS3D, Henry's technique, credited on
  the site). Inside it the URL updates (`/os/contact`).
- **[O]** Reduced motion is honoured: the camera arrives in 600 ms instead of about 4 s.
- **[O]** 12 languages. Synthesised fan noise, reverb and ukulele, on by default after the click.
- **Teaches.** Personal objects make a credible metaphor at a tiny weight. A double gate and an
  empty HTML shell undo the rest.

**jcoc611.com (Juan Osorio).** A plain Jekyll page in front of one full-screen ray-traced black-hole
shader, a metaphor for the AI "singularity".

- **[O]** No gate. Name, nav and the h1 are in the first paint, in 596 KB.
- **[O]** The shader is careful:
  - 30 fps cap, scaled to the device, paused off-screen or in a hidden tab.
  - Reduced motion renders one still frame.
  - A CSS gradient replaces it if WebGL fails.
  - `role="img"` with a label, and a skip link.
- **[O]** The email is withheld on purpose ("guess my email").
- **Teaches.** One cheap, spectacular hero in front of a plain document passes every access test.
  The image illustrates a pun, not a life.

### Web pieces

**neal.fun/deep-sea.**

- **[O]** Scroll is physical distance. A fixed depth gauge reads "228 meters deep", with zone
  titles and a darkening ground.
- **[O]** The creature labels are absent from the accessibility tree.
- **Teaches.** One persistent gauge makes a long linear journey legible. That is the board's square
  counter.

**origamisimulator.org.**

- **[O]** One "Fold Percent" slider drives the whole model from flat to folded. A Pattern tab shows
  the crease pattern behind it.
- **Teaches.** Make every transition a single 0–1 value. Scroll, keys or a timer can drive it, and
  reduced motion can jump it straight to 1.

### Paper, print and theatre

**Penn Museum, _Giuoco dell'oca_, Florence, Eduardo Ducci, c. 1894**
([obj. 17370](https://collections.penn.museum/collections/object/286990)).

- **[O]** A spiral of squares 1 to 63 that ends at the centre. Special squares are pictures, not
  words, and the centre panel ("OTTAVA") holds the rules.
- **Teaches.** The board's centre is where the classic form puts the explanation. On a site, that
  is the about and contact panel.

**Bruno Munari, _I Prelibri_ (Danese, 1979–80).**

- **[R]** Twelve wordless books for children who can't yet read, in paper, felt, wood and plastic,
  with die-cuts and a sewn-on button.
- **Teaches.** The material is the content. Each place can change material instead of adding text.
  Being Italian doesn't make Munari Lorenzo's reference. That takes a connection, and none is
  recorded.

**Pollock's toy theatres (London, from 1877).**

- **[R]** Printed sheets: a proscenium, wings and backdrops slotted between rails, and card actors
  on tin slides pushed on from the wings.
- **Teaches.** A fixed frame with swappable scenery is cheaper and less disorienting than a roaming
  camera.

**Compagnia Carlo Colla & Figli (Milan, since 1861); Museo della Marionetta / Teatro Gianduja (Turin).**

- **[R]** The Colla workshops make the scenery, sculpture and costumes in-house. The Turin
  collection has over 5,000 pieces.
- **Teaches.** The workshop is part of the show.
- **Caveat.** This is Piedmontese and Lombard heritage **[P]**. Whether it is _his_ is **[M]**.

**Museo Nazionale del Cinema, Mole Antonelliana, Turin (François Confino, 2000).**

- **[R]** A helical ramp "unrolls like a film strip" into the dome, with views back down into the
  central hall.
- **Teaches.** On a spiral, you can see where you have been. That is the oca board stood upright,
  in the city where he studied **[F]**. Whether he has been there is **[M]**.

**Cooper Hewitt Pen.**

- **[R]** Visitors collect objects in the gallery and read them later at a URL printed on the
  ticket. About 30% came back to it. One reviewer couldn't page past their 66th item.
- **Teaches.** "Collect now, read later" works, but only if the later surface holds up.

### Games (reported; none played for this research)

- **Unpacking (Witch Beam, 2021).**
  - **[R]** A life told across several homes through about 1,000 objects and no text. The story is
    linear on purpose.
  - **Teaches.** Recurring objects carry biography better than captions. This is the strongest
    model for the stretch target.
- **Florence (Mountains, 2018).**
  - **[R]** Speech bubbles are jigsaws: they need fewer pieces as the couple grows closer, and the
    pieces turn jagged in arguments.
  - **Teaches.** The verb carries the meaning, so a die roll has to _mean_ something or it becomes
    a toll.
- **Lumino City (State of Play, 2014).**
  - **[R]** About 3 m of real paper-and-card city, lit and photographed.
  - **Teaches.** Photographed physical sets can stand in for realtime 3D. That is the mobile plate
    strategy.
- **Paper Mario: TTYD.**
  - **[R]** Battles happen on a stage with a curtain and an audience that grows. The game is
    structured in chapters and intermissions.
- **Tearaway.**
  - **[R]** Printable papercraft templates leave the game and enter the real world.
- **Monument Valley 3.**
  - **[R]** Each interaction is meant to "feel musical, like a note played in a larger
    composition".
  - **Teaches.** Interaction sounds can work as notes in a score instead of effects.

### Gaps declared, not covered

The research did not reach:

- Return of the Obra Dinn and Inscryption (diegetic UI)
- Neapolitan presepi
- Sabuda and Reinhart pop-up engineering
- Lotte Reiniger
- Atelier Brückner
- Pudding and NYT scrollytelling
- Robin Payot, Jesse Zhou, Lusion, Igloo

For direction A, Sabuda/Reinhart matter most, then the presepe.

### What the references agree on

Across the twelve world-style portfolios inspected (Felix, Bruno Simon, Heffernan, Abeto and the
X batch):

1. **The first-paint test.** Name, role, work and contact visible in the first paint, in real HTML,
   with no gate.
   - **Pass:** Juan Osorio (a document with a hero shader), and Paolo De Lucia, but only since he
     moved the drive behind his front page.
   - **Close:** Zhee (a complete document under the game, but a start screen fills the first
     viewport).
   - **Gated for people, open for automation:** Felix. HUD links at once under automation, but
     real visitors most likely meet "CLICK TO ENTER" first, and there is no email anywhere.
   - **Present for crawlers and screen readers only:** Heffernan and Lyo. The content is in the
     HTML, but sighted visitors see a gate first.
   - **Fail:** Bruno Simon, Abeto, Zilu, Jimmy, Daiki and fleetingbits.
2. **Every immersive site grew an escape hatch and a list of its places.**
   - Escape hatches: Felix's `?plain=1` and LO-FI, Paolo's READ link, Zilu's `text.html`, Jimmy's
     `/os/`, Heffernan's unlinked `os.` subdomain, Lyo's skip route and fleetingbits' `/phone/`.
   - Lists of places: Bruno's map, Paolo's Index, Zilu's Map, Lyo's `/map`.
   - The better sites advertise the hatch. The weaker ones hide it.
3. **Weight.** The live 3D sites load 4.4–31 MB before or at the gate. The light end is
   fleetingbits' 0.5 MB house and Jimmy's 1 MB desk (both built in code), and Juan's 0.6 MB shader.
4. **Sound.** Most sites turn it on by default after the first gesture.
   - Only Zhee defers the audio download to an opt-in. Felix's Sound switch starts on (corrected
     in round three).
   - Paolo, Jimmy and Daiki synthesise sound in code, so it costs no download.
5. **Reduced motion is the most neglected setting.** Only Felix, Paolo, Jimmy and Juan handle it in
   the 3D layer, and Felix only partly: camera flights become cuts, but his tapes still play
   (§6.6).
6. **Metaphors split into two kinds.**
   - **The author's own place or objects:** Felix's room, Paolo's city, Jimmy's desk, Zhee's
     backlot for a filmmaker. These read as someone's.
   - **Borrowed forms:** Zilu's tale, fleetingbits' Glass House, Lyo's tank, Juan's black hole.
     These are memorable and anonymous.

   This is the stretch target's problem in miniature. A gioco dell'oca is a borrowed form, and
   becomes his only through what is placed on its squares.

## 4. Three directions

All three are tested against the same four questions:

1. **Direct access.** Are name, role, Work, Writing, CV and Contact in the first paint, in real
   HTML, with no gate?
2. **Mobile without WebGL.** Is the fallback the same content, not a lesser page?
3. **No memories.** Could it ship from the documented facts alone, if Lorenzo supplies nothing
   personal?
4. **Chance vs principle.** His copy says "killed on the evidence". Does the form imply luck where
   his story says judgement?

The directions differ by their **core verb**, not by material. All three could be made of paper.

### A. Il Gioco: a printed board that unfolds into scenes

**Thesis.** His life may already have the shape of a gioco dell'oca: a path that returns to Cuneo
(one documented return **[F]**, a second if Cuneo is home **[M]**) and ends at the centre, which is
now. The board is both the story and the
sitemap.

**Verb: _move_.** The visitor advances a token square by square. A square, once landed on, rises
into a pop-up scene.

**Visual language.**

- The base is a printed board on paper, in the Ducci-era idiom: a spiral, numbered squares,
  pictures instead of words on special squares, and the rules in the centre.
- Squares rise as paper-engineered pop-ups, flat card with V-folds and pull-tabs, lit like a
  tabletop.
- Warm Print survives as the paper and the ink. Each place adds one material in the Munari sense:
  felt, tracing paper, blueprint, card.

**Navigation.**

- The board _is_ the map: every square is a link, visible from the first paint. That is Bruno
  Simon's waypoint map, made primary.
- The die is optional. "Go to square" always works, and the arrow keys walk the path.
- The centre panel is the rules: name, role, his working principles, and Work, Writing, CV and
  Contact.

**References.** Penn/Ducci board, Bruno Simon's map, Origami Simulator's single fold value,
Sabuda/Reinhart (not yet researched), Unpacking, Tearaway's printable papercraft, the Mole's
spiral.

**Against the four tests.**

1. Direct access: **passes by construction.** The board is an HTML/SVG page before it is anything
   else.
2. Mobile without WebGL: **passes with work.** The spiral unrolls into a vertical path, and pop-ups
   become pre-rendered plates. (The current mobile route bar is horizontal, so this is new layout,
   not reuse.)
3. No memories: **weakest of the three.**
   - A square named after a city needs something _from_ that city.
   - Without memories, each scene falls back to its documented work object, with public scenery
     behind. That is honest, but generic.
4. Chance vs principle: **a real tension.** The die implies luck. The proposal resolves it by making
   the die a toy and the path a choice, and by putting his principles in the rules panel. The
   special squares (below) are where it gets dangerous.

**Tradeoffs.**

- It has the strongest Italian identity and the strongest navigation story of the three. It extends
  the shipped route map.
- It needs the most asset production (one pop-up per stop) and the most personal input.
- The classic squares carry meanings (inn, well, prison, death) that could misread a career if
  mapped carelessly.

### B. Teatrino: one stage, changing scenery, and a backstage

**Thesis.** His job is agents that work in the background and the evals that show when they can't
be trusted **[F, summary]**. The site is a toy theatre in which every scene has a backstage, and the
backstage is where the proof lives **[I]**.

**Verb: _reveal_.**

- A curtain rises on each act, and scenery flats slide in from the wings and fly down.
- At any time, "Backstage" turns the stage around. You see the backs of the flats, with their
  labels and tape, and the rigging is the technical substance: stack, evals, numbers, the killed
  MVP's evidence.

**Visual language.**

- A fixed proscenium is the site chrome: name, nav and contact live in the arch and never move,
  following Pollock's.
- Layered card flats give 2.5D parallax, and cut-out figures are optional.
- The house is warm and dark, and stage light picks out the scene.
- The backstage side is bare board, pencil marks and gaffer tape.

**Acts (proposed, from the documented periods).**

| Act       | Content                                                  |
| --------- | -------------------------------------------------------- |
| I         | Studies: Turin, Lausanne                                 |
| II        | Industry in Switzerland: Basel, Geneva                   |
| Interlude | Back to Cuneo: classroom, and the MVP killed on evidence |
| III       | Saint-Amand                                              |
| IV        | Cuneo, now                                               |

The playbill (_programma di sala_) is the sitemap.

**References.** Pollock's, Colla, Paper Mario TTYD's stage and intermissions, Abeto's
curtain-loader, Monument Valley's notes, Felix's "every machine suits its content".

**Against the four tests.**

1. Direct access: **passes.** The proscenium arch is HTML chrome from the first paint.
2. Mobile without WebGL: **passes with a real compromise.** A proscenium is landscape, so portrait
   phones get a tall, narrow stage and a lot of letterbox.
3. No memories: **passes moderately, on one condition.** The props can all be documented work
   objects. But the backstage needs evidence the repo doesn't record, such as what customer
   discovery showed and the numbers behind each result. It depends on new input as much as A does;
   the input is work evidence instead of personal memory.
4. Chance vs principle: **passes.** Nothing in theatre implies luck. The backstage is principle
   made visible.

**Tradeoffs.**

- This thesis connects most tightly to what he does professionally, and it needs no WebGL: CSS
  transforms on layered images are enough.
- The backstage doesn't satisfy the first-screen check, because proof revealed after turning the
  stage around isn't on the first screen. The proscenium would still have to carry the technical
  terms and a named system.
- Theatre implies performance, which has to be held against the "no LinkedIn gloss" voice.
- Marionettes risk borrowing Piedmontese heritage that may not be his **[M]**.
- The backstage overlaps C's "show your working": B exposes process _spatially_ (behind the set), C
  _on the page_ (crossings-out). Pick one; they don't stack.

### C. Quaderno: show your working

**Thesis.** He taught maths and physics at his old high school **[F]**, and the habit an Italian
maths teacher drills in is _mostra i passaggi_: show your working **[I]**. Each role is a problem
written on squared paper: given, unknown, working, result.

**Verb: _work out_.**

- Scrolling turns pages, and focus or hover brings out margin notes.
- Stopped work stays on the page, struck through in red pen and annotated: the interior-design MVP,
  its evidence, the decision. Striking through has to read as a decision, not a mistake.
- The red pen is the existing terracotta accent.

**Visual language.**

- _Quaderno a quadretti_: a 5mm grid, a pencil hand for working and ink for results.
- Diagrams are drawn, not rendered.
- The only 3D is a page curl.

**References.** Munari (material as content), Lynn Fisher's paper folds in `skewY`, Felix's
handwritten legal pad, Neal's single gauge (a page count).

**Against the four tests.**

1. Direct access: **passes trivially.**
2. Mobile without WebGL: **passes trivially.** It is a document.
3. No memories: **passes best, but not fully.** Most pages can be built from documented work and
   his own copy. The working itself (evidence, intermediate numbers) is mostly not recorded.
4. Chance vs principle: **passes best.** It _is_ principle.

**Tradeoffs.**

- Cheapest to make, most accessible, and it keeps most of the current constraints.
- It is also the least radical, the least scenic, and the closest to "a CV in a nice skin".
- "School" may read as juvenile.
- It satisfies "principled thinking" and gives the least for "memorable".
- Its verb is the weakest of the three. Scrolling and revealing notes isn't really "working out",
  and the three directions differ more in composition than in what the visitor does.

### Comparison

|                         | A Il Gioco                | B Teatrino                 | C Quaderno            |
| ----------------------- | ------------------------- | -------------------------- | --------------------- |
| Verb                    | move                      | reveal                     | work out              |
| Direct access           | passes (board is the nav) | passes (proscenium chrome) | passes                |
| Mobile without WebGL    | vertical path + plates    | narrow stage; letterboxing | native                |
| Ships with no new input | weakly; generic scenes    | needs work evidence        | mostly; needs working |
| Chance vs principle     | tension to resolve        | none                       | none                  |
| Link to his work        | life path, returns home   | agents/evals as backstage  | teaching, evidence    |
| Production              | highest (pop-up per stop) | medium (flats per act)     | lowest                |
| Constraints retired     | most                      | many                       | few                   |
| Memorable without name  | high, _if_ memories exist | medium-high                | medium                |

## 5. What was decided

Three rounds of grilling (2026-10-28) settled the direction. The working log, with every rejected
alternative, are published in the Requirement Source, #141. Superseded storyboards are kept in
`docs/research/experience-rethink-sources/`.

### 5.1 Rounds one and two

- **Direction A, a game of his life, is chosen** over B (Teatrino) and C (Quaderno).
- **The childhood tie is Monopoly.** He loved the Star Wars edition as a child **[S]**. Nothing
  Star Wars appears. Round three demoted Monopoly from frame to light touch (§5.2).
- **Cuneo is home.** His old high school is there, and he is back there now **[S]**. The path
  leaves home and comes back twice.
- **The places:**

  | Place                  | Covers                                                                    | Landmark                                              |
  | ---------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
  | Cuneo (home)           | Origin; 2022–23 return; 2024– return (startup, Complaion)                 | The Bisalta **[S]**                                   |
  | Turin                  | Politecnico, 2017–20                                                      | The Mole Antonelliana                                 |
  | Lausanne / Switzerland | EPFL 2020–22, absorbing Roche (Basel) and Burgeon (Geneva)                | Lake Geneva with the Alps                             |
  | Lille                  | GSK. The step says Lille; its text says Saint-Amand-les-Eaux (near Lille) | The Chamber of Commerce belfry and the Vieille Bourse |
  | "?"                    | What's next                                                               | A blank piece                                         |

  The 2022–23 teaching stint is not a place of its own. Small stints are left out as noise.

- **Each place is a small 3D scene** carrying its landmark, blended with the work done there, and
  naming its inspirations. No personal photos. Nothing handmade.
- **Priorities:** professional proof, then memorability, then build and upkeep cost.
- **Placement.** The homepage's first paint is real HTML with name, role, work, writing and
  contact. The 3D scenes are opt-in, never the arrival. The audience from #3 holds.
- **Spec rules.**
  - Kept: the first-screen check and retained proof.
  - Retired for the 3D layer only: the WebGL ban and the continuous-motion ban.
  - Replaced: opacity-only reduced motion becomes a designed reduced-motion 3D.
  - Kept for the page's interface: the seven colour roles and the guard. 3D scene art gets its own
    ADR.
  - Retired: the sticky rail and scroll-spy.
  - Amended: ADR-0003, so that fixed controls never cover content.
- **Modular, and staged.** A new role is one new step. Research, then one prototype, then the rest.

### 5.2 Round three: a path you can pick from

- **A path of steps, not a Monopoly board.** The owner's reference is a toy-like path with one
  prop cluster per life step (§6.6). Monopoly stays a light touch where it helps: labels in his own
  words, the Landlord's Game credit.
- **Steps can be chosen in any order.** Selecting a step builds its scene, and a caption (and,
  optionally, a voice) appears.
- **Accepted as recommended** ("okay for the rest, I think"):
  - the Chamber of Commerce belfry for Lille;
  - toy-like pieces as the art direction;
  - the per-place blends, including the two readings (the Bisalta's two peaks as the two returns;
    the lake's reflection as the TL;DR), and the "?" as five blank clue slots;
  - the budgets, tuned after the first prototype;
  - the HTML version ships before any 3D;
  - two ADRs: the homepage with opt-in 3D, and the colour exemption for scene art;
  - no work evidence supplied, so scenes stay generic where evidence is missing.
- **Generated assets are allowed.** Images from GPT Image 2.5 through Codex's image generation;
  Hunyuan3D through Hugging Face inference or other hosts, with the licence question accepted by the
  owner. Voices from ElevenLabs or similar are a secondary option.
- **Retired with the board:** the 18-space loop, cities on corners, laps, the token's hops, the die,
  Chance cards, title deeds, Public Park, the duplicate Field notes and germinai spaces, and "silent
  until the first world ships" (a voice is now wanted, so sound is reopened).

### 5.3 Round four: two doors, and a voice that can wait

- **The final round's recommendations are accepted:** the path's own piece rather than tapes; the
  moving piece with a fixed frame; the seven steps, with the side projects undated; the prototype
  gate; the vocabulary; the Mole's heritage-code risk; and what the making-of discloses.
- **Voice comes later.** The prototype uses a stock synthetic voice reading proper scripts, labelled
  as synthetic. His recordings, or a clone of his voice, come later.
- **Two doors.** The flat site at `/` is the first paint, with a large "Walk the path in 3D" door in
  the header. The 3D version lives at `/path`, full-screen, with a permanent way back. _Rejected_:
  a choice dialog on load (a gate that hides name and role and fails the first-screen check), and
  germinai.xyz as the 3D address (it is the newsletter's, and already lands on `/writing`).
- **Returning visitors** who chose 3D see "Continue the path" on the flat site's door. Nothing opens
  3D on its own.

### 5.4 What survives from the board

- **A path that comes home.** The path leaves Cuneo and returns twice. The home scene builds up a
  little more on each return (§7.3), which keeps the returns without laps.
- **An open "?"** where a closed ending would be.
- **One piece on the path** marks the selected step (the second opinion agreed after
  reconciliation, §6.7).
- **Writing is visible**, not hidden in a deck.
- **The killed interior-design MVP** stays the strongest documented evidence of judgement. It is
  part of the 2022–23 home step.
- **The exit** offers email, the CV, and the making-of.

### 5.5 Corrections that bind the storyboard

From the two second opinions (Codex sessions `01a18346-3c98-7213-b4f7-77ceb0f4dcdd` and
`01a18417-77bf-7ed2-a06e-7e982043a12d`):

- **No invented numbers.** The only numbers a scene, caption or voice may carry are 10,000 m³ a
  year (projected, and it must say so), "20% faster than manual tuning", two developers, and five
  clues for one word.
- **No "principles" built from quotes.** "Killed it on the evidence" describes one project.
  "Knowing when they're not" is a clause about agent reliability. Quoting them is fine; calling
  them his working principles is **[I]**.
- **No assumed co-location.** The repo doesn't say the MSc thesis was done at Burgeon, or that the
  Hugging Face space is still live.
- **No proof behind a gesture.** A slider, gauge or build never withholds a role, a date or a
  result. The text is there first.
- **Metaphors are labelled as illustrations**, so the lake and the gauge don't read as project
  footage.
- **Geography is right.** Basel is on the Rhine, so Roche is not on the lake.
- **A playable Ghigliottina round must be distinguishable from the archived AI service.**
- **Visible, not merely present.** Every discovery needs an equivalent for touch, keyboard, reduced
  motion and the no-WebGL fallback.
- **Nothing in the reference video is his.** It tells another person's life (§6.6). Borrow its
  grammar, none of its props.

## 6. Research for rounds two and three

Seven research passes and a second opinion ran on 2026-10-28. Their full reports are kept in
`docs/research/experience-rethink-sources/` (`research-*.md`, `second-opinion-path-r*.json`). This section keeps
what the storyboard needs. §6.1–6.3 come from round two, §6.4–6.7 from round three. Tags as in §1 for facts
about Lorenzo and places; **O**, **I** and **R** as in §3 for what was observed, inferred or
reported.

### 6.1 Monopoly: structure, history, and the legal line

Kept for the record. Round three retired the board's Monopoly machinery (§5.2); what survives is the
labels rule (his own words), the Landlord's Game credit, and Monopoly Plus's lesson that animations
must be skippable.

Not legal advice. All case law below is US; Italian and EU marks were not checked.

**Structure** **[P]**.

- The classic board has 40 spaces: 22 streets in 8 colour groups, 4 railroads at mid-side, 2
  utilities, 3 Chance, 3 Community Chest, 2 taxes and 4 corners.
- The Italian board says _VIA!_, _Imprevisti_ (Chance), _Probabilità_ (Community Chest) and
  _Parcheggio gratuito_, with stations Nord, Ovest, Est and Sud (it.wikipedia, secondary).
- Hasbro's rules sheet (C1009) lays a title deed out as a colour band headed "TITLE DEED", then
  rent tiers, then house and hotel costs.

**History that is free to use** **[P]**.

- Monopoly descends from Lizzie Magie's _The Landlord's Game_, US Patent 748,626 (filed 1903,
  granted 5 January 1904, long expired). Its claim 1 describes "a game-board, having corner-spaces,
  one constituting the starting-point".
- The patent's own vocabulary is public domain: the start is "Mother Earth", each lap pays
  "wages", and at the "Public Park" you stop "without paying anything".
- Italy: Editrice Giochi published _Monòpoli_ in 1936 with Italianised names; Hasbro restored
  "Monopoly" in 2009.
- A licensed _Monopoly Edizione Torino_ launched in November 2025. No Cuneo edition was found. The
  nearest is _Granda Land_ (2019), an independent property game set in the province of Cuneo.

**What Hasbro claims** **[R]**: "the Monopoly names and logos, the distinctive design of the
gameboard, the four corner squares, the Mr. Monopoly name and character, as well as each of the
distinctive elements of the board and playing pieces". Copyright doesn't protect a game's idea or
method of play (US Copyright Office). _Anti-Monopoly v. General Mills_ (1982) found the name
generic, and the 1984 Trademark Clarification Act reversed the test it used, so the mark is live.
Hasbro won an injunction against _Ghettopoly_ in 2006.

**The line, as researched.**

| Likely safe                                | Risky                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------- |
| A loop of spaces with corner anchors       | The Monopoly or Monòpoli name, or any "-opoly"                        |
| Move, land and reveal                      | Corner artwork, the logo, the fonts, Mr. Monopoly                     |
| Colour-banded groups in our own palette    | The deed and card layouts, and the "TITLE DEED" header                |
| Cards of our own design                    | 40 spaces, the eight-colour sequence and the classic corners together |
| A historical credit to the Landlord's Game | Anything that suggests Hasbro endorsement                             |

**The grey zone** is the bare words GO, Chance, Community Chest, Free Parking and title deed. One
alone is probably low-risk; all of them together are what builds the evocation. Whether any is a
registered word mark was not verified. A personal site that markets his services may not count as
non-commercial.

**What this means for the board [I].** The childhood memory survives as structure and gesture: a
loop, a start corner you pass, cards you draw, a token. The labels the visitor reads should be his
own (question 1 in §12). The storyboard below uses the recommended labels:

| Internal name (GLOSSARY) | Label on the board (pending question 1) |
| ------------------------ | --------------------------------------- |
| GO                       | Cuneo, with a "home" mark               |
| Chance                   | "?"                                     |
| Community Chest          | Field notes                             |
| Free Parking             | Public Park (Magie, 1904)               |
| Title deed               | An unheaded card with a colour band     |
| Station                  | The project's name, no railway wording  |

**Digital precedents** **[R]**. Monopoly Plus (2014) framed the active space and grew a 3D city in
the middle as properties were bought; its review faults the unskippable animations. No live
portfolio was found that uses a Monopoly-like board as navigation.

### 6.2 Art direction for the worlds

**Inspected live** (muted Chrome, 2026-10-28):

- **Bruno Simon, _My Room in 3D_.** 10.9 MB in total **[O]**: four 4096² bakes of 0.85–1.5 MB
  each, and a 244 KB Draco model. A day and a night bake are blended by a uniform in the shader,
  and each light's contribution is packed into its own colour channel so lights recolour live
  **[O/I]**. Four 4096² textures come to about 360 MB of GPU memory **[I]**, which a phone won't
  hold. The lesson: a light and a dark bake mixed by a uniform maps straight onto the site's dark
  mode; size bakes to the world.
- **DJDB** (djdb.kr). The closest analogue to this board **[O]**:
  - The Play page is plain HTML cards with a pre-rendered poster each.
  - The 3D shop loads only after "Press start".
  - Lightmaps are split by object group, in low and high tiers.
  - The author keeps phones in night mode to keep the load light **[R]**.
- **Townscaper** (web demo, 53.9 MB, so no model for weight). One cluster sits on fogged water with
  no visible edge **[O]**. Dark outlines and a contact shadow make the "small world" without a
  plinth.
- **Mr. Panda's papercraft portfolio.** 13.3 MB of its 14.3 MB is KTX2 texture; the model is 30 KB
  **[O]**. When surfaces are painted, textures are the whole budget.
- **Tilt-shift in HTML** needs Chrome 148 behind a flag **[R]**, so it can't ship. It confirms that
  focus and controls must live in an HTML overlay, with the canvas decorative.

**Reported from games and talks** **[R]**:

- Monument Valley: one fixed camera, a three-colour palette, colour painted rather than lit.
- Mini Metro: each real city gets one palette and one geographic signature.
- Captain Toad: a world is one bounded box you turn around, never travel through.
- A Short Hike: low resolution, soft outlines and flat shading, which are both a style and a
  performance lever.
- Tiny Glade: procedural geometry isn't generic when the generators are authored.

The first "floating island portfolio" found in the search was built with an AI model generator
**[O]**. Low-poly floating islands are the most saturated look of the moment.

**Three options, tested for phone-still legibility, per-frame cost, bake budget and generic risk.**

| Option                                   | Cost   | Phone       | Legibility | Generic risk |
| ---------------------------------------- | ------ | ----------- | ---------- | ------------ |
| A. Painted-wood board pieces             | low    | excellent   | strongest  | moderate     |
| B. Soft clay miniature with tilt-shift   | high   | stills only | weakest    | high         |
| C. Crisp low-poly, flat colour, outlines | lowest | excellent   | good       | highest      |

**Recommended: A, built with C's cheap techniques.** The worlds look like the board's own playing
pieces: turned, extruded and bevelled forms made in code, in matte enamel colours with a faint
grain. The work done in a city is more pieces on the same base. It is the only option whose look
comes from the board rather than from the diorama genre. In practice:

- Geometry in code (lathe, extrude, bevel), with instanced repeats.
- A fixed, small-FOV camera with a limited orbit: a box you turn, not a world you travel.
- One palette pair per world, drawn from the site's tokens.
- Thin outlines, so stills read at the width of one space.
- Ambient occlusion baked into vertex colours, or one texture of at most 1024² per world. A light
  and a dark bake are mixed by a uniform.
- Fog over a void instead of a plinth.
- No tilt-shift: the small FOV and fog give the miniature cue at no per-frame cost.

### 6.3 The places: landmark, work, and the blend

Each world proposal below rests on documented facts about him **[F]** and public facts about the
place **[P]**. The reading that joins them is **[I]**, and each needs his yes or no (question 5).

**Cuneo (GO).**

- **Landmark [P].** The Bisalta (Besimauda): a bifid summit, 2,231 m (south) and 2,018 m (north),
  with a cross on each. "Bis alta" is read as "twice high". It rises straight off the plain with no
  foothills in between. Cuneo itself sits on a wedge-shaped plateau where the Stura di Demonte and
  the Gesso meet. The bearing from the centre, roughly south-south-east at about 13 km, was derived
  from coordinates and is **unverified**; check it against a photo.
- **Work [F].** First return (2022–23): teaching at his old high school, and the interior-design
  MVP killed after customer discovery. Second return (2024–): the stealth EdTech startup (RAG with
  handwritten parsing, two developers), then Complaion (the agentic AI core of an ISO-compliance
  platform).
- **Recommended blend: "the wedge and the two horns".** The GO world is the wedge between two
  river ribbons, with the bifid Bisalta behind it. Two buildings stand on the wedge, one per
  documented return, each tagged with its dates. The first has a schoolroom and a dimmed window
  labelled "MVP — killed after customer discovery". The second is today's office.
  - **[I]** Reading the two peaks as the two returns is a reading, not his. It is shown only if he
    accepts it.
  - Inspirations: Townscaper (the edgeless small world), Monument Valley (clarity from a fixed
    view).
  - Alternatives: an audit path up the Bisalta, with waymarks for the generic ISO cycle (Stage 1,
    Stage 2, surveillance, recertification) and an eval gauge that shows no number; or a page of
    handwriting laid like a field on the plain, with parsing boxes lighting up (generic page
    content: the startup is in stealth).

**Turin.**

- **Landmark [P].** The Mole Antonelliana: 167.5 m, Alessandro Antonelli, 1863–89. A four-faced
  dome, a _tempietto_, a lantern, then a spire topped by a star; the top 47 m fell in a 1953 storm
  and were rebuilt in 1961. It has housed the National Museum of Cinema since 2000. Mario Merz's
  red neon Fibonacci numbers, _Il volo dei numeri_, climb the dome. The dome's exterior colour is
  **unverified**; check photos before modelling.
- **Work [F].** BSc Electrical Engineering, Politecnico di Torino, 2017–20.
- **Recommended blend: "Ferraris' Mole".** Galileo Ferraris conceived the rotating magnetic field
  in Turin from 1885, with two perpendicular coils fed 90° out of phase **[P]**. Two coils wrap the
  dome, and the spire is the rotor.
  - Discovery: a phase slider. At 0° the needle only trembles; at 90° it turns. The degree is in
    the step's text from the start: the slider never gates it (corrected in round three).
  - **[I]** This is Turin's electrical heritage. It doesn't claim he worked on Ferraris.
  - Alternatives: Merz's numbers run up the ribs as a lit circuit trace; or the panoramic lift draws
    a sine wave on its glass (weak at small size).

**Lausanne / Switzerland.**

- **Landmark [P].** From above Lausanne, the Dent d'Oche (2,221 m) rises straight across the lake;
  Turner drew that view in 1841. The Dents du Midi stand up-lake to the east. Which peaks are
  visible from Ouchy is **unverified** (check with PeakFinder). Geneva's Jet d'Eau reaches 140 m.
  Basel is on the Rhine, not the lake.
- **Work [F].** MSc Life Sciences Engineering at EPFL, 2020–22. Roche, Basel, 2021: a filling
  prototype, and a gradient-boosted model that tuned fill parameters 20% faster than manual. Burgeon
  Labs, Geneva, 2022: models summarising biomedical literature. The MSc thesis: a summariser with
  "detailed analysis or TL;DR" modes.
- **Recommended blend: "the lake is the TL;DR".** Turner's viewpoint. The far shore and mountains
  are the full paper, drawn as dense ridgelines of text; their reflection in the lake is the
  summary.
  - Discovery: a "Detailed / TL;DR" toggle redraws the reflection, as his thesis's two modes do.
  - A Jet d'Eau plume at the Geneva end is tagged "Burgeon Labs, 2022".
  - Roche gets its own labelled work piece in the Switzerland group, with a dial that reads "20%
    faster than manual tuning". It is not on the lake: Basel is on the Rhine (round three dropped
    the "Basel jetty").
  - **[I]** The reflection as summary is a reading, accepted in round three and labelled on the
    page as an illustration, not project footage. What Roche's prototype filled is **[M]**.
  - Inspirations: Turner (1841), Cardinaux's Simplon Line poster.

**Lille.**

- **Landmark [P]: which belfry.** Two towers answer to "the belfry".
  - The belfry beside the Vieille Bourse is the **Chambre de commerce belfry**: about 76 m, by
    Louis-Marie Cordonnier, 1910–21, neo-Flemish, with a four-faced clock and a carillon that plays
    _P'tit Quinquin_ at noon. It stands on the Place du Théâtre, just behind the Grand'Place.
  - The **UNESCO-listed belfry** is the Hôtel de Ville's (104 m with its lantern, Émile Dubuisson,
    1929–32), near the Porte de Paris and not on the Grand'Place.
  - The Vieille Bourse (1652–53, Julien Destrée) is a ring of houses around a courtyard where
    chess players and booksellers sit daily. Its building materials were not confirmed.
- **Work [F].** GSK, Saint-Amand-les-Eaux, 2023–24: multi-source sensors across pharmaceutical
  utilities, anomaly detection and forecasting, NLP for faults and maintenance, natural-language
  interfaces to plant data, and water-rejection strategies projected to save 10,000 m³ a year.
- **Recommended blend: "the belfry as a gauge".** The Vieille Bourse courtyard is ringed with
  polished pipe loops, of the kind a pharma water loop uses **[P]**. Each house carries a sensor
  light, and the Chamber of Commerce belfry's four clock faces are gauges.
  - Discovery: choose a clock face and its hand sweeps to "10,000 m³ a year — projected saving".
    "Projected" stays. The figure is in the step's text before any gauge moves, and the gauge is
    labelled as an illustration.
  - Inspiration: Mini Metro, for drawing the pipes as clean lines.
  - Alternatives: the carillon drum as a time series with one pin out of place, ringing off-key
    for anomaly detection (illustrative data, labelled as such); or "Ask the courtyard", a
    bookstall where a plant chart answers a plainly labelled example question.

**"?" and the stations.**

- **"?".** An unprinted card. Turned over, it says "not yet written" and links to contact and the
  newsletter. Its face is either five blank clue slots (the Ghigliottina format) or the germinai
  seed with the book still closed. It invents nothing.
- **Quadrell.** A small workshop kiosk. Generic unless he supplies client examples.
- **L'Oracolo della Ghigliottina.** A small television under a dust cover, because the service is
  archived. The format **[P]**: five clue pairs, each with a decoy, and one word that connects
  them.
- **Biomedical summariser.** A press that folds a long sheet into a TL;DR card. It shares the
  Lausanne motif, so one of the two should carry it.
- **germinai.** The seed sprouting into an open book (the existing mark, #53). It can grow with the
  live post count, which is one today.

### 6.4 Voice, captions and the build (round three)

Full report: `docs/research/experience-rethink-sources/research-voice-build.md`. Not legal advice.

**When a click unlocks sound [R].** A `keydown` (other than Esc), `mousedown`, a touch `pointerup`
or `touchend` grants user activation for a few seconds (HTML spec §6.4). A click, Enter or Space on
a step counts. Safari grants permission per `<audio>` element, so one element should swap its
`src`. A blocked `play()` rejects its promise, which the page can catch and turn into a Play
button.

**Voice options.**

| Option                                | Size and cost                                                                                                                                   | Verdict                                                                                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| His own recordings                    | Opus at about 24 kbit/s with an AAC fallback: about 60 KB per 20 s clip **[I]**                                                                 | The most personal option. Re-recording is needed whenever a claim changes                                                                                              |
| A clone of his own voice (ElevenLabs) | Instant clone on the $6 Starter plan; about 5,400 characters for 12 clips, about $0.45 **[R/I]**. Per-character timestamps for captions **[R]** | Allowed for his own voice. Must be labelled: EU AI Act Art. 50 requires disclosure of AI-generated audio resembling a real person, applying from 2 August 2026 **[R]** |
| The browser's `speechSynthesis`       | Free                                                                                                                                            | Rejected: voices differ per device, and Chrome's network voices cut off at about 15 s **[R]**                                                                          |
| Text only                             | None                                                                                                                                            | The baseline in every case                                                                                                                                             |

**Accessibility [R].** WCAG 1.2.1 exempts audio that is "a media alternative for text" and says no
more than the text. So **the voice script is the visible caption, word for word**, and the caption
comes from the same data as the proof. WCAG 1.4.2 doesn't apply to sound started by a clearly
labelled control. WCAG 2.2.2 doesn't apply to motion started by a click, but hover, focus or scroll
triggers would bring it in.

**The build [R/I].**

- Pieces drop in through one per-instance delay and one progress uniform: one draw call, no
  per-frame JavaScript. Skip sets progress to 1; reduced motion crossfades from the still.
- `frameloop="demand"` keeps the canvas idle between builds.
- react-spring/three (18 KB gzip, active) or GSAP (27 KB, free) for the few authored springs.
  theatre.js is stale and framer-motion-3d was removed, so neither.
- **Cut between scenes; don't ride a camera rail.** A rail keeps neighbouring scenes loaded (five ×
  64 MB won't fit a phone) and needs a second path for reduced motion.

**Video is out of budget [R/I].** One 6–10 s clip at 720p is 1.8–3.75 MB at Apple's encoding
targets. Light and dark double it, and transparency needs two encodes (VP9 alpha, and HEVC alpha
for Safari). Pre-rendered material stays at the ≤150 KB stills.

### 6.5 Generated assets (round three)

Full report: `docs/research/experience-rethink-sources/research-generated-assets.md`. The researcher generated
nothing, so every quality claim is reported or inferred.

- **GPT Image 2.5 [R].** Two models, `gpt-image-2.5-flare` (fast) and `gpt-image-2.5-sunburst`
  (editing), released 8 September 2026. Up to 3840×2160, transparent PNG or WebP, mask editing that
  is "prompt-based", up to 16 reference images. No fine-tuning.
- **Its own docs warn about consistency [R].** Recurring elements "may not stay visually consistent
  across generations", and camera specs are "appearance cues, not exact physical simulation". The
  mitigations: numbered references with stated roles, passing the previous output forward, and
  compositing approved regions back.
- **Through Codex.** Codex 0.165 lists `image_generation` as stable **[O]**. Unofficial reports say
  Codex may still serve `gpt-image-2` **[R]**. The first generated file's C2PA metadata settles it.
- **Cost.** No per-image price is published for 2.5. GPT Image 2 at high quality is $0.211 per
  1024² image **[R]**, so about 150 iterations is in the $30–100 range **[I]**.
- **Provenance [R].** Output carries C2PA metadata and a SynthID watermark. Converting to WebP or
  KTX2 strips the metadata, so any disclosure has to be page copy.
- **Image-to-3D.**
  - Hunyuan3D: its licence excludes the EU **[R]**. The owner accepts this and will run it through
    Hugging Face inference or another host.
  - TRELLIS.2 exports about 1M triangles with 4096² textures, far from web-light **[R]**.
  - Tripo is about $0.30–0.45 per model with a low-poly option **[R/I]**.
  - After decimation to 4–18k faces, Draco or meshopt, and one 1024² KTX2 texture, a prop lands in
    the low hundreds of KB **[I]**, against a few KB for a lathe-built piece.
- **Where generated assets drift [I].** Image-to-3D inherits drift from its source images and
  invents back sides. One style across five scenes holds when code owns the palette, camera,
  outlines and fog.
- **Landmark rights.** Copyright is not the issue: Antonelli died in 1888, Cordonnier in 1940, and
  the Vieille Bourse dates from 1653 **[R/I]**. Italy's heritage code (arts. 107–108) is: courts
  enforced it against commercial reproductions of the Vitruvian Man (2022) and the David (2023),
  and the Comune di Torino owns the Mole **[R]**. Art. 108(3-bis) frees non-profit uses for
  "creative expression". A stylised toy on a personal site plausibly fits, a portfolio that seeks
  paid work weakens that, and no court has ruled on stylisation **[I]**.

### 6.6 Picking a step: Felix's tapes, other references, and the owner's video (round three)

Full report: `docs/research/experience-rethink-sources/research-pick-a-step.md`. Inspected muted on 2026-10-28.

**How Felix's tapes work.**

- `/#work` shows the legal pad, with 11 entries plus Podcasts as real DOM buttons **[O]**.
- Choosing one:
  - The header reads "tape 01 · loading…", then "now playing" **[O]**.
  - The entry's 2–3 line text opens with one link **[O]**.
  - An aria-live region announces "Now playing: Anthropic" **[O]**.
- **A tape is a small drawn program, not a video [O/I].**
  - Notion's is about 37 KB of 2D-canvas code: 7 scenes, 43 s, looped.
  - Only Anthropic's tape is real film.
  - The text on the pad is the caption; no tape has subtitles.
- **The build is the insert [I].** The cassette flies into the VCR along a curve in 1.05 s, plus
  0.22 s to thread.
- **Controls.**
  - REW and FF skip scenes; there is no scrubbing **[I]**.
  - The URL stays `/#work`, so tapes have no link of their own **[O]**.
  - Nothing marks a tape as seen **[O]**.
- **Gaps.** Reduced motion still plays the tapes **[O]**. On a phone, an index card replaces the
  pad and the TV plays above it **[O]**.

**Other "pick an object, it plays" models [R].**

- _Return of the Obra Dinn_: the watch plays a death's last seconds as audio, then the frozen
  moment in 3D. A logbook fills itself in.
- _Her Story_: 271 clips in any order, and a checker turns each red box green once watched. This is
  the best model for a "seen" mark.
- _What Remains of Edith Finch_ is semi-linear despite appearances. _Unpacking_ is linear.

**"Something builds" [O/R].**

- igloo.inc's blocks drift and never lock, so it reads as mood, not a build that ends **[O]**.
- jesse-zhou.com is whole from the first frame **[O]**.
- Apple's assemblies are scroll-scrubbed image sequences **[R]**.
- The cheapest real build found is Felix's one-second insert.

**The owner's reference video is someone else's life [R].**

- "Mr. RIP" is Giorgio, born in Rome in 1977, a software engineer in Switzerland since 2012, and
  author of the financial-independence blog _Retire In Progress_. He streams on Twitch.
- "Pioltello" appears in an episode title of his podcast.
- The props (money bags, the Swiss case, YouTube and Twitch) fit his life, so the clip is most
  likely his channel or stream intro **[I]**.
- **The rule:** borrow the grammar (a path, one prop cluster per step, a marker on the move, an
  overlay), none of the props.

**Variations considered.**

| Variation                                  | What it is                                               | Outcome                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| V1. Tapes as drawn programs                | Felix's model: a 2D canvas program per step              | **Rejected.** It contradicts "all scenes 3D" and the generated-asset direction. Kept from it: the "seen" mark and real-DOM captions |
| V2. The scene builds on selection          | Pieces drop onto the step's base in order, with captions | **Chosen** (§7)                                                                                                                     |
| V3. A pre-rendered dolly cut into chapters | The owner's reference, made seekable                     | **Rejected** on weight (§6.4), and every copy change is a re-render                                                                 |
| V4. Voice first, then the frozen scene     | _Obra Dinn_                                              | **Folded into V2** as the optional voice                                                                                            |

### 6.7 The second opinion on the path (round three)

Codex (`gpt-6-astra`, unverified serving model), session `01a18417-77bf-7ed2-a06e-7e982043a12d`.
Its replies are saved as `docs/research/experience-rethink-sources/second-opinion-path-r*.json`.

- **Position.** A freely selectable path whose small scenes build on demand, with the professional
  evidence shown immediately and optional real narration. Retire the Monopoly machinery.
- **After one reconcile it agreed to:**
  - one piece on the path that marks the selected step, as long as content updates immediately and
    the piece never delays reading;
  - a consented, labelled clone of his voice as an alternative to recordings. Recordings come first
    in the prototype, then a comparison on the same script.
- **Its test.** Build Lille finished and Cuneo rough. Compare them with the same content as plain
  cards, on about five people like the audience. Suggested thresholds:
  - at least four find current work, CV and contact within 15 s without playing anything;
  - at least four jump to a named step unaided;
  - at least four recall one real contribution afterwards;
  - anyone reading "projected" as "achieved" triggers a revision.
- **Its warning.** The tests check that words are present, not that people understand them.

## 7. Storyboard

The proposal for the path, pending the final round (§12). Nothing here is implemented. Vocabulary
is the one settled in round four and kept in GLOSSARY.md: **path**, **step**, **scene**, **prop**,
**home**, **piece**, **seen**, **flat site**, **3D path**, **door**.

### 7.1 The steps

Seven steps in time order. The path leaves home and comes back to it twice.

| #   | Step                  | Text (from `resume-data.tsx`)                                                                                                          | Scene                                                               |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Cuneo · home          | Where he grew up and went to school **[S]**                                                                                            | Home: the wedge between two rivers, the Bisalta, the school         |
| 2   | Turin · 2017–20       | BSc Electrical Engineering, Politecnico di Torino                                                                                      | The Mole with Ferraris' coils                                       |
| 3   | Switzerland · 2020–22 | MSc at EPFL, with the thesis summariser; Roche, Basel, 2021 ("20% faster than manual tuning"); Burgeon Labs, Geneva, 2022              | The lake from above Lausanne; the Jet d'Eau; Roche's own prop       |
| 4   | Cuneo · 2022–23       | Teaching maths and physics at his old high school; the interior-design MVP "killed on the evidence after customer discovery"           | Home builds a little more: the schoolroom and the dimmed MVP window |
| 5   | Lille · 2023–24       | GSK, Saint-Amand-les-Eaux (near Lille): plant sensor data, anomaly detection, water strategies "projected to save 10,000 m³ a year"    | The belfry and the Vieille Bourse courtyard with its pipe loop      |
| 6   | Cuneo · 2024–now      | Founding engineer at a stealth GenAI EdTech startup (two developers); now Complaion, the agentic AI core of an ISO-compliance platform | Home builds again: the office                                       |
| 7   | ?                     | Not yet written. Contact and the newsletter                                                                                            | A blank prop with five empty clue slots                             |

- **Home builds up.** Steps 1, 4 and 6 share one scene. Selecting step 4 shows step 1's props
  already in place, and only the new props build. That gives the two returns without any game
  rules. The Bisalta's two peaks are read as the two returns, as accepted in round three, and the
  page labels that reading as his choice.
- **Side projects sit beside the path, not on it.** Quadrell and L'Oracolo della Ghigliottina have
  no dates in the data, so they are two undated props off the path. The thesis summariser belongs
  to step 3, because it was MSc work. germinai is the writing, which has its own place (§7.2).

### 7.2 Arrival: the flat site, with a door

Round four settled two doors (#141, decision 6). The flat site at `/` is the first paint for
everyone. The 3D version lives at `/path` and is entered by choice.

**1440 × 900, nothing gated.**

- **Header, top left:** his name, "AI Product Engineer", and today's subhead ("…the AI engine
  behind Complaion, a compliance platform for ISO certifications: LLM agents doing real compliance
  work in the background, and the evals…"). That gives three technical terms (ISO, LLM, evals)
  and a named system (Complaion), the same ones that pass `tests/homepage-fold.spec.ts` today.
  Email, CV and Writing sit under it.
- **The door, in the header:** a large "Walk the path in 3D" control beside the name, the first
  choice a visitor sees. It is a link to `/path`, not a dialog. A visitor who has been in before
  sees "Continue the path" instead (§7.7).
- **The path, left:** a winding line of tiles drawn in SVG, with every step's label (place, dates)
  as a real link. Off to one side are the two side-project props.
- **The step panel, right:** step 6 (now) is selected on arrival. The piece sits on it, and the
  panel shows the step's still and its text: Complaion, the startup, the dates.
- **Writing, visible:** further down, the latest field note (today, _Drop the Bloat_) with the
  germinai mark.

**375 × 812.**

- The header comes first, door included, so the first-screen terms land in the first viewport.
- The path becomes a vertical line of steps. Selecting one expands it in place, with its still and
  text.
- The piece is a dot on the line.

**No JavaScript.** The same page. Every step is a link to its own anchored section, and every
step's text is in the page. JavaScript adds the piece and the step panel.

### 7.3 Selecting a step on the flat site

1. **Select.** Click, tap, Enter or Space on a step.
2. **At once:** the panel shows the step's place, roles, dates, documented results and links ("In
   the CV", the employer), with its still.
3. **The piece travels** along the drawn path to the step: under 600 ms, a cut under reduced
   motion. Nothing waits for it.
4. **The URL** becomes `/#lille`, pushed to history.
5. **The step is marked seen** with a small tick, as in _Her Story_. The ticks are kept in local
   storage, shared with `/path`, and can be cleared.

The flat site never loads 3D code and never plays sound.

### 7.4 The 3D path at `/path`

**Entering.**

1. **First paint is still HTML.** The overlay (name, the step list, the step's text, and "Flat
   site") paints at once over the still of the step the visitor came from, or of "now".
2. **The runtime loads,** with progress in bytes and a way back to the flat site throughout.
3. **That step's scene builds** (below), because entering was the visitor's own choice.

**The overlay** is HTML and owns every control and all focus:

- a permanent **"Flat site"** link, which returns to the same step on `/`;
- the step list, which is the path in small, with the piece and the seen ticks;
- the step's text panel, Listen, Skip and Replay.

**Selecting a step.**

1. **At once:** the text panel shows the step's place, roles, dates, documented results and links.
2. **The piece travels** along the path in the overlay (under 600 ms).
3. **The scene cuts in and loads.** It is cancellable, with progress in bytes.
4. **It builds in about 2–3 s.** The props drop onto the base in order, and each prop's caption
   line is highlighted in the text panel as it lands. Captions are the text panel's own lines, real
   DOM, not a second copy. One polite announcement says "Showing: Lille".
5. **Skip.** A click on the scene or Esc jumps to the finished scene.
6. **The end.** The scene settles into a still composition. It doesn't loop and doesn't advance on
   its own. Replay, another step, the CV, Email and "Flat site" are all one click away.

**The camera is fixed** for each scene, with a limited turn by drag or by two 45° buttons. Moving
between steps is a cut plus a build.

**Why there's no travelling camera.** A continuous dolly along the path, like the owner's
reference, keeps the neighbouring scenes in memory (five × 64 MB doesn't fit a phone) and needs a
second design for reduced motion (§6.4). The piece's travel carries that feel at no GPU cost.

**Fallback.** `/path` shows its stills, with the same overlay and a line saying why, if any of these
hold:

- WebGL2 is missing.
- Context creation fails, or reports a major performance caveat.
- The browser asks to save data.
- The first 60 frames run at a median above 33 ms.

A lost context or a hidden tab pauses rendering. A lost context that doesn't restore drops to the
stills.

**Landmarks.** `/path` is its own shell, so it owns its own landmarks and one `contentinfo`
(ADR-0002). The first-screen check applies to `/` only.

### 7.5 Each scene's discovery

Every discovery is an illustration, labelled as one, and never holds back the text. Under reduced
motion each control shows its end state.

| Scene       | Discovery                                                                                                   | Reduced motion                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Home        | Each return's props build (school; then the dimmed MVP window; then the office)                             | The step's props are all in place                |
| Turin       | A phase slider: at 90° the spire turns, after Ferraris' rotating field                                      | The needle at its end position, with a drawn arc |
| Switzerland | A Detailed / TL;DR toggle redraws the lake's reflection; Roche's dial reads "20% faster than manual tuning" | The toggle swaps at once                         |
| Lille       | Choose a clock face: its hand sweeps to "10,000 m³ a year — projected saving"                               | The hand is already in place                     |
| ?           | The blank prop: five empty clue slots, "not yet written"                                                    | Shown as is                                      |

### 7.6 Voice

- **Voice belongs to `/path`.** The flat site stays silent.
- **Text is the default,** always on screen.
- **A "Listen" control** plays the step's clip. A persisted Voice switch, off by default, lets later
  selections play their clips. A blocked play falls back to a Play button. Pause and stop are always
  available, and a clip loads only when it is first played.
- **The script is the step's text, word for word.** That keeps the WCAG 1.2.1 exemption (§6.4) and
  the one-data-source rule. A change to a role changes the text, then the clip.
- **Whose voice, in stages** (#141, decision 9):
  1. **First, a stock synthetic voice** reading proper scripts, labelled next to the control as a
     synthetic narrator (for example "Narration: synthetic voice, ElevenLabs"). It is never
     presented as Lorenzo's.
  2. **Later, his own recordings, or a labelled clone of his voice.**
  3. **Italian** when the site has Italian copy.

### 7.7 Navigation state

- **Two routes.** The flat site at `/`, with a fragment per step (`/#lille`). The 3D path at
  `/path`, with the same fragments (`/path#lille`). Fragments are read on the client only, so
  nothing touches `searchParams`, and both routes stay static under Cache Components.
- **The door carries the step.** From `/#lille` the door goes to `/path#lille`; "Flat site" goes
  back to `/#lille`.
- **The remembered choice.** Entering `/path` sets a flag in local storage. On the next visit, the
  flat site's door reads "Continue the path". Nothing opens `/path` on its own, so someone sent the
  CV link never meets a loading scene.
- **Back and Forward** move between previously selected steps on either route.
- **A refresh or shared link** to `/path#lille` shows the overlay and the still, then loads and
  builds, because following the link was the visitor's choice. It never starts a voice.
- **Focus** stays on the step that was selected. Esc in the scene skips the build, and a second Esc
  returns focus to the step list.
- **Keyboard.** Tab walks the steps in path order. Arrow keys move between steps only when focus is
  on the path or the step list, never inside a scene's controls or with a modifier held.
- **The trade-off.** Crawlers don't follow fragments. The crawlable surfaces are `/`, whose every
  step is content, its markdown sibling and `llms*.txt`. `/path` is linked but adds no content
  the flat site lacks.
- **`germinai.xyz`** stays the writing's address and keeps landing on `/writing`.

### 7.8 Exit, and the making-of

- The email is in the header on arrival and again on the "?" step.
- **"How this was made"** at the foot of the page, as a section of `/`, proposed to hold:
  - the budgets and fallbacks;
  - each scene's inspirations and sources;
  - which assets were generated, and with what (C2PA is stripped on conversion, so the page says
    it);
  - the voice label, if a clone is used;
  - a credit for the path grammar, if he wants one (question 8).

### 7.9 Light, dark and print

- Each scene has a light and a dark bake, mixed by a uniform that follows the site's class.
- Print shows the steps' text in path order.

## 8. Staged plan

Each stage ends on something that can be judged.

0. **Decide.** Done in four rounds. Before building:
   - Write the two ADRs.
   - Amend the spec with the retired rules from §5.1.
   - Inventory which of the 386 tests touch `/`.
1. **The flat site ships.** Header, path, piece, step panel, seen ticks, the navigation contract on
   `/`, writing, the identity surfaces. No door yet, and no stills until scenes exist: the panel is
   text. It replaces the rail in production, passes the first-screen check and retained proof, and
   **is the plain baseline** for stage 2.
2. **The prototype of `/path`, on a branch.**
   - **Lille finished, home rough.** Two scenes are the least that tests jumping between steps, and
     Lille has the hardest mix: a landmark, technical work, and a qualified number.
   - **The overlay, the build, the fallback,** and a stock synthetic voice on the two scripts.
   - **Assets.** The first generated image's C2PA metadata shows which model Codex served.
   - **Measured:** transfer, GPU memory, frame rate on a real mid-range Android phone, and the time
     each asset took to make and to revise.
   - **Compared** with stage 1 on about five people like the audience, against the thresholds in
     §6.7.
   - **His verdict** on the look, against the bar that deferred Ambient Current (#27).
   - **Outcomes:** the scenes earn the door, and `/path` ships with it; or the flat site gets the
     stills only; or the door waits.
3. **Home, Turin, Switzerland and "?",** one PR each, through the same gates. Each adds its still to
   the flat site.
4. **His own voice** (recordings or a labelled clone), Italian if the copy exists, the side-project
   props, and the full making-of.

## 9. Asset production

- **Code owns the style:** the path's tiles (instanced), simple props (lathe, extrude, bevel), the
  palette, the camera, outlines, fog and the build.
- **Hunyuan3D** (through Hugging Face or another host) for silhouettes that are hard in code: the
  Mole, the belfry, the Vieille Bourse front. Each one is decimated, compressed and recoloured to
  the palette, at ≤300 KB.
- **GPT Image 2.5 through Codex:**
  - backdrops (the Bisalta, the Alps across the lake);
  - textures and decals;
  - stills painted over grey-box renders of the coded scene, from its fixed camera, so the
    composition holds;
  - a reference set of three or four images he approves, versioned, to fight drift.
- **Rejected by hand** against the approved set; generated textures are quantised to the site's
  colour tokens.
- **Effort.** Unmeasured until stage 2, which records it.

## 10. Stretch target: recognisable with the name and titles removed

- **What is now his.**
  - A path that leaves home and comes back twice, with home built up a little more each time
    **[S]**.
  - The Bisalta, which he chose for home **[S]**.
  - An open "?" where a closed ending would be.
  - His work inside each landmark: the TL;DR lake, the gauge that says "projected", the MVP window
    left dimmed.
  - The voice, if he records it or clones his own.
  - The copy's voice ("the advice changes every two days anyway"), the killed MVP, the germinai pun
    and the Ghigliottina oracle.
- **What still prevents it.**
  1. **The landmarks are public.** The blends with his work are what make them his.
  2. **The path grammar is borrowed** from another person's intro video. It becomes his through
     what sits on it.
  3. **Generated assets drift toward the generic,** unless code owns the style (§9).

## 11. Feasibility uncertainties

- **Weight budgets** (accepted in round three, to be tuned in stage 2):
  - First paint: no 3D code. The page weighs what today's homepage weighs, fonts included (about
    238 KB preloaded, ADR-0006).
  - The 3D runtime and its decoders (Draco or meshopt, Basis) load on `/path` only, and count
    against the total.
  - Each scene: at most 1.5 MB transferred and 64 MB of GPU memory, Hunyuan3D props included.
  - Each still: at most 150 KB. Each voice clip: about 60 KB.
  - Everything opened: at most 8 MB.
  - None of these are measured yet.
- **Phone performance** is unmeasured on a real phone. Stage 2 measures it.
- **Codex's image model** may still be GPT Image 2. The first file's metadata settles it.
- **Style drift** across generated assets is documented by OpenAI itself (§6.5).
- **Licences and rights** (not legal advice):
  - Hunyuan3D's licence excludes the EU; the owner accepts it.
  - The Mole is under Italy's heritage code. Art. 108(3-bis) plausibly covers a stylised model on a
    personal site, and no ruling exists (question 7).
  - A cloned voice needs the AI Act Art. 50 label.
- **Accessibility.** The voice must say exactly the text, or the WCAG 1.2.1 exemption is lost.
- **The test suite.** 386 tests in 26 files, with no inventory yet of which touch `/` (stage 0).
  The first-screen check stays satisfiable (§7.2). Retained proof most likely holds on `/cv` alone,
  which renders every work bullet, project and skill group (inferred from `src/app/cv/page.tsx`;
  confirm by running `tests/cv-route.spec.ts`). Neither test shows that visitors understand the
  proof, which is what the stage-2 comparison is for.
- **Cache Components.** Fragments keep every read on the client (§7.7).
- **Machine-readable surfaces.** `llms.txt` and `llms-full.txt` are hand-maintained, and the
  markdown sibling of `/` follows the path order.
- **The colour model.** Scene art (bakes, shader colours, generated textures) sits outside the
  seven roles. The ADR exempts it, as `warm-print.ts` is exempt from the guard.
- **Unverified place facts:** the Bisalta's bearing from Cuneo, the Mole's dome colour, the peaks
  visible across the lake, and the Vieille Bourse's materials. Each needs a check against photos
  before its scene is modelled.

## 12. Open items

All of the final round's questions were settled in rounds three and four (#141).
What stays open is measurement, not decision:

- the budgets, the fallback threshold and phone performance (stage 2);
- which image model Codex serves (the first file's metadata);
- whether generated assets hold one style across five scenes (stage 2);
- the unverified place facts (§11), each checked before its scene is modelled;
- the work evidence that was never supplied (§1.4), so scenes stay generic where it is missing;
- which of the 386 tests a new `/` breaks (stage 0).
