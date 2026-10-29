## 5. Recommendation: A, Il Gioco, conditional on round one

**Why A.**

- **The metaphor and the navigation are the same object.** The board is at once the sitemap, the
  progress gauge and the contact panel. That is exactly what every world-site inspected failed at,
  and it makes empathy for the visitor structural, not an add-on.
- **Its structure comes from his life, not a template.** The return to Cuneo is documented once
  **[F]**. It is a pattern only if Cuneo is home **[M]**, so the first grilling question decides
  whether this argument holds.
- **It extends what is already shipped.** It carries forward the route-map rail (#138), the mobile
  route bar (#140) and Warm Print's paper, and doesn't throw them out.
- **It is his own idea, and Italian.** It is one idea carried all the way through, which is what
  the Felix essay rewards.

**The condition.** If round one yields fewer than about four place memories, the board's scenes
fall back to work objects in front of tourist scenery. At that point **B is the better
recommendation**, because its meaning lives in the backstage and the backstage comes from the facts.
C is the fallback only if production capacity turns out to be very small.

**What A borrows from the others.** Nothing structural. The backstage reveal stays B's. A's
discovery moments are its own (below).

### 5.1 How the classic special squares could map, and the risk of each

In the classic board:

- 6 Ponte jumps to 12.
- Every ninth square is an Oca, and you move again.
- 19 Locanda loses turns.
- 31 Pozzo traps you until another player arrives.
- 42 Labirinto sends you back.
- 52 Prigione traps you.
- 58 Morte sends you to the start.

The options below are offered as a menu; they are not proposals.

| Square        | Possible reading                                                                     | Tag | Risk                                                                         |
| ------------- | ------------------------------------------------------------------------------------ | --- | ---------------------------------------------------------------------------- |
| Ponte         | Crossing the Alps from Turin to Lausanne                                             | I   | Low: a bridge is progress                                                    |
| Oca           | Side projects (Ghigliottina, summariser, Quadrell, germinai), where you "move again" | I   | Low, and fun                                                                 |
| Labirinto     | The interior-design MVP: you went in, and came back out on evidence                  | I   | Low if framed as a choice, high if framed as failure                         |
| Pozzo         | GSK and water                                                                        | I   | A pun; "trapped" misreads a year at GSK                                      |
| Locanda       | The teaching year, as a rest                                                         | I   | **High**: calls a deliberate return "lost turns"                             |
| Morte → start | Each return to Cuneo                                                                 | I   | **High**: "death" for coming home. A bespoke "torna a casa" square is better |
| Prigione      | None fits                                                                            | —   | Leave it out                                                                 |

**Recommendation.** Keep Ponte, Oca and Labirinto. Replace Morte with a bespoke "Casa" square that
returns you to Cuneo without penalty. Drop the rest.

### 5.2 Board size

The classic board has 63 squares. The documented stops number about nine, plus four project squares.
There are three honest options:

- **Shorter board.** About 15 squares, all meaningful.
- **63 squares, mostly plain.** On a real board most squares are just numbers and pictures, so the
  plain squares are path, not invented content.
- **63 squares with real counts.** Map the plain squares to something countable and documented. No
  such measure exists yet **[M]**.

This is for the grill. Inventing content to fill 63 squares is off the table.

### 5.3 Storyboard

Tags apply to the _content_ of each scene. Visual treatment is design, not biography.

**Frame 0: arrival (first paint, under 1s, HTML/SVG).**

- **What appears.** The board seen from directly above, lying flat on the paper ground. The spiral
  of squares reads as a map, with each stop named in small caps. A paper token sits on Partenza.
- **The centre panel, "Regole".**
  - His name.
  - One role line **[F]**.
  - Three working principles quoted from his own copy **[F]**: "Technical depth only matters when it
    meets a real user problem"; "killed it on the evidence"; "knowing when they're not".
  - Links to Work, Writing, CV and Contact.
- **Controls.** "Gioca", and "Leggi come elenco" (read as a list). The list is the same squares as
  an `<ol>`, the honest reduced-everything version.
- **No gate.** Nothing waits on JS.

**Frame 1: the board lifts (first interaction).**

- **Motion.** The camera tilts from top-down to a three-quarter tabletop view, and the board gains
  thickness and a soft shadow. Square 1 rises: the first pop-up unfolds on one 0–1 fold value.
- **Reduced motion.** The board stays top-down. Choosing a square opens its scene as a finished,
  flat illustration with a crossfade.
- **Scene.** Square 1 is the starting place. Its content is **[M]** (hometown, high school), with
  "Italy, his roots" **[F, #6]** as the floor.

**Stage: Turin (2017–20) and the Ponte.**

- **Content.** Electrical engineering at the Politecnico **[F]**.
- **Scene.** **[M]**. Without a memory, the scene would show the work object, a circuit and an
  oscilloscope trace, against the Po **[P]**, which is generic.
- **Mechanic.** The Ponte square jumps the token across a paper Alps fold to Lausanne. The fold
  value runs the Alps up and back down **[I]**.

**Stage: Lausanne and EPFL (2020–22).**

- **Content.** Neuroscience and neuroengineering **[F]**. Lake **[P]**.
- **Scene.** **[M]**. Work-object fallback: a neuron drawn as a pop-up branching structure.

**Stage: Basel and Roche (summer 2021).**

- **Content.** A personalized-medicine filling prototype, and a model tuning fill parameters 20%
  faster than manual **[F]**.
- **Scene.** The filling line as a paper mechanism. Pulling a tab fills a vial.
- **Discovery.** Behind the tab, the manual-tuning time and the model's time appear side by side
  **[F]**. This is a work object, so it needs no memory.

**Stage: Geneva and Burgeon (2022), with the thesis.**

- **Content.** Summarising biomedical literature **[F]**.
- **Scene.** A tall stack of paper pages folds itself, page by page, into one small card, the
  TL;DR **[I: summarising is folding]**. The card links to the live Hugging Face space **[F]**.

**Stage: Cuneo, first stay (2022–23), and the Labirinto.**

- **Content.** Teaching maths and physics at his old high school, and the Stable Diffusion
  interior-design MVP **[F]**.
- **Scene.** A pop-up room whose furniture keeps regenerating, card swapped for card, which then
  folds flat.
- **Discovery.** The fold reveals the evidence that killed it: what customer discovery showed is
  **[M]**, because the repo says only "killed it on the evidence".
- **Reading.** This is the Labirinto, entered and left by choice **[I]**. The classroom detail is
  **[M]**.

**Stage: Saint-Amand-les-Eaux and GSK (2023–24).**

- **Content.** Plant sensor data, anomaly detection, a water-rejection strategy projected at
  10,000 m³ a year **[F]**.
- **Scene.** Paper pipes with a gauge.
- **Discovery.** Hovering or focusing the gauge pours 10,000 m³ into a paper basin labelled "four
  Olympic pools" (at the 2,500 m³ minimum volume) **[P, verify the comparison before shipping]**.
- **Optional.** The town's name means water **[P]**. The scene works without the pun.

**Stage: Cuneo again (2024–25), the documented return, and the Casa square.**

- **Content.** The startup: RAG over handwritten content, leading two developers **[F]**.
- **Scene.** Handwritten pages feed through a paper parser and come out as clean cards.
- **Mechanic.** Landing here sends the token home along a short drawn arrow, the board's
  acknowledgement that the path returns **[F]**. Why it returns is **[M]**.

**Oca squares (scattered, "move again").**

- **Ghigliottina** **[F]**: a playable round. Five clue cards turn over, and you type the
  connecting word. It needs one authored puzzle with its answer, which is a game fact, not a
  personal one.
- **germinai** **[F, #53]**: a seed that sprouts. Its growth counts the squares you have visited,
  so it is a progress gauge with a meaning.
- **Quadrell** **[F]**: a small shopfront.
- **Summariser**: folded into the Geneva stage.

**Centre: Cuneo, now (2025–), square 63.**

- **Content.** Complaion: the agentic core of an ISO-compliance platform, "and knowing when they're
  not" reliable **[F]**.
- **Scene.** The token reaches the centre and the rules panel opens fully: about, work, writing,
  contact.

**Exit.**

- **On arrival.** At the centre, the board offers three ways out:
  - email (`mailto`, one press);
  - the CV (the existing `/cv` and PDF);
  - "Stampa il gioco": a printable board of his life, Tearaway-style, which doubles as a leave-behind.
- **The back of the sheet.** Turning the board over shows how it was made: budgets, fallbacks,
  sources, credits. That follows Felix's "Made by mechanical means", and it is where principled
  thinking is shown, not claimed.

### 5.4 Cross-cutting design for A

- **Mobile.**
  - The spiral unrolls into a vertical path, the shape the current mobile route bar already draws.
  - One square fills the screen at a time, and pop-ups are pre-rendered plates (Lumino-style)
    rather than live 3D.
  - Tap or swipe advances. The centre panel is a fixed sheet you can pull up from the bottom.
- **Keyboard.**
  - The board is an ordered list of links in square order, and Tab walks it.
  - ← and → move the token, Enter opens a scene, Escape returns to the board.
  - A skip link jumps to the rules panel. Focus rings stay at 3:1 against paper.
- **Screen readers.**
  - Each scene renders its content as real HTML (a heading, a paragraph, links) beside or under the
    canvas. The canvas is decorative and `aria-hidden`.
  - The markdown siblings and `llms.txt` read the same data module.
- **Reduced motion.**
  - A designed version, not a degraded one: top-down board, no camera, scenes appear finished, and
    the fold value jumps to 1.
  - This retires the "opacity-only" rule for the experience.
- **Audio.**
  - Off by default. A named "Sound on" control in the chrome is stored in `localStorage`, following
    Josh Comeau.
  - Foley only: card on card, a die on board, the token tap, paper folding.
  - One short ambience per place, under 300 KB, fetched only after opt-in and only for the current
    scene. Optionally, each landing plays one note, in Monument Valley's manner.
  - No music, unless it is his.
- **Loading budget.** Proposed targets, all unmeasured:

  | Asset               | Budget                                                       |
  | ------------------- | ------------------------------------------------------------ |
  | First paint         | Under 200 KB, including the board SVG                        |
  | Scene engine        | Loaded on first interaction or idle, on capable devices only |
  | Each desktop scene  | Under 1.5 MB, lazy                                           |
  | A full desktop tour | Under 8 MB, a quarter of Felix's                             |
  | Each mobile plate   | Under 200 KB                                                 |

  If WebGL2 is missing or slow (Felix's gate), the plates replace the scenes.

- **Direct access.**
  - Name, role, the four links and the email are in the first paint.
  - Every square has a URL, so a link to the GSK stage lands on the GSK stage.
  - The hub and `/cv` remain reachable regardless of the answer to the placement question.

## 6. Asset production

How the pop-ups get made is the largest unknown. There are three routes, and they can be mixed.

1. **Real paper, photographed or scanned.**
   - Lorenzo cuts and folds each scene and photographs it under one light, as Lumino City did.
   - Most recognisably his, and the making-of is itself a story. Also the slowest, and live 3D
     would need photogrammetry or 2.5D layering.
2. **Procedural paper in Blender with baked light.**
   - Felix's route: Blender scripted by agents, Cycles bakes and KTX2 textures.
   - Fast to iterate and consistent across scenes. Risks looking generated, which is exactly what
     the Ambient Current deferral (#27) warned about: it passed every metric and failed the visual
     bar.
3. **SVG and CSS 3D flats.**
   - Cheapest and lightest, with no WebGL at all. It is good for B. For A, the pop-ups would look
     like cards rather than paper engineering.

**Effort.** No estimate is offered per scene. It depends on the route, on who does the art, and on
how many scenes there are (5 to 13). A disposable prototype of **one** stage, rendered by each
route, would replace the guess with a measurement.

## 7. Stretch target: recognisable with the name and titles removed

Strip the name and the job titles, and today the world would read as "an Italian engineer who
worked in Swiss pharma and French manufacturing and now does AI". Recognisable to a recruiter,
not to a friend. What still prevents more:

1. **No personal objects.** Every scene above that is not **[M]** is built from work objects and
   public scenery. Unpacking works because the objects are _someone's_. Today the world has nothing
   only Lorenzo would own.
2. **Generic Italian imagery.** Gioco dell'oca, Gianduja and the Mole belong to everyone from Turin
   or Piedmont. They become his only through a memory attached to them, and that memory is **[M]**.
3. **No hand.** Nothing on the site is drawn, written or photographed by him. The portrait is a
   studio shot, and the LG mark was generated (#88, #92). A handwritten label, his own photograph of
   a place, or a paper model he folded would each do more than any shader.
4. **No sound of his.** If there is audio, it is stock foley unless he records it.
5. **What is already his.** The voice ("the advice changes every two days anyway"), the
   principles ("killed it on the evidence"), the germinai pun and the Ghigliottina oracle. These
   should be load-bearing in whatever is built.

## 8. Feasibility uncertainties

- **Phone performance.** WebGL frame rate on mid-range Android is unmeasured. Every reference was
  checked on a desktop GPU.
- **Weight budgets.** The figures above are targets, not measurements. The only data points are
  the references' 6.7–31 MB.
- **Pop-up engineering in realtime.** Hinged planes on a fold parameter look easy in principle and
  hard to make convincing. Unprototyped.
- **The test suite.** If the board takes `/`, the 386-test suite breaks before any document does,
  and most retained-proof tests would need replacing, not editing.
- **Cache Components.** The scene engine should be a client island under a static board. Untested,
  but low-risk by the AGENTS.md rules.
- **The colour model.** Shader and texture colours sit outside the seven-role model. They need a
  new ADR on whether scene art is exempt, as `warm-print.ts` is exempt from the guard.
- **Fonts.** If the board uses period lettering, new typefaces affect the OG subsets and the PDF.
- **Who makes the art, and how long they have.** Unknown, and it decides section 6.
- **Research gaps.** Sabuda/Reinhart, presepi and Obra Dinn are listed in section 3 as not
  covered.
