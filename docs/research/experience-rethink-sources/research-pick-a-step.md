# Path you can explore out of order: research report

I made no changes to the repo. Screenshots are in `/tmp/path-refs/`. I used two muted browser sessions; `pgrep -fl "agent-browser|Chrome for Testing"` came back empty after each one closed. **O** means I saw it live. **I** means I inferred it, mostly from reading Felix's public JS (`desktop.js`, `channels/*.js`). **R** means a source reports it. I measured no page weights: the classifier blocked direct HEAD requests to his asset host.

## 1. Felix Rieseberg's tapes

- **Picking a tape [O].** `/#work` brings up the legal pad: 11 entries plus Podcasts. The same entries exist as real DOM buttons in a hidden region underneath. Clicking one does this:
  - The pad header reads "tape 01 · loading…", then "now playing".
  - The entry opens at the top of the pad with a 2–3 line description and one link.
  - The list entry gets a ▶, and an aria-live region announces "Now playing: Anthropic".
  - The cassette leaves its stack, the VCR display shows the tape number, and the CRT goes blue, then shows the picture. Hovering shows the label "PLAY · NOTION".
- **What a tape is.**
  - **[O]** The Notion tape is drawn frames: a title card, a "Notion for desktop" mock page, then an "UNDER THE HOOD" stack diagram. The network log fetched `notion.js` and no video for it. Only Anthropic fetched `film.mp4` and `sound.mp3`.
  - **[I]** Each tape is a small 2D-canvas ES module (Notion is about 37 KB of source) that runs in a scene table: Notion is 7 scenes, 43.2 s, looped. Lengths run from 32 s (Stripe) to 90 s (Anthropic's own ad, the only real film). The page adds the VHS/CRT look on top. The text on the pad is the caption: no tape has subtitles.
  - **[O]** The Anthropic tape was still playing at about 105 s, and the code confirms it loops.
- **Build moment [I].** Before anything plays, the cassette flies from its stack into the VCR along a curve: 1.05 s, plus 0.22 s to thread. Any tape already in is ejected first.
- **Controls [I, not pressed live].**
  - The 3D VCR has PLAY, STOP, REW and FF. While a tape plays, REW and FF skip scenes inside it; otherwise they change tape.
  - Clicking the zoomed screen moves to the next scene. EJECT is the VCR door.
  - There is no scrubbing.
  - Keys: 1–6 are the TV buttons, N shows or hides the notes, Z zooms, and Esc steps back (zoom, then pad, then home).
- **URL [O].** It stays `/#work`: tapes have no fragment of their own. Back leaves Work.
- **Already seen [O].** Nothing marks it. The ▶ only shows what is playing now, and a played tape goes back on top of its stack.
- **Left alone [I].** At home the TV plays a home film, then puts each tape in by itself in shelf order. That stops at the visitor's first pick.
- **Phone [O, iPhone 14 emulation].** A pinned index card ("CH 02 WORK", with HIDE and HOME) replaces the pad. The TV above it says "INSERT TAPE · PICK A TAPE FROM THE DESK". Picking an entry plays that tape on the TV.
- **Reduced motion.**
  - **[O]** With reduced motion on, the Notion tape still played.
  - **[I]** The `reduce` flag only turns camera flights into cuts and caps the glitch effect. Tape modules are never given it.
- **Static version [O].** `?plain=1` shows each tape as a text paragraph with its link.
- **Back home [O].** HOME on the card, Esc, or the nav.
- **⚠ Conflicts with §3.** With `?gate=1` I saw **"CLICK TO ENTER" on the CRT and a Sound switch that starts ON [O]**. The code skips this gate and the tape cycle whenever `navigator.webdriver` is set **[I]**. So the "no enter gate" and "sound off by default" findings in §3 were probably side effects of automated browsing, and real visitors get a gate with sound on. The doc should be corrected.

## 2. "Pick an object, it plays"

- **Return of the Obra Dinn [R]** ([Wikipedia](https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn)).
  - Using the watch on a corpse plays the audio of the seconds before death, then the moment frozen in 3D, which you can walk around.
  - The narrative is nonlinear, and a logbook fills in "automatically" with each death.
  - Fates are confirmed "only in sets of three". This is the best model of a "seen" state that means something.
- **Her Story [R]** ([Wikipedia](<https://en.wikipedia.org/wiki/Her_Story_(video_game)>)). You type searches to reach 271 short clips in any order. A "database checker" turns each red box green once the clip is watched.
- **What Remains of Edith Finch [R]** ([Wikipedia](https://en.wikipedia.org/wiki/What_Remains_of_Edith_Finch)). Each bedroom is a shrine, and an object in it starts a vignette in its own medium. But the house is "semi-linear" and the journal is revealed in order, so it is weaker as a non-sequential reference than it seems.
- **Unpacking [R]** ([Wikipedia](<https://en.wikipedia.org/wiki/Unpacking_(video_game)>)). Eight stages named by year, mostly wordless, with more than 14,000 foley sounds. It is linear.
- **Gone Home [R].** Exploration is partly non-linear and gated, with audio logs. The source doesn't say exactly what triggers them, so I make no claim.
- I dropped the Mario overworld because I couldn't source its marking rules.

## 3. "Something builds"

- **igloo.inc [O].** A loading line on grey, then an igloo whose blocks keep drifting and settling, with numbered tracker labels. Across about 12 s it never fully locked into place. Sound is Off. There are no interactive elements in the accessibility tree, and one scroll changed nothing visible. It assembles only loosely and never finishes, so it reads as mood rather than a build that ends.
- **jesse-zhou.com [O].** A START gate. The ramen stall is whole from the first frame, and the camera pulls back. Nothing assembles, and the accessibility tree is empty after START.
- **Apple product pages [R]** ([CSS-Tricks](https://css-tricks.com/?p=308477), [GSAP forum](https://gsap.com/community/forums/topic/25188-airpods-image-sequence-animation-using-scrolltrigger/)). The assembly is a pre-rendered image sequence drawn to a canvas frame by frame as you scroll. That makes it scrubbable and easy to stop on the finished state.
- **Townscaper [R]** ([Game Developer](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)). Placement uses wave function collapse. I found no source for the timing of its springy placement.
- **Felix's cassette insert (§1)** is the cheapest real "build" I found: one object, about 1 s, on a curve.

## 4. The reference video

- **[R]** "Mr. RIP" is Giorgio, born in Rome in 1977, a software engineer in Switzerland since 2012, 7.5 years at Google, and the author of Retire In Progress, a financial-independence blog ([about](https://retireinprogress.com/about/about-me/)). He streams on Twitch ([Chartable](https://chartable.com/podcasts/tablerone-podcast)).
- **[R]** Pioltello appears in the title of his TABlerone Podcast episode 6, "Intelligenza Artificiale e Tiro al Pioltello" ([YouTube](https://www.youtube.com/watch?v=9HtAjZemchU)). A search summary of the [finfluencer page](https://www.finfluencer.digital/awards/it/it-finfluencers/mr-rip) mentions "investments in Pioltello"; his own about page doesn't.
- **[I]** The props match his life (money bags for FIRE, the Swiss case, YouTube and Twitch for his channels), so the video is probably his channel or stream intro.
- I couldn't find the video itself or a source for the mushroom mascot.
- **Upshot:** the reference tells someone else's life. Borrow its grammar (path, one prop cluster per step, camera dolly, overlay) and none of its props.

## 5. Career path as navigation

- **Robby Leonardi's interactive résumé, 2013 [R]** ([Laughing Squid](https://laughingsquid.com/designer-creates-a-super-mario-bros-inspired-interactive-resume/)). Scroll drives a character through skills, then the job timeline, ending on contact. It is linear.
- **ArcGIS StoryMaps map tours [R]** ([Esri](https://www.esri.com/arcgis-blog/?p=1019191)). The "Explorer" layout lets readers open points in any order. Each point carries media plus narrative text, and can include audio.
- From §3: Paolo De Lucia's landmarks up Bay Street, and Felix's pad.
- I found nothing live with a narrated caption for each step.

## Variations for Lorenzo

The steps come only from `resume-data.tsx` and §1.1: Cuneo (teaching; the MVP "killed on the evidence"), Turin (BSc), Switzerland (EPFL; Roche "20% faster"; Burgeon), Lille/GSK ("10,000 m³ a year", projected), Cuneo again (Stealth EdTech, Complaion), and "?".

**V1. Tapes from the board (Felix's model, inside §7).**

- **Draws on:** Felix's pad and tapes; Her Story's green boxes.
- **What you do:** pick any space. A cassette slides into a slot in the board's centre (about 1 s), and a drawn canvas program plays: 4–6 scenes, 25–40 s, looped. Each scene's caption is a deed line, and it is real DOM text in an aria-live region, not burned into the picture.
- **Seen state:** a tick on the space.
- **Proof and contact:** role, dates, results and Email stay in the card beside the program.
- **Phone:** the same program in the expanded row.
- **Reduced motion:** a captioned still per scene, with Next. This goes further than Felix, as §7.6 requires.
- **Cost:** low to moderate. One module per step, no 3D.

**V2. The diorama builds on the space (fits §7.5).**

- **Draws on:** Felix's insert; Apple's frame-sequence scrub; igloo.inc as the counter-example.
- **What you do:** "Open the world". The step's props drop onto the tile in order, about 1.5 s. Each piece lands with its caption (EPFL, then the Roche dial with "20% faster…", then Burgeon), and the camera stays put.
- **Controls:** skippable with a click or Esc.
- **Reduced motion:** the end state at once.
- **Cost:** high. Five 3D worlds, which is the plan §7 already has.

**V3. The lawn path, chaptered (the owner's reference, made non-linear).**

- **Draws on:** the reference video; Felix's Anthropic film tape; StoryMaps Explorer.
- **What it is:** one pre-rendered Blender dolly along a checkered path, cut into 6 chapters of 6–8 s. Each chapter: the camera arrives, the cluster builds, the caption appears.
- **What you do:** a row of step chips seeks straight to any chapter.
- **Phone:** the same video.
- **Reduced motion:** the poster still for each chapter.
- **Proof:** in the DOM under the video.
- **Cost:** moderate. It is mostly render time; the weight is unmeasured.
- **Trade-off:** it departs from live 3D, and changing a chapter means re-rendering it.

**V4. Voice first, then the frozen scene (Obra Dinn).**

- **What you do:** pick a step. Over a dark frame, 2–3 s of a caption line plays, plus Lorenzo's voice if he records it; that recording is a missing input (**M**). Then the frozen diorama fades in, and his "logbook" (the CV) fills that row.
- **Cost:** moderate. It needs voice lines he has to write and record.

## My pick

**V1 first, with V2 as the upgrade.**

- V1 covers all three wishes: you pick out of order, something builds (the insert), and a caption plays.
- Felix's own code shows a "tape" is a small drawn program rather than video, so it is cheap, light and easy to update, and it ships from documented facts alone.
- It sits inside §7 without reopening the board decision.
- It fixes Felix's two gaps: no seen state, and tapes that ignore reduced motion.
- Each V1 program can later become a V2 build without the visitor-facing structure changing. V3 is the fastest way to match his reference visually, but it gives up the board's live worlds and makes every copy change a re-render.

Sources:

- https://retireinprogress.com/about/about-me/
- https://chartable.com/podcasts/tablerone-podcast
- https://www.youtube.com/watch?v=9HtAjZemchU
- https://www.finfluencer.digital/awards/it/it-finfluencers/mr-rip
- https://en.wikipedia.org/wiki/Return_of_the_Obra_Dinn
- https://en.wikipedia.org/wiki/Her_Story_(video_game)
- https://en.wikipedia.org/wiki/What_Remains_of_Edith_Finch
- https://en.wikipedia.org/wiki/Unpacking_(video_game)
- https://en.wikipedia.org/wiki/Gone_Home
- https://css-tricks.com/?p=308477
- https://gsap.com/community/forums/topic/25188-airpods-image-sequence-animation-using-scrolltrigger/
- https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making
- https://laughingsquid.com/designer-creates-a-super-mario-bros-inspired-interactive-resume/
- https://www.esri.com/arcgis-blog/?p=1019191
