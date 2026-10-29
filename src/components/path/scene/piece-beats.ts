import {
  Euler,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type IUniform,
  type Object3D,
} from "three";

import type { Beat } from "./beats";
import { bump, easeInOut, glowEnvelope, spring } from "./motion";
import type { Paint } from "./paint";

/* The pieces' own beats (`beats.ts`'s `own`), played on a piece's root
   handle and on the parts it names. A piece is any `Object3D`: one built in
   code (`props.ts`) or a generated model swapped in for it later. A beat
   that moves a part — the dial's needle, the coils' rotor, the window's
   shutters — finds it by its node name, `BEAT_NODE`, which a model names
   the same; it moves the part relative to the pose it was built in, so a
   model's own rest pose is kept. A piece missing its parts swells whole
   instead, the way a landmark does, so a beat never silently does
   nothing. */

/** The node names a beat looks for under a piece. A generated model of the
 *  piece names its parts these to get its own beat. */
export const BEAT_NODE = {
  /** The coils' windings (several) and their rotor: rotor spins on y. */
  coil: "coil",
  rotor: "rotor",
  /** The Roche dial's needle: swings on z. */
  needle: "needle",
  /** The MVP window's glass, which lights, and its shutters (several),
   *  hinged on y, which close. */
  glass: "glass",
  shutter: "shutter",
  /** The Lille clock's hand: sweeps on z. */
  hand: "hand",
  /** The pipe loop's tube, drawn in the board's flowing pipe material. */
  pipe: "pipe",
  /** The startup desk's monitor screen, which glows. */
  screen: "screen",
  /** The blank card's empty clue slots (several), which pulse in turn. */
  slot: "slot",
  /** The Jet d'Eau's plume: falls and climbs on y. */
  plume: "plume",
} as const;

/** Which of a prop's cues this is, for a beat told across several. */
export type BeatTurn = { nth: number; last: boolean };

type RestPose = { position: Vector3; rotation: Euler; scale: Vector3 };

/** A part's pose as built, kept the first time a beat moves it. */
const rests = new WeakMap<Object3D, RestPose>();

function restOf(node: Object3D): RestPose {
  let rest = rests.get(node);
  if (!rest) {
    rest = {
      position: node.position.clone(),
      rotation: node.rotation.clone(),
      scale: node.scale.clone(),
    };
    rests.set(node, rest);
  }
  return rest;
}

function parts(root: Object3D, name: string): Object3D[] {
  const found: Object3D[] = [];
  root.traverse((node) => {
    if (node.name === name) found.push(node);
  });
  return found;
}

/** The materials under `node` a light can warm. */
function materialsOf(node: Object3D): MeshStandardMaterial[] {
  const made: MeshStandardMaterial[] = [];
  node.traverse((each) => {
    if (!(each instanceof Mesh)) return;
    for (const material of [each.material].flat()) {
      if (material instanceof MeshStandardMaterial) made.push(material);
    }
  });
  return made;
}

/** Lights `nodes` by `amount`: through a generated model's grade
 *  (`grade.ts`), or as a glow lent to a code-built material. */
function glow(paint: Paint, nodes: Object3D[], amount: number) {
  for (const node of nodes) {
    for (const made of materialsOf(node)) {
      const lit = made.userData.inkLit as IUniform<number> | undefined;
      if (lit) lit.value = Math.min(amount, 1.5);
      else paint.boost(made, amount);
    }
  }
}

/** A whole piece swelling up and settling: the beat a piece without its
 *  named parts plays. */
export function swell(root: Object3D, ms: number, span: number) {
  const up = bump(ms, span);
  root.scale.set(1 - 0.03 * up, 1 + 0.08 * up, 1 - 0.03 * up);
}

type OwnBeat = {
  /** The parts it needs, all of them, to play. */
  needs: readonly string[];
  play(
    find: (name: string) => Object3D[],
    root: Object3D,
    ms: number,
    beat: Beat,
    turn: BeatTurn,
    paint: Paint,
  ): void;
};

/** How far the dial's needle swings back up from its mark, in radians. */
const NEEDLE_SWING = Math.PI * 0.91;

const OWN: Readonly<Record<string, OwnBeat>> = {
  /* Each coil swells in turn, round the rotor, and the rotor spins up and
     coasts to where it stood. */
  coils: {
    needs: [BEAT_NODE.coil, BEAT_NODE.rotor],
    play(find, root, ms, { ms: span }) {
      find(BEAT_NODE.coil).forEach((coil, i) => {
        coil.scale
          .copy(restOf(coil).scale)
          .multiplyScalar(1 + 0.16 * bump(ms - i * 260, 560));
      });
      for (const rotor of find(BEAT_NODE.rotor)) {
        rotor.rotation.y =
          restOf(rotor).rotation.y +
          easeInOut(Math.min(ms / span, 1)) * Math.PI * 6;
      }
    },
  },
  /* The needle swings back up the dial and settles on its mark. */
  "roche-dial": {
    needs: [BEAT_NODE.needle],
    play(find, root, ms, { ms: span }) {
      for (const needle of find(BEAT_NODE.needle)) {
        needle.rotation.z =
          restOf(needle).rotation.z + NEEDLE_SWING * bump(ms, span);
      }
    },
  },
  /* The plume falls to a stub of spray, then climbs back on a spring, a
     little past its height and down. */
  "jet-d-eau": {
    needs: [BEAT_NODE.plume],
    play(find, root, ms) {
      const FALL_MS = 160;
      const height =
        ms < FALL_MS
          ? 1 - 0.8 * easeInOut(ms / FALL_MS)
          : 0.2 + 0.8 * spring(ms - FALL_MS, 900, 0.2);
      for (const plume of find(BEAT_NODE.plume)) {
        plume.scale.y = restOf(plume).scale.y * height;
      }
    },
  },
  /* Its story across its cues (§4(d)): it lights as the MVP is built,
     holds while it is worked on, and on the last cue dims and its shutters
     swing closed. */
  "mvp-window": {
    needs: [BEAT_NODE.glass],
    play(find, root, ms, { ms: span }, { nth, last }, paint) {
      const u = Math.min(ms / span, 1);
      let lit: number;
      let closed = 0;
      if (last && nth > 0) {
        lit = 1 - easeInOut(Math.min(u * 1.6, 1));
        closed = spring(Math.max(ms - span * 0.35, 0), 700, 0.12, span);
      } else if (nth === 0) {
        lit = easeInOut(u);
      } else {
        lit = 1 + 0.4 * bump(ms, span);
      }
      glow(paint, find(BEAT_NODE.glass), 2.2 * lit);
      /* Shut from wherever its rest pose opened it, about its hinge. */
      for (const shutter of find(BEAT_NODE.shutter)) {
        shutter.rotation.y = restOf(shutter).rotation.y * (1 - closed);
      }
    },
  },
  /* The hand sweeps once round and comes back to its mark. */
  "clock-face": {
    needs: [BEAT_NODE.hand],
    play(find, root, ms, { ms: span }) {
      for (const hand of find(BEAT_NODE.hand)) {
        hand.rotation.z =
          restOf(hand).rotation.z -
          Math.PI * 2 * easeInOut(Math.min(ms / span, 1));
      }
    },
  },
  /* Water runs the loop once: a bright slug travelling the tube, which
     only the board's own pipe material draws; a pipe in any other
     material swells whole. */
  "pipe-loop": {
    needs: [BEAT_NODE.pipe],
    play(find, root, ms, { ms: span }, _turn, paint) {
      const drawn = find(BEAT_NODE.pipe).some(
        (pipe) => pipe instanceof Mesh && pipe.material === paint.pipeFlow,
      );
      if (drawn) paint.pipeBeat.value = ms >= span ? -1 : ms / span;
      else swell(root, ms, span);
    },
  },
  /* The monitor glows on, brightest as its cue starts. */
  "startup-desk": {
    needs: [BEAT_NODE.screen],
    play(find, root, ms, { ms: span }, _turn, paint) {
      glow(paint, find(BEAT_NODE.screen), 1.8 * glowEnvelope(ms, span));
    },
  },
  /* The five slots pulse once each, left to right, and stay empty. */
  blank: {
    needs: [BEAT_NODE.slot],
    play(find, root, ms) {
      find(BEAT_NODE.slot).forEach((slot, i) => {
        const up = bump(ms - i * 190, 520);
        const rest = restOf(slot);
        slot.position.y = rest.position.y + 0.06 * up;
        slot.scale.set(
          rest.scale.x * (1 + 0.1 * up),
          rest.scale.y,
          rest.scale.z * (1 + 0.1 * up),
        );
      });
    },
  },
};

/** Whether `root` has every part `piece`'s own beat moves. */
export function hasOwnParts(piece: string, root: Object3D): boolean {
  const own = OWN[piece];
  return !!own && own.needs.every((name) => parts(root, name).length > 0);
}

/** Plays `piece`'s own beat on `root`, `ms` into it; at `beat.ms` or later,
 *  its end state. `root` is the piece's handle, which the beat may scale
 *  whole when the piece lacks its parts. */
export function playOwn(
  root: Object3D,
  piece: string,
  ms: number,
  beat: Beat,
  turn: BeatTurn,
  paint: Paint,
) {
  const own = OWN[piece];
  if (!own || !hasOwnParts(piece, root)) {
    swell(root, ms, beat.ms);
    return;
  }
  own.play((name) => parts(root, name), root, ms, beat, turn, paint);
}

/** Puts every part a beat moved under `root` back as built, and its glow
 *  and the pipe's slug out. */
export function restOwn(root: Object3D, paint: Paint) {
  root.traverse((node) => {
    const rest = rests.get(node);
    if (rest) {
      node.position.copy(rest.position);
      node.rotation.copy(rest.rotation);
      node.scale.copy(rest.scale);
    }
  });
  for (const name of [BEAT_NODE.glass, BEAT_NODE.screen]) {
    glow(paint, parts(root, name), 0);
  }
  if (parts(root, BEAT_NODE.pipe).length > 0) paint.pipeBeat.value = -1;
  root.scale.set(1, 1, 1);
}
