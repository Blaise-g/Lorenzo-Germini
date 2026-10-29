import {
  Group,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Camera,
  type IUniform,
  type Object3D,
} from "three";

import type { PathStepSlug } from "@/data/path.types";

import { beatFor, HOP_REACH, HOPPERS, type Beat } from "./beats";
import { glowEnvelope, hopBeat, HOP_BEAT_MS } from "./motion";
import type { Paint } from "./paint";
import {
  LANDMARK_LIGHT,
  playOwn,
  restOwn,
  swell,
  type BeatTurn,
} from "./piece-beats";
import { softDisc } from "./world";

/* The board's life (v3; the benchmark's §4(d)): what plays on top of the
   build. The narration's beats, the props beside the path hopping as the
   pawn passes, and the dust its landing kicks up. The runtime owns the
   clocks and tells this module when to move on; nothing here is text. */

/** Something the board did that has a sound (`src/app/path/sound.tsx`). */
export type SceneEvent =
  | "hop"
  | "land"
  | "rise"
  | "beat-high"
  | "beat-low"
  | "skip"
  | "end";

/** A piece on a tile, as its beats and hops move it. */
export type LifePiece = {
  slug: PathStepSlug;
  /** Its id in the tile's layout (`board.ts`). */
  piece: string;
  /** The piece's handle: beats and hops move it and the parts under it
   *  that they name (`piece-beats.ts`), inside the piece's rise. */
  beater: Group;
  /** How lit each of a generated landmark's materials is, for a `light`
   *  beat; empty for a piece modelled in code. */
  lit(): readonly IUniform<number>[];
  /** Whether it is standing, so a hop or a beat shows. */
  shown(): boolean;
};

/** How far a hopping piece leaves the ground, in scene units. */
const HOP_HEIGHT = 0.32;
/** The dust kicked up by a landing (§4(d)): this many sprites, for this
 *  long. */
export const DUST_COUNT = 12;
export const DUST_MS = 720;

type Playing = {
  target: LifePiece;
  beat: Beat;
  turn: BeatTurn;
  ms: number;
};

type Hop = { object: Object3D; ms: number; base: { y: number; z: number } };

export function createLife(options: {
  board: Group;
  camera: Camera;
  paint: Paint;
  emit(event: SceneEvent): void;
}) {
  const { board, camera, paint, emit } = options;
  const pieces = new Map<PathStepSlug, LifePiece[]>();
  const playing: Playing[] = [];
  /** The beats that have ended and whose end state stands, until their
   *  tile rests. */
  const ended: Playing[] = [];
  const hops: Hop[] = [];
  /** What has hopped on this move already: once a pass. */
  const hopped = new Set<Object3D>();
  /** The water's surge and calm as beats leave it. */
  const water = { surge: 0, calm: 0 };
  /** The side props beside the path, which hop too. */
  const sideProps: Object3D[] = [];
  board.traverse((node) => {
    if (node.userData.hopper) sideProps.push(node);
  });

  /* ─── The dust ─── */

  /* The stock's own dust, a little warm, repainted with the board. */
  const dustMaterial = paint.material(
    { base: "paper", toward: "ink-warm", amount: 0.22 },
    { roughness: 1 },
  );
  dustMaterial.transparent = true;
  dustMaterial.depthWrite = false;
  dustMaterial.alphaMap = softDisc();
  const dust = new InstancedMesh(
    new PlaneGeometry(1, 1),
    dustMaterial,
    DUST_COUNT,
  );
  dust.visible = false;
  /* Its sprites move to each landing; a culling sphere would stay at the
     first. */
  dust.frustumCulled = false;
  dust.renderOrder = 3;
  /* Kept out of picking: the runtime casts only at the tiles. */
  board.add(dust);
  let dustMs = DUST_MS;
  const dustAt = new Vector3();
  const dustScale = { value: 1 };

  const matrix = new Matrix4();
  const facing = new Quaternion();
  const boardTurn = new Quaternion();
  const place = new Vector3();
  const size = new Vector3();

  function poseDust() {
    dust.visible = dustMs < DUST_MS;
    if (!dust.visible) return;
    const u = dustMs / DUST_MS;
    const out = 1 - (1 - u) ** 3;
    /* Each sprite faces the camera, in the board's turned frame. */
    board.getWorldQuaternion(boardTurn).invert();
    facing.copy(boardTurn).multiply(camera.quaternion);
    for (let i = 0; i < DUST_COUNT; i++) {
      const angle = (i / DUST_COUNT) * Math.PI * 2 + (i % 3) * 0.35;
      const reach = (0.25 + 0.75 * out) * (0.7 + (0.3 * ((i * 7) % 5)) / 4);
      place.set(
        dustAt.x + Math.cos(angle) * reach * dustScale.value,
        dustAt.y +
          (0.06 + 0.28 * out * (0.6 + 0.4 * (i % 2))) * dustScale.value,
        dustAt.z + Math.sin(angle) * reach * dustScale.value,
      );
      size.setScalar((0.14 + 0.26 * out) * dustScale.value);
      matrix.compose(place, facing, size);
      dust.setMatrixAt(i, matrix);
    }
    dust.instanceMatrix.needsUpdate = true;
    dustMaterial.opacity = 0.5 * (1 - u) ** 1.6;
  }

  /* ─── Beats ─── */

  function play(entry: Playing, ms: number) {
    const { target, beat, turn } = entry;
    const span = beat.ms;
    const at = Math.min(ms, span);
    switch (beat.kind) {
      case "own":
        playOwn(target.beater, target.piece, at, beat, turn, paint);
        break;
      case "rise":
        swell(target.beater, at, span);
        break;
      case "light": {
        const glow = glowEnvelope(at, span);
        const lit = target.lit();
        if (lit.length > 0) {
          for (const each of lit) each.value = LANDMARK_LIGHT * glow;
        } else {
          /* A stand-in has no texture to light, and its panes are shared
             with every building on the board: it swells instead. */
          swell(target.beater, at, span);
        }
        break;
      }
      case "surge":
        water.surge = glowEnvelope(at, span);
        paint.setWater(water.surge, water.calm);
        break;
      case "calm":
        water.calm = glowEnvelope(at, span);
        paint.setWater(water.surge, water.calm);
        break;
    }
  }

  /** Stops `entry`'s beat where it ends, and holds that end state, so a
   *  piece remade under it (a model swapping in) is put back in it. */
  function end(entry: Playing) {
    play(entry, entry.beat.ms);
    const same = ended.findIndex(
      (each) =>
        each.target.slug === entry.target.slug &&
        each.target.piece === entry.target.piece,
    );
    if (same >= 0) ended.splice(same, 1);
    ended.push(entry);
  }

  return {
    /** Registers a tile's pieces, replacing any it had. A beat playing on
     *  a piece replaced, as a model swaps in, plays on in its place. */
    setTile(slug: PathStepSlug, list: LifePiece[]) {
      pieces.set(slug, list);
      for (const entry of [...playing, ...ended]) {
        if (entry.target.slug !== slug) continue;
        const next = list.find((each) => each.piece === entry.target.piece);
        if (next) entry.target = next;
      }
      /* A beat that has ended keeps its end state on the new piece. */
      for (const entry of [...ended]) {
        if (entry.target.slug === slug) end(entry);
      }
    },

    /** Starts the beat a cue about `prop` plays, if it has one and its
     *  piece stands; under `reduced` motion, shows its end state at once.
     *  Returns the beat played. */
    cue(
      slug: PathStepSlug,
      prop: string | null,
      turn: BeatTurn,
      reduced: boolean,
    ): Beat | undefined {
      const beat = beatFor(slug, prop);
      const target = beat
        ? pieces.get(slug)?.find((each) => each.piece === beat.piece)
        : undefined;
      if (!beat || !target || !target.shown()) return undefined;
      /* One beat on a piece at a time: the newer takes over. */
      const already = playing.findIndex((each) => each.target === target);
      if (already >= 0) playing.splice(already, 1);
      const entry = { target, beat, turn, ms: 0 };
      if (reduced) end(entry);
      else playing.push(entry);
      emit(beat.pitch === "high" ? "beat-high" : "beat-low");
      return beat;
    },

    /** Puts a tile's pieces back as built, as it builds again. */
    restTile(slug: PathStepSlug) {
      for (let i = playing.length - 1; i >= 0; i--) {
        if (playing[i].target.slug === slug) {
          end(playing[i]);
          playing.splice(i, 1);
        }
      }
      for (let i = ended.length - 1; i >= 0; i--) {
        if (ended[i].target.slug === slug) ended.splice(i, 1);
      }
      for (const each of pieces.get(slug) ?? []) {
        restOwn(each.beater, paint);
        for (const lit of each.lit()) lit.value = 0;
      }
    },

    /** A new move starts: everything may hop once more. */
    startMove() {
      hopped.clear();
    },

    /** The pawn's foot is at `foot` (world space): what it passes, hops. */
    passing(foot: Vector3) {
      const candidates: Object3D[] = [...sideProps];
      for (const list of pieces.values()) {
        for (const each of list) {
          if (HOPPERS.includes(each.piece) && each.shown()) {
            candidates.push(each.beater);
          }
        }
      }
      for (const object of candidates) {
        if (hopped.has(object) || hops.some((hop) => hop.object === object)) {
          continue;
        }
        object.getWorldPosition(place);
        if (Math.hypot(place.x - foot.x, place.z - foot.z) > HOP_REACH) {
          continue;
        }
        hopped.add(object);
        hops.push({
          object,
          ms: 0,
          base: { y: object.position.y, z: object.rotation.z },
        });
      }
    },

    /** `object` hops once, as a prop beside the path does: a piece whose
     *  model arrived after it stood, so the swap reads as a hop. */
    hop(object: Object3D) {
      if (hops.some((hop) => hop.object === object)) return;
      hops.push({
        object,
        ms: 0,
        base: { y: object.position.y, z: object.rotation.z },
      });
    },

    /** The pawn landed at `at` (the board's frame), `scale` a hero tile's. */
    landed(at: Vector3, scale: number) {
      dustAt.copy(at);
      dustScale.value = scale;
      dustMs = 0;
      poseDust();
    },

    /** Moves everything on by `ms` (0 while frozen). */
    tick(ms: number) {
      for (let i = playing.length - 1; i >= 0; i--) {
        const entry = playing[i];
        entry.ms += ms;
        if (entry.ms >= entry.beat.ms) {
          end(entry);
          playing.splice(i, 1);
        } else play(entry, entry.ms);
      }
      for (let i = hops.length - 1; i >= 0; i--) {
        const hop = hops[i];
        hop.ms += ms;
        const pose = hopBeat(hop.ms);
        hop.object.position.y = hop.base.y + pose.lift * HOP_HEIGHT;
        hop.object.rotation.z = hop.base.z + pose.tilt;
        hop.object.scale.set(
          1 / Math.sqrt(pose.squash),
          pose.squash,
          1 / Math.sqrt(pose.squash),
        );
        if (hop.ms >= HOP_BEAT_MS) hops.splice(i, 1);
      }
      if (dustMs < DUST_MS) {
        dustMs = Math.min(dustMs + ms, DUST_MS);
        poseDust();
      }
    },

    /** Whether anything is still playing. */
    active() {
      return playing.length > 0 || hops.length > 0 || dustMs < DUST_MS;
    },

    /** Ends everything at once: under reduced motion, or a skip. */
    finish() {
      for (const entry of playing) end(entry);
      playing.length = 0;
      for (const hop of hops) {
        hop.object.position.y = hop.base.y;
        hop.object.rotation.z = hop.base.z;
        hop.object.scale.set(1, 1, 1);
      }
      hops.length = 0;
      dustMs = DUST_MS;
      poseDust();
    },

    dispose() {
      dust.geometry.dispose();
      dust.dispose();
      dustMaterial.alphaMap?.dispose();
    },
  };
}

export type Life = ReturnType<typeof createLife>;
