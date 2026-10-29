## Generated assets for the life-path scenes (GPT Image 2.5 and image-to-3D)

Labels: **R** = reported, with a link. **O** = I checked it directly. **I** = my inference. I generated nothing and ran no image-to-3D tool, so every quality and file-size claim below is R or I. OpenAI's announcement and Terms pages returned 403, so those points come from the developer docs, the system card and a search summary of the Terms.

### 1. GPT Image 2.5

- **Name and ids.** The name is right, but it is a family of two models, not a single id. The ids are `gpt-image-2.5-flare` ("fast, high-quality everyday") and `gpt-image-2.5-sunburst` ("most capable… editing precision"), with snapshots `-2026-09-08`. Both were released on 8 Sep 2026. **R** ([Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare), [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)). The edit endpoint defaults to Sunburst **R** ([edit ref](https://developers.openai.com/api/reference/resources/images/methods/edit)). There is no plain `gpt-image-2.5` id **O**.
- **Sizes.** Any `WxH` with edges divisible by 16 and an aspect ratio between 1:3 and 3:1. The maximum is 3840×2160, and anything above 2560×1440 is "experimental". Quality levels are low, medium, high, xhigh and max **R** ([guide](https://developers.openai.com/api/docs/guides/image-generation)).
- **Transparency.** Both models support `background: "transparent"` with PNG or WebP output **R** (guide). The guide warns that a drawn checkerboard is not real alpha, so the alpha channel needs checking **R** ([prompting guide](https://developers.openai.com/api/docs/guides/image-prompting)).
- **Editing and references.** Inpainting works with a mask, but "masking is entirely prompt-based", so the model may not follow the mask's shape **R** (guide). The edit endpoint accepts "up to 16 images". That figure is stated for GPT image models in general, not for 2.5 specifically **R** (edit ref). Multi-turn editing goes through the Responses API **R**. The model pages contradict themselves on whether Responses is supported **O**.
- **Consistency.** The docs say recurring characters or brand elements "may not stay visually consistent across generations". They also say precise placement of elements is difficult and that camera specs are "appearance cues, not exact physical simulation" **R** (guide, prompting guide). The documented mitigations are to number each reference and say what it is for, pass the previous output forward, restate the constraints each time, and composite approved regions back in rather than re-prompting them **R**. Fine-tuning is not supported, so you cannot train a house style **R** (model pages).
- **Text.** Text rendering is "significantly improved" but still weak on precise placement **R**. Text inside a scene should therefore stay in HTML, not in the image **I**.
- **Cost.** Image input is $8 per million tokens and image output $30 per million ($15 on Batch). These are the same token rates as GPT Image 2 **R** (model pages). OpenAI publishes no per-image token count or dollar table for 2.5, so measure cost from the `usage` field **O**. The only proxy is GPT Image 2 at 1024²: $0.006 low, $0.053 medium, $0.211 high **R** (guide).
- **Rate limits.** The default tiers are 20, 150 and 250 images per minute **R**. Organisation verification may be required **R**.
- **Codex.** The launch post says 2.5 is rolling out to Codex users **R** ([community post](https://community.openai.com/t/introducing-gpt-images-2-5-in-the-api-and-chatgpt/1395897)). Unofficial wrappers and users disagree: Codex hard-codes `gpt-image-2`, one user's PNG metadata reads "2.0", there is no way to choose Flare or Sunburst and no size or quality flags, and `codex exec` takes 4–6 minutes **R, unofficial** (e.g. [gpt-image-bridge](https://github.com/oakplank/gpt-image-bridge)). So Codex suits exploring a style, and production needs an API key **I**.
- **Rights and provenance.** You own the Output and OpenAI assigns you its rights, "if any". The Terms add that output may not be unique **R** ([Terms](https://openai.com/policies/terms-of-use/)). Whether the output is copyrightable at all is unsettled **I**. Images from ChatGPT, Codex and the API carry C2PA metadata plus a SynthID watermark **R** ([system card](https://deploymentsafety.openai.com/chatgpt-images-2-5/chatgpt-images-2-5.pdf)). Editing or converting a file "can remove its metadata". No rule says you must keep it, but deliberately evading the watermark is barred **R** ([provenance guide](https://developers.openai.com/api/docs/guides/content-provenance)). Converting to KTX2 or WebP will therefore strip the C2PA metadata as a side effect **I**.

### 2. Turning 2D generations into scene assets

**Using images as-is.**

- Backdrops behind a lake, posters and phone stills, and decals or textures on code-built geometry all suit the model's strengths: they need no exact geometry **I**.
- Isometric sprites are the weak case. The model does not hold a camera angle exactly, so the perspective of sprites drifts against a code-built path **R/I**.
- Workaround: render a grey-box still of the code scene from its fixed camera, pass it as image 1 with "keep geometry and camera", and let the model paint it. The painted still can then be projected back onto the same geometry **I**.

**Image-to-3D.**

- **Hunyuan3D 2.1:** the licence "DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA" **R** ([LICENSE](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE)). It is unavailable to an EU-based owner.
- **TRELLIS.2:** MIT licence and needs a 24 GB GPU. The example export is 1M triangles with a 4096² texture, which is the opposite of web-light, so heavy decimation is required. The RMBG-2.0 helper is non-commercial **R** ([repo](https://github.com/microsoft/TRELLIS.2)).
- **Stable Fast 3D:** free under $1M annual revenue, under a second per model, with a UV-unwrapped mesh and delighting. The polygon count is only described as "relatively low" **R** ([card](https://huggingface.co/stabilityai/stable-fast-3d)).
- **Tripo API:** $0.01 per credit, 20–30 credits per model, with Smart Low-poly at +10 and Quad at +5 **R** ([pricing](https://developers.tripo3d.ai/en/pricing)). That is roughly $0.30–0.45 per model **I**.
- **Meshy:** 20–30 credits per model. The API requires Pro ($20/month) or above, paid plans get a private commercial licence, and free output is CC BY **R** ([docs](https://docs.meshy.ai/en/webapp/pricing)).
- **Rodin Gen-2:** the API needs Business at $120/month. Quad mode takes 1k–200k faces, with Gen-2.5 presets of 4k, 8k, 18k and 50k **R** ([API spec](https://developer.hyper3d.ai/api-specification/rodin-generation-gen2)).
- **Web weight:** at 4–18k faces with Draco or meshopt compression and one 1024² KTX2 texture, a prop should land in the low hundreds of KB **I**. That is far heavier than a lathe-built piece, which is a few KB of code **I**.

**Which path keeps one style across five scenes and their props.** Code geometry with one palette does **I**. Image-to-3D inherits whatever drift exists between its source images, and adds its own artefacts on top: a back side the model has to invent and lighting baked into the texture **I**. This matches the conclusions of §6.2 and §9.

### 3. Landmarks (cautious, not legal advice)

- **Copyright.**
  - Mole Antonelliana: Antonelli died in 1888.
  - Lille's Chamber of Commerce belfry: Cordonnier died in 1940 **R** ([Wikipedia](https://en.wikipedia.org/wiki/Louis_Marie_Cordonnier)).
  - Vieille Bourse: 1653.
  - All three are out of copyright at life + 70 **I**. The limited or missing freedom of panorama in Italy and France ([Commons](https://commons.wikimedia.org/wiki/Commons:Freedom_of_panorama)) therefore does not bite on copyright here **I**.
- **The live issue is Italian.** The heritage code (Codice dei beni culturali, arts. 107–108) gives a right over images of public cultural heritage. Courts enforced it against commercial reproductions in Venice in 2022 (Ravensburger's Vitruvian Man puzzle) and Florence in 2023 (GQ and the David) **R** ([Wolters Kluwer](https://legalblogs.wolterskluwer.com/copyright-blog/michelangelos-david-and-cultural-heritage-images-the-italian-pseudo-intellectual-property-and-the-end-of-public-domain/)). The Comune di Torino owns the Mole **R**. Art. 108(3-bis) frees non-profit uses for "creative expression" **R**.
- **How it applies here.** A stylised toy on a personal site plausibly falls under that exemption. A portfolio that solicits paid work weakens the non-profit reading, and no court has ruled on stylisation **I**.
- **OpenAI policy.** The system card raises realistic images of real places only as a deepfake risk **R**. I found nothing restricting stylised buildings **O**.

### 4. Why generated assets look generic

- Preference and RL tuning pushes image models towards the same modes. The diversity-collapse literature documents this ([DiverseGRPO](https://arxiv.org/abs/2512.21514)) **R**, which is why default output converges on the same look **I**.
- The defences come from the reference games in §6.2:
  - a fixed camera and three colours (Monument Valley);
  - one palette and one signature per city (Mini Metro);
  - authored generators (Tiny Glade).
- Translated into this pipeline **I**:
  - Set palette, camera, outlines, fog and grain in code, not in prompts.
  - Keep one small, versioned reference set of 3–4 images that the owner approves.
  - Quantise every generated texture to the site's colour tokens in post-processing.
  - Reject outputs by hand against the board's own pieces.

### Recommended pipeline

1. **GPT Image 2.5, via the API.** Use Flare for exploring and Sunburst for edits.
   - What it produces: per-scene backdrops (Bisalta, the Alps across Lake Geneva), poster and phone stills painted over grey-box renders, decals and surface textures, and mood references.
   - Codex is for sketching only.
   - Budget: about 5 scenes × ~6 assets × ~5 iterations ≈ 150 images. At GPT Image 2 high prices that is about $30, so plan on $30–100 to be safe **I**. Measure the real cost through `usage`.
2. **Code** keeps all geometry: the path, the props and the landmark pieces as lathe, extrude and bevel forms. It also keeps the palette, camera, outlines, fog and the build animation. This preserves §6.2 and keeps the scenes light.
3. **Image-to-3D only as an experiment**, for at most one or two hero props (perhaps the Mole's silhouette). Use Tripo (about $0.45 per model) or Rodin's low quad preset. Gate it on a measured file size of 300 KB or less and a style match. Hunyuan3D is excluded.

**Main risks:**

- Style drift across the set: the docs say so outright.
- There is no published per-image cost for 2.5.
- Codex may still be serving 2.0.
- Italy's heritage-image right over the Mole.
- C2PA metadata is lost on transcode, so if provenance disclosure matters, state it in the page copy.
- Generated assets slide back into the saturated "floating island" look unless code owns the style.
