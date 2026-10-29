/* "How this was made", the foot of `/` on the prototype branch (GH-152;
   storyboard §7.8 in docs/research/experience-rethink.md). Decision 10's
   numbers rule binds this copy too, so the figures — budgets, sizes, times —
   stay in docs/path-measurements.md and the page describes them in words.
   The only digits allowed are inside the terms in `MAKING_OF_NAMES`. */

import { SCENES_WITH_ART } from "@/components/path/scene/build-plan";
import { PATH_STEPS } from "@/data/path";
import type { PathSceneId } from "@/data/path.types";

/** Names and terms that carry a digit, and so the only digits on the section. */
export const MAKING_OF_NAMES = ["C2PA", "Hunyuan3D", "3D"] as const;

/** The scenes the prototype builds, in path order: those with art. */
export const BUILT_SCENES: readonly PathSceneId[] = SCENES_WITH_ART;

export type MakingOfScene = {
  sceneId: PathSceneId;
  place: string;
  inspirations: readonly string[];
  sources: readonly { label: string; href: string }[];
};

/* Sources are the ones `docs/path-assets.md` checked the places against. */
const SCENE_SOURCES: Partial<Record<PathSceneId, MakingOfScene["sources"]>> = {
  home: [
    {
      label: "Bisalta, Wikipedia",
      href: "https://it.wikipedia.org/wiki/Bisalta",
    },
    {
      label: "Cuneo, Wikipedia",
      href: "https://it.wikipedia.org/wiki/Cuneo",
    },
  ],
  turin: [
    {
      label: "Mole Antonelliana, Wikipedia",
      href: "https://it.wikipedia.org/wiki/Mole_Antonelliana",
    },
    {
      label: "Campo magnetico rotante, Wikipedia",
      href: "https://it.wikipedia.org/wiki/Campo_magnetico_rotante",
    },
  ],
  switzerland: [
    {
      label: "Léman, Wikipédia",
      href: "https://fr.wikipedia.org/wiki/L%C3%A9man",
    },
    {
      label: "Jet d'eau de Genève, Wikipédia",
      href: "https://fr.wikipedia.org/wiki/Jet_d%27eau_de_Gen%C3%A8ve",
    },
  ],
  lille: [
    {
      label: "Chambre de commerce de Lille, Wikipédia",
      href: "https://fr.wikipedia.org/wiki/Chambre_de_commerce_de_Lille",
    },
    {
      label: "Vieille Bourse de Lille, Wikipédia",
      href: "https://fr.wikipedia.org/wiki/Vieille_Bourse_de_Lille",
    },
    {
      label: "La Vieille Bourse, Cityzeum",
      href: "https://www.cityzeum.com/vieille-bourse",
    },
  ],
  open: [
    {
      label: "L'eredità, Wikipedia",
      href: "https://it.wikipedia.org/wiki/L%27eredit%C3%A0_(programma_televisivo)",
    },
  ],
};

export const MAKING_OF = {
  heading: "How this was made",
  intro:
    "The path also exists as a 3D walk at /path. This is how that version was made, and what it costs a browser to open it.",
  budgets: {
    title: "Budgets and fallbacks",
    lines: [
      "The board is one scene, with a budget for what it downloads before its first frame, one for the graphics memory it holds and one for each still, and the whole walk has one with everything opened, the 3D runtime and its decoders counted. The board stays under each of them, and every still under its own: on a very wide, high-density screen it is drawn a little softer to stay within its memory. The measurements are in the report in the repository.",
      "A browser without the WebGL it needs, one that reports WebGL would run slowly, one that asks to save data, or one whose first frames come in too slow gets still images of each scene instead, with a line saying why. Nothing on this page loads 3D code.",
    ],
  },
  scenes: {
    title: "Inspirations and sources",
    items: BUILT_SCENES.map((sceneId): MakingOfScene => {
      const step = PATH_STEPS.find((s) => s.sceneId === sceneId);
      if (!step) throw new Error(`No step builds the "${sceneId}" scene`);
      return {
        sceneId,
        place: step.place,
        inspirations: step.illustration.inspirations,
        sources: SCENE_SOURCES[sceneId] ?? [],
      };
    }),
  },
  assets: {
    title: "What was generated, and with what",
    lines: [
      "The board is code: three.js, its tiles, path, water, trees and grass modelled from simple solids and coloured in the site's palette, and so are the parts of its props that move.",
      "The landmarks, the props and the two figures that walk the path are generated: toy-style models that Hunyuan3D made from reference images drawn by OpenAI's gpt-image, through Codex. The stills are renders of the scene.",
      "Images from gpt-image through Codex carry C2PA metadata naming gpt-image, without a version. Making models from them strips it, and the reference images do not ship with the site, so this page says so instead.",
    ],
  },
  voice: {
    title: "The voice",
    lines: [
      "The narration on /path is a stock synthetic voice, the macOS system voice, and is labelled as one where it plays. It is not Lorenzo's voice.",
    ],
  },
} as const;
