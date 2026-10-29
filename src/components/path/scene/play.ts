import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
  type Group,
  type Object3D,
} from "three";

import { squashScale } from "./motion";
import {
  BEAT_NODE,
  glint,
  glow,
  materialsOf,
  parts,
  restOf,
} from "./piece-beats";
import type { Paint } from "./paint";
import { softDisc } from "./world";

/* Play on the board (v3): what a click on a piece does, the marker duo's
   gestures, and the board's occasional moments. All of it is springs, so a
   new click retargets the motion where it is rather than queueing behind
   it, and a quick second click adds to the first: a piece shaken twice
   shakes a little harder (Emil Kowalski's design engineering; Bruno
   Simon's portfolio). Each spring drives one channel of one node — its
   height, squash, a lean or a turn, or a glow — as an offset from where the
   node stood when the spring began: a beat's held end state, or its built
   pose. Springs on the same channel, a click's and a gesture's, add up
   there (`compose`), and a beat that moves the node under them moves where
   they settle. Nothing here is text. */

/** What a spring moves on its node. */
type Channel =
  /** Up and down, along the node's own y, and along its x (a jab). */
  | "y"
  | "x"
  /** Squashed down (negative) or stretched up, keeping its volume. */
  | "squash"
  /** Leaning about its foot, sideways and back. */
  | "lean"
  | "pitch"
  /** Turned about its own vertical axis, or its face's axis (a needle). */
  | "turn"
  | "dial"
  /** Lit, through the board's glow or a landmark's grade. */
  | "glow"
  /** Lit through a generated landmark's grade only: a code piece's
   *  materials are shared with others, which must not light with it. */
  | "glint";

/** How a spring settles: its stiffness and damping, mass 1. Bouncy ones
 *  for things that are touched; soft ones for what turns. */
type Feel = { stiffness: number; damping: number };

/** A tap's answer: quick, with one small overshoot (damping ratio 0.4). */
export const SNAPPY: Feel = { stiffness: 420, damping: 16 };
/** A gesture's: slower and rounder (0.55). */
export const SOFT: Feel = { stiffness: 180, damping: 15 };
/** A turn toward a new heading, which should land and not swing (0.8). */
export const TURN: Feel = { stiffness: 70, damping: 13.5 };

type Spring = {
  node: Object3D;
  channel: Channel;
  feel: Feel;
  x: number;
  v: number;
  target: number;
};

/* ─── One writer per node and channel ─── */

/** What a channel writes on its node: lean and dial both turn it on z. */
const PROPERTY: Record<Channel, string> = {
  y: "y",
  x: "x",
  squash: "scale",
  lean: "z-turn",
  dial: "z-turn",
  pitch: "x-turn",
  turn: "y-turn",
  glow: "glow",
  glint: "glint",
};

/** A node's property as springs hold it: the value under them, as the
 *  node last had it without them, and each spring's offset. */
type Composed = {
  under: number[];
  /** What the springs last wrote, read back: anything else found there
   *  was written by something else (a beat), and is the new `under`. */
  written: number[];
  offsets: Map<Spring, number>;
};

/** Shared by every Play, so a click's spring and a gesture's on the same
 *  node compose rather than overwrite each other. */
const composed = new WeakMap<Object3D, Map<string, Composed>>();

function lightOf(paint: Paint, node: Object3D, boosted: boolean): number {
  const [made] = materialsOf(node);
  if (!made) return 0;
  const lit = made.userData.inkLit as { value: number } | undefined;
  if (lit) return lit.value;
  return boosted ? paint.boostOf(made) : 0;
}

function read(paint: Paint, node: Object3D, property: string): number[] {
  switch (property) {
    case "y":
      return [node.position.y];
    case "x":
      return [node.position.x];
    case "scale":
      return node.scale.toArray();
    case "z-turn":
      return [node.rotation.z];
    case "x-turn":
      return [node.rotation.x];
    case "y-turn":
      return [node.rotation.y];
    case "glow":
      return [lightOf(paint, node, true)];
    default:
      return [lightOf(paint, node, false)];
  }
}

function write(
  paint: Paint,
  node: Object3D,
  property: string,
  value: number[],
) {
  const [v] = value;
  switch (property) {
    case "y":
      node.position.y = v;
      break;
    case "x":
      node.position.x = v;
      break;
    case "scale":
      node.scale.fromArray(value);
      break;
    case "z-turn":
      node.rotation.z = v;
      break;
    case "x-turn":
      node.rotation.x = v;
      break;
    case "y-turn":
      node.rotation.y = v;
      break;
    case "glow":
      glow(paint, [node], v);
      break;
    default:
      glint(node, v);
  }
}

/** `under` with every spring's offset: added, or multiplied for a squash,
 *  which keeps the volume; a light is lent only, never taken. */
function compose(property: string, under: number[], offsets: number[]) {
  if (property === "scale") {
    const squash = offsets.reduce((all, x) => all * (1 + x), 1);
    const [x, y, z] = under;
    return squashScale(Math.max(squash, 0.4), { x, y, z });
  }
  const light = property === "glow" || property === "glint";
  const sum = offsets.reduce((all, x) => all + (light ? Math.max(x, 0) : x), 0);
  return [under[0] + sum];
}

const same = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);

const SUBSTEP_MS = 8;
/** At rest when this near its target and this slow. */
const REST = { x: 0.0015, v: 0.01 };

/** A piece a click can reach: its id in the tile's layout, or the duo's
 *  `figure` and `buddy`, and its handle. */
export type Reactor = { piece: string; handle: Group; root: Object3D };

/** A click on the same piece within this long counts toward escalating. */
const AGAIN_MS = 1400;

export function createPlay(options: { paint: Paint; board: Group }) {
  const { paint, board } = options;
  const springs = new Map<string, Spring>();
  /** Impulses a gesture has scheduled, `at` ms from now. */
  const later: { at: number; run: () => void }[] = [];
  let ids = 0;
  const idOf = new WeakMap<Object3D, number>();
  const key = (node: Object3D, channel: Channel) => {
    if (!idOf.has(node)) idOf.set(node, ++ids);
    return `${idOf.get(node)}:${channel}`;
  };

  function spring(node: Object3D, channel: Channel, feel: Feel) {
    const k = key(node, channel);
    let each = springs.get(k);
    if (!each) {
      restOf(node);
      each = { node, channel, feel, x: 0, v: 0, target: 0 };
      springs.set(k, each);
    }
    each.feel = feel;
    return each;
  }

  /** Kicks `node`'s `channel` with velocity `v`, on top of where it is. */
  function kick(node: Object3D, channel: Channel, v: number, feel = SNAPPY) {
    spring(node, channel, feel).v += v;
  }

  /** Moves `channel`'s target by `by`, from wherever it is heading. */
  function retarget(node: Object3D, channel: Channel, by: number, feel = TURN) {
    spring(node, channel, feel).target += by;
  }

  /** Writes `each`'s offset onto its node with every other spring's on the
   *  same property; at rest, takes it off, and the last off leaves the
   *  node as it stands without them. */
  function apply(each: Spring, resting = false) {
    const { node } = each;
    const property = PROPERTY[each.channel];
    let onNode = composed.get(node);
    if (!onNode) composed.set(node, (onNode = new Map()));
    const now = read(paint, node, property);
    let entry = onNode.get(property);
    if (!entry) {
      entry = { under: now, written: now, offsets: new Map() };
      onNode.set(property, entry);
    } else if (!same(now, entry.written)) entry.under = now;
    if (resting) entry.offsets.delete(each);
    else entry.offsets.set(each, each.x);
    write(
      paint,
      node,
      property,
      entry.offsets.size > 0
        ? compose(property, entry.under, [...entry.offsets.values()])
        : entry.under,
    );
    entry.written = read(paint, node, property);
    if (entry.offsets.size === 0) onNode.delete(property);
  }

  /* ─── The halo: hover, and reduced motion's answer to a click ─── */

  /* A soft pool of lamplight on the tile under a piece: no motion, only
     light, so it is reduced motion's whole answer to a click, and a fine
     pointer's hint that a piece answers one. Made the first time it is
     wanted, so a Play that only gestures never has one. */
  let halo: Mesh<PlaneGeometry, MeshBasicMaterial> | null = null;
  function haloMesh() {
    if (halo) return halo;
    halo = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({
        color: paint.lampColour.value,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        alphaMap: softDisc(),
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.renderOrder = 2;
    halo.visible = false;
    board.add(halo);
    return halo;
  }
  const haloLevel = { x: 0, v: 0, target: 0 };
  let haloOn: Reactor | null = null;
  const box = new Box3();
  const size = new Vector3();
  const foot = new Vector3();

  function placeHalo(on: Reactor) {
    box.setFromObject(on.handle);
    box.getSize(size);
    box.getCenter(foot);
    foot.y = box.min.y + 0.03;
    board.worldToLocal(foot);
    const halo = haloMesh();
    halo.position.copy(foot);
    const across = Math.max(size.x, size.z) / board.scale.x;
    halo.scale.setScalar(Math.min(Math.max(across * 1.5, 0.8), 4));
  }

  function showHalo(on: Reactor | null, level: number) {
    if (on) {
      haloOn = on;
      placeHalo(on);
    }
    haloLevel.target = on ? level : 0;
  }

  /* ─── What a click does ─── */

  const clicks = new Map<string, { n: number; at: number }>();
  /** Every click the buddy has had, so it spins and jabs by turns. */
  let buddyClicks = 0;
  let clock = 0;

  /** How hard a click on `piece` plays: harder for a quick second or
   *  third, never more than half again. */
  function escalation(piece: string) {
    const last = clicks.get(piece);
    /* Wall time, not the springs' clock, which stops when they rest. */
    const now = performance.now();
    const n = last && now - last.at < AGAIN_MS ? Math.min(last.n + 1, 3) : 1;
    clicks.set(piece, { n, at: now });
    return 1 + 0.25 * (n - 1);
  }

  function after(ms: number, run: () => void) {
    later.push({ at: clock + ms, run });
  }

  /** A landmark's answer, and any piece's without one of its own: a
   *  springy squash, a bounce, and a glint. */
  function squashAndGlint(handle: Object3D, force: number) {
    kick(handle, "squash", -2.6 * force);
    kick(handle, "y", 1.1 * force);
    kick(handle, "glint", 9 * force, SOFT);
  }

  /** Shakes `handle` from side to side: alternating leans, `times`. */
  function shake(handle: Object3D, force: number, times = 3, every = 70) {
    for (let i = 0; i < times; i++) {
      after(i * every, () =>
        kick(handle, "lean", (i % 2 === 0 ? 1 : -1) * 2.4 * force),
      );
    }
  }

  /** The duo's gestures, also played as moments. */
  const gestures = {
    /** The figure waves: three quick leans, the first the widest. */
    wave(figure: Object3D, force = 1) {
      for (let i = 0; i < 3; i++) {
        after(i * 150, () =>
          kick(figure, "lean", (i % 2 === 0 ? 2.6 : -2.2) * force, SOFT),
        );
      }
    },
    /** The buddy spins round once on a little hop, landing facing front. */
    spin(buddy: Object3D, force = 1) {
      retarget(buddy, "turn", Math.PI * 2 * Math.round(force), TURN);
      kick(buddy, "y", 1.4 * force, SOFT);
    },
    /** The buddy shadow-boxes: two quick jabs forward, a crouch before. */
    jab(buddy: Object3D, force = 1) {
      kick(buddy, "squash", -1.2 * force);
      after(60, () => kick(buddy, "x", 2.2 * force));
      after(240, () => kick(buddy, "x", 2.2 * force));
    },
    /** A high five on landing: both lean in toward each other, the buddy
     *  hopping up to reach. `toward` is +1 when the buddy stands to the
     *  figure's right. */
    highFive(figure: Object3D, buddy: Object3D, toward: number) {
      kick(figure, "lean", -1.6 * toward, SOFT);
      kick(buddy, "y", 1.3, SOFT);
      after(80, () => kick(buddy, "lean", 2.4 * toward, SOFT));
    },
  };

  /** A piece's own answer to a click (the Coordinator's list): each in
   *  the parts it names, or a squash and glint without them. */
  function react(on: Reactor, reduced: boolean): string {
    if (reduced) {
      /* No motion: a brief pool of light under it, fading. */
      showHalo(on, 0.85);
      after(380, () => showHalo(null, 0));
      return "highlight";
    }
    const force = escalation(on.piece);
    const { handle, root } = on;
    const named = (name: string) => parts(root, name);
    switch (on.piece) {
      case "figure":
        gestures.wave(handle, force);
        return "wave";
      case "buddy":
        /* Spins and jabs by turns. */
        if (buddyClicks++ % 2 === 0) {
          gestures.spin(handle, 1);
          return "spin";
        }
        gestures.jab(handle, force);
        return "jab";
      case "roche-dial":
        if (named(BEAT_NODE.needle).length === 0) break;
        for (const needle of named(BEAT_NODE.needle)) {
          kick(needle, "dial", 14 * force, SOFT);
        }
        kick(handle, "squash", -0.8 * force);
        return "needle";
      case "coils":
        if (named(BEAT_NODE.rotor).length === 0) break;
        for (const rotor of named(BEAT_NODE.rotor)) {
          /* Whole turns only: a spring at rest returns to its rest heading. */
          retarget(rotor, "turn", Math.PI * 2 * Math.round(2 * force));
        }
        named(BEAT_NODE.coil).forEach((coil, i) =>
          after(i * 50, () => kick(coil, "squash", 2 * force)),
        );
        return "rotor";
      case "sailboat":
        kick(handle, "y", 0.9 * force, SOFT);
        kick(handle, "lean", 2.2 * force, SOFT);
        after(140, () => kick(handle, "pitch", -1.4 * force, SOFT));
        return "bob";
      case "trees":
      case "trees-back":
        shake(handle, 0.5 * force, 4, 60);
        return "shake";
      case "mvp-window": {
        const shutters = named(BEAT_NODE.shutter);
        if (shutters.length === 0) break;
        shutters.forEach((shutter, i) => {
          const rest = restOf(shutter).rotation.y;
          after(i * 50, () =>
            kick(shutter, "turn", -Math.sign(rest || 1) * 16 * force),
          );
        });
        for (const pane of named(BEAT_NODE.glass)) {
          kick(pane, "glow", 14 * force, SOFT);
        }
        return "flap";
      }
      case "clock-face":
        for (const hand of named(BEAT_NODE.hand)) {
          retarget(hand, "dial", -Math.PI * 2 * Math.round(force));
        }
        shake(handle, 0.35 * force, 4, 80);
        return "chime";
      case "blank": {
        const slots = named(BEAT_NODE.slot);
        if (slots.length === 0) break;
        slots.forEach((slot, i) =>
          after(i * 45, () => kick(slot, "y", 0.9 * force)),
        );
        return "pulse";
      }
      case "startup-desk":
        for (const screen of named(BEAT_NODE.screen)) {
          kick(screen, "glow", 16 * force, SOFT);
        }
        kick(handle, "squash", -1 * force);
        return "glow";
      case "jet-d-eau":
        for (const plume of named(BEAT_NODE.plume)) {
          kick(plume, "squash", 5 * force, SOFT);
        }
        return "surge";
    }
    squashAndGlint(handle, force);
    return "squash";
  }

  /** Steps every spring and gesture on by `ms`. */
  function tick(ms: number) {
    if (ms <= 0) return;
    clock += ms;
    for (let i = later.length - 1; i >= 0; i--) {
      if (later[i].at <= clock) {
        const [due] = later.splice(i, 1);
        due.run();
      }
    }
    for (const [k, each] of springs) {
      let left = ms;
      while (left > 0) {
        const dt = Math.min(left, SUBSTEP_MS) / 1000;
        const { stiffness, damping } = each.feel;
        each.v += (-stiffness * (each.x - each.target) - damping * each.v) * dt;
        each.x += each.v * dt;
        left -= SUBSTEP_MS;
      }
      if (
        Math.abs(each.x - each.target) < REST.x &&
        Math.abs(each.v) < REST.v
      ) {
        /* At rest: a whole number of turns is no turn. */
        apply(each, true);
        springs.delete(k);
      } else apply(each);
    }
    /* The halo eases to its level: light, so reduced motion keeps it. */
    const towards = haloLevel.target - haloLevel.x;
    haloLevel.x += towards * Math.min(ms / 90, 1);
    if (Math.abs(towards) < 0.01) haloLevel.x = haloLevel.target;
    if (!halo) return;
    halo.material.opacity = 0.42 * haloLevel.x;
    halo.material.color.copy(paint.lampColour.value);
    halo.visible = haloLevel.x > 0.001;
    if (!halo.visible && haloLevel.target === 0) haloOn = null;
    if (haloOn) placeHalo(haloOn);
  }

  return {
    react,
    gestures,
    kick,
    retarget,
    after,
    shake,
    /** Hovered by a fine pointer: a faint pool of light under it. */
    /** Returns whether the highlight changed, so a frame is wanted. */
    hover(on: Reactor | null) {
      if (on === haloOn && haloLevel.target === (on ? 0.45 : 0)) return false;
      showHalo(on, 0.45);
      return true;
    },
    tick,
    active() {
      return (
        springs.size > 0 || later.length > 0 || haloLevel.x !== haloLevel.target
      );
    },
    /** Puts everything where it rests, at once: where it stood without
     *  this Play's springs, a beat's end state included. */
    settle() {
      later.length = 0;
      for (const each of springs.values()) apply(each, true);
      springs.clear();
    },
  };
}

export type Play = ReturnType<typeof createPlay>;
