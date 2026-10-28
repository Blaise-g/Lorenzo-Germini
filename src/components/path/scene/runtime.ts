import {
  BackSide,
  Box3,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";

import type { PathStep } from "@/data/path.types";

import {
  buildPlan,
  litLines,
  TURN_LIMIT,
  type BuildPlan,
  type BuildState,
} from "./build-plan";
import type { SceneDefinition, SceneKit } from "./definition";
import {
  decideFallback,
  FRAME_SAMPLE_SIZE,
  type CapabilitySignals,
  type FallbackReason,
} from "./fallback";
import { SCENES } from "./scenes";
import {
  isDarkMode,
  readPalette,
  type Palette,
  type PaletteRole,
} from "./palette";

/* The 3D path's scene runtime (GH-148): vanilla three.js, imported
   dynamically by the host on `/path` only, after the overlay has painted
   (GH-141, implementation decision 6). It renders one scene at a time from a
   fixed camera with a limited turn, builds the selected step's props in about
   2–3 s, then stops drawing: the end is a still composition, and nothing
   loops or advances on its own (decision 8). */

const TURN_RADIANS = Math.PI / 4;
const TURN_MS = 450;
const THEME_MS = 350;
const DROP_HEIGHT = 3.2;
const OUTLINE_WIDTH = 0.035;
/** How long a lost context may take to come back before the stills. */
const CONTEXT_RESTORE_MS = 3000;
/** Frames longer than this count as a pause (a hidden tab, a debugger), and
 *  the build's clock does not jump across them. */
const MAX_STEP_MS = 100;
const CAMERA_FOV = 30;
const CAMERA_ELEVATION = 0.42;

export type SceneSnapshot = {
  buildState: BuildState;
  lit: readonly number[];
  /** The props in view, landed or dropping, in the scene's own order. */
  shown: readonly string[];
  turn: number;
};

export type SceneRuntimeOptions = {
  canvas: HTMLCanvasElement;
  signals: CapabilitySignals;
  reducedMotion: boolean;
  onChange(snapshot: SceneSnapshot): void;
  onFallback(reason: FallbackReason): void;
};

export type SceneRuntime = {
  /** Cuts to `step`'s scene and builds it, or to nothing if it has no art. */
  show(step: PathStep): void;
  /** Jumps the build to its end state; false if nothing was building. */
  skip(): boolean;
  /** Builds the shown step again from its standing props. */
  replay(): void;
  turn(direction: -1 | 1): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
};

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** A drop: it falls under gravity, then settles with one small bounce. */
function dropOffset(t: number) {
  if (t >= 1) return 0;
  const fall = 0.8;
  if (t < fall) return DROP_HEIGHT * (1 - (t / fall) ** 2);
  const bounce = (t - fall) / (1 - fall);
  return DROP_HEIGHT * 0.05 * Math.sin(Math.PI * bounce);
}

export function createSceneRuntime(options: SceneRuntimeOptions): SceneRuntime {
  const { canvas, signals, onChange, onFallback } = options;
  let reducedMotion = options.reducedMotion;

  /* Throws when the browser refuses a context, including one with a major
     performance caveat that the host's probe did not see; the host catches it
     and shows the stills. */
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    failIfMajorPerformanceCaveat: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 80);
  const pivot = new Group();
  scene.add(pivot);
  const hemisphere = new HemisphereLight(0xffffff, 0xffffff, 1.6);
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(-4, 9, 6);
  scene.add(hemisphere, sun);
  const fog = new Fog(0xffffff, 18, 34);
  scene.fog = fog;

  /* Light and dark mixed by one uniform that follows the site's class
     (storyboard §7.9): 0 is light, 1 is dark. Only the active mode's tokens
     can be read, so each mode's palette is read when the site is in it; the
     other starts as a copy and is never shown before it is read. */
  const themeMix = { value: isDarkMode() ? 1 : 0 };
  const firstPalette = readPalette();
  const palettes: { light: Palette; dark: Palette } = {
    light: firstPalette,
    dark: firstPalette,
  };
  let themeFrom = themeMix.value;
  let themeTarget = themeMix.value;
  let themeElapsed = THEME_MS;

  const surfaces = new Map<PaletteRole, MeshLambertMaterial>();
  const flats = new Map<string, MeshBasicMaterial>();
  const outline = new MeshBasicMaterial({ side: BackSide });
  const geometries = new Set<BufferGeometry>();

  function surface(role: PaletteRole) {
    let material = surfaces.get(role);
    if (!material) {
      material = new MeshLambertMaterial({ flatShading: true });
      surfaces.set(role, material);
      paint();
    }
    return material;
  }

  function flat(role: PaletteRole, opacity: number) {
    const key = `${role}:${opacity}`;
    let material = flats.get(key);
    if (!material) {
      material = new MeshBasicMaterial({
        transparent: opacity < 1,
        opacity,
        fog: true,
      });
      flats.set(key, material);
      paint();
    }
    return material;
  }

  /* Every colour in the scene is a mix of its role's light and dark value. */
  function paint() {
    const mix = (role: PaletteRole) =>
      palettes.light[role].clone().lerp(palettes.dark[role], themeMix.value);
    for (const [role, material] of surfaces) material.color.copy(mix(role));
    for (const [key, material] of flats) {
      material.color.copy(mix(key.split(":")[0] as PaletteRole));
    }
    outline.color.copy(mix("outline"));
    fog.color.copy(mix("fog"));
    scene.background = mix("fog");
    hemisphere.groundColor.copy(mix("ground"));
  }

  /* The fog's colour is the scene's background from the very first render,
     so nothing drawn before a scene loads can flash black over the still. */
  paint();

  const kit: SceneKit = {
    solid(geometry, role) {
      geometries.add(geometry);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox ?? new Box3();
      const size = box.getSize(new Vector3());
      const centre = box.getCenter(new Vector3());
      const holder = new Group();
      holder.add(new Mesh(geometry, surface(role)));
      /* The outline is the inverted hull: the same geometry drawn back-faced,
         grown about its centre by a constant width on every axis. */
      const hull = new Mesh(geometry, outline);
      hull.scale.set(
        1 + (2 * OUTLINE_WIDTH) / Math.max(size.x, 0.01),
        1 + (2 * OUTLINE_WIDTH) / Math.max(size.y, 0.01),
        1 + (2 * OUTLINE_WIDTH) / Math.max(size.z, 0.01),
      );
      hull.position.set(
        centre.x * (1 - hull.scale.x),
        centre.y * (1 - hull.scale.y),
        centre.z * (1 - hull.scale.z),
      );
      holder.add(hull);
      return holder;
    },
    pane(geometry, role, opacity = 1) {
      geometries.add(geometry);
      return new Mesh(geometry, flat(role, opacity));
    },
  };

  /* ─── The shown scene and its build ─── */

  let definition: SceneDefinition | undefined;
  let base: Object3D | undefined;
  let props = new Map<string, Object3D>();
  let plan: BuildPlan | undefined;
  let buildElapsed = 0;
  let buildState: BuildState = "idle";
  let lit: readonly number[] = [];
  let shown: readonly string[] = [];
  let turnStep = 0;
  let turnFrom = 0;
  let turnElapsed = TURN_MS;

  function emit() {
    onChange({ buildState, lit, shown, turn: turnStep });
  }

  function loadScene(next: SceneDefinition | undefined) {
    if (next === definition) return;
    pivot.clear();
    for (const geometry of geometries) geometry.dispose();
    geometries.clear();
    props = new Map();
    base = undefined;
    definition = next;
    if (!next) return;
    base = next.base(kit);
    pivot.add(base);
    for (const [id, make] of Object.entries(next.props)) {
      const prop = make(kit);
      prop.visible = false;
      prop.userData.restY = prop.position.y;
      props.set(id, prop);
      pivot.add(prop);
    }
    frame();
  }

  /* Puts every prop where `buildElapsed` says it is. */
  function pose() {
    if (!plan) return;
    for (const prop of props.values()) prop.visible = false;
    for (const id of plan.standing) {
      const prop = props.get(id);
      if (prop) {
        prop.visible = true;
        prop.position.y = prop.userData.restY;
      }
    }
    for (const planned of plan.building) {
      const prop = props.get(planned.id);
      if (!prop) continue;
      const t =
        (buildElapsed - planned.startsAt) /
        (planned.landsAt - planned.startsAt);
      prop.visible = t >= 0;
      prop.position.y = prop.userData.restY + dropOffset(Math.max(t, 0));
    }
    const nextLit = litLines(plan, buildElapsed);
    const nextShown = [...props]
      .filter(([, prop]) => prop.visible)
      .map(([id]) => id);
    if (nextLit.join() !== lit.join() || nextShown.join() !== shown.join()) {
      lit = nextLit;
      shown = nextShown;
      emit();
    }
  }

  function setBuildState(next: BuildState) {
    if (next === buildState) return;
    buildState = next;
    emit();
  }

  function finish() {
    if (!plan) return;
    buildElapsed = plan.building.at(-1)?.landsAt ?? 0;
    pose();
    setBuildState("built");
    requestFrame();
  }

  function startBuild() {
    if (!plan) return;
    buildElapsed = 0;
    lit = [];
    if (reducedMotion) {
      /* Reduced motion is a designed state: the end, at once (decision 12). */
      finish();
      return;
    }
    pose();
    /* Emitted even when already building: a cut from one step's build to
       another's clears the lit lines too. */
    buildState = "building";
    emit();
    requestFrame();
  }

  /* ─── The camera ─── */

  function frame() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (!definition) return camera.updateProjectionMatrix();
    const vertical = (CAMERA_FOV * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance =
      definition.frameRadius / Math.sin(Math.min(vertical, horizontal) / 2);
    const [x, y, z] = definition.target;
    camera.position.set(
      x,
      y + distance * Math.sin(CAMERA_ELEVATION),
      z + distance * Math.cos(CAMERA_ELEVATION),
    );
    camera.lookAt(x, y, z);
    camera.far = distance * 2.5;
    fog.near = distance * 0.9;
    fog.far = distance * 1.9;
    camera.updateProjectionMatrix();
  }

  /* ─── The frame loop: runs only while something is moving ─── */

  let frameRequest = 0;
  let lastTime: number | undefined;
  let paused = document.visibilityState === "hidden";
  let contextLost = false;
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  let fellBack = false;
  const frameTimes: number[] = [];

  function moving() {
    return (
      buildState === "building" ||
      turnElapsed < TURN_MS ||
      themeElapsed < THEME_MS ||
      frameTimes.length < FRAME_SAMPLE_SIZE
    );
  }

  function requestFrame() {
    if (frameRequest || paused || contextLost || fellBack) return;
    frameRequest = requestAnimationFrame(tick);
  }

  function fallBack(reason: FallbackReason) {
    if (fellBack) return;
    fellBack = true;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    onFallback(reason);
  }

  function tick(time: number) {
    frameRequest = 0;
    const delta = lastTime === undefined ? 0 : time - lastTime;
    lastTime = time;

    /* The first `FRAME_SAMPLE_SIZE` frame times decide the fallback; a frame
       that spans a pause is not a frame time. */
    if (delta > 0 && delta < 1000 && frameTimes.length < FRAME_SAMPLE_SIZE) {
      frameTimes.push(delta);
      if (frameTimes.length === FRAME_SAMPLE_SIZE) {
        const reason = decideFallback(signals, frameTimes);
        if (reason) return fallBack(reason);
      }
    }

    const step = Math.min(delta, MAX_STEP_MS);
    if (buildState === "building" && plan) {
      buildElapsed += step;
      if (buildElapsed >= (plan.building.at(-1)?.landsAt ?? 0)) finish();
      else pose();
    }
    if (turnElapsed < TURN_MS) {
      turnElapsed = Math.min(turnElapsed + step, TURN_MS);
      const t = easeInOut(turnElapsed / TURN_MS);
      pivot.rotation.y = (turnFrom + (turnStep - turnFrom) * t) * TURN_RADIANS;
    }
    if (themeElapsed < THEME_MS) {
      themeElapsed = Math.min(themeElapsed + step, THEME_MS);
      const t = easeInOut(themeElapsed / THEME_MS);
      themeMix.value = themeFrom + (themeTarget - themeFrom) * t;
      paint();
    }

    renderer.render(scene, camera);
    canvas.dataset.pathSceneRendered = "true";
    if (moving()) requestFrame();
    else lastTime = undefined;
  }

  /* A hidden tab pauses rendering; the build resumes where it stopped. */
  function onVisibility() {
    paused = document.visibilityState === "hidden";
    if (paused) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    }
    lastTime = undefined;
    requestFrame();
  }

  /* A lost context pauses too, and one that does not come back drops to the
     stills (storyboard §7.4). three.js restores its own state on restore. */
  function onContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    restoreTimer = setTimeout(
      () => fallBack("context-lost"),
      CONTEXT_RESTORE_MS,
    );
  }

  function onContextRestored() {
    clearTimeout(restoreTimer);
    contextLost = false;
    lastTime = undefined;
    requestFrame();
    renderer.render(scene, camera);
  }

  function onThemeChange() {
    const dark = isDarkMode();
    const target = dark ? 1 : 0;
    if (target === themeTarget) return;
    palettes[dark ? "dark" : "light"] = readPalette();
    themeFrom = themeMix.value;
    themeTarget = target;
    if (reducedMotion) {
      themeMix.value = target;
      themeElapsed = THEME_MS;
      paint();
      renderer.render(scene, camera);
      return;
    }
    themeElapsed = 0;
    requestFrame();
  }

  const themeObserver = new MutationObserver(onThemeChange);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const resizeObserver = new ResizeObserver(() => {
    frame();
    if (definition && !frameRequest && !contextLost && !fellBack) {
      renderer.render(scene, camera);
    }
  });
  resizeObserver.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  return {
    show(step) {
      const next = SCENES[step.sceneId];
      loadScene(next);
      turnStep = 0;
      turnElapsed = TURN_MS;
      pivot.rotation.y = 0;
      if (!next) {
        plan = undefined;
        lit = [];
        shown = [];
        buildState = "idle";
        emit();
        return;
      }
      plan = buildPlan(step);
      startBuild();
    },
    skip() {
      if (buildState !== "building") return false;
      finish();
      return true;
    },
    replay() {
      if (plan) startBuild();
    },
    turn(direction) {
      const next = Math.max(
        -TURN_LIMIT,
        Math.min(TURN_LIMIT, turnStep + direction),
      );
      if (next === turnStep) return;
      turnFrom = pivot.rotation.y / TURN_RADIANS;
      turnStep = next;
      emit();
      if (reducedMotion) {
        pivot.rotation.y = turnStep * TURN_RADIANS;
        turnElapsed = TURN_MS;
        renderer.render(scene, camera);
        return;
      }
      turnElapsed = 0;
      requestFrame();
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      if (reduced && buildState === "building") finish();
    },
    dispose() {
      cancelAnimationFrame(frameRequest);
      clearTimeout(restoreTimer);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      for (const geometry of geometries) geometry.dispose();
      const materials: Material[] = [
        ...surfaces.values(),
        ...flats.values(),
        outline,
      ];
      for (const material of materials) material.dispose();
      renderer.dispose();
    },
  };
}
