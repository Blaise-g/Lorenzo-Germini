import type { PathSceneId } from "@/data/path.types";

import type { SceneDefinition } from "./definition";
import { HOME_SCENE } from "./home";

/** The art for each scene that has it. Its keys are `SCENES_WITH_ART` in
 *  `build-plan.ts`, which the host reads without loading three.js; a spec
 *  holds the two equal, so a scene added to one is added to both. */
export const SCENES: Partial<Record<PathSceneId, SceneDefinition>> = {
  home: HOME_SCENE,
};
