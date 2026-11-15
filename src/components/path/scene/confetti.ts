import {
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Group,
} from "three";

import type { Paint, ToneName } from "./paint";
import { seededRandom } from "./props";

/* The tour's end (v3-emil-polish): once the last step has been told, a
   burst of paper confetti in the board's inks thrown up over the "?" tile
   as the camera pulls back to the whole board. It happens once a tour, so
   it may be the board's one exuberant moment; it is still over in under
   four seconds, falls like paper rather than sparks, and under reduced
   motion it never comes. Every flake's path is a pure function of time
   (`flakeAt`), so a spec checks it without a GPU. */

/** How many flakes, in which inks, and for how long. */
export const CONFETTI = {
  perInk: 28,
  inks: ["warm", "cool", "sun", "leaf"] as const satisfies readonly ToneName[],
  ms: 3200,
  /** The last share of its life over which a flake shrinks away. */
  fade: 0.22,
} as const;

/** Paper in air: drag pulls a flake to a slow terminal fall. */
const GRAVITY = 6;
const DRAG = 3.4;

export type Flake = Readonly<{
  /** Its throw, in scene units a second. */
  velocity: readonly [number, number, number];
  /** Its tumble, radians a second, about a tilted axis. */
  spin: number;
  axis: readonly [number, number, number];
  /** Its sideways flutter's phase. */
  phase: number;
}>;

/** The flakes of one ink, thrown up and out, from a seed. */
export function flakes(count: number, seed: number): Flake[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    const out = 1.8 + random() * 2.4;
    const axis = new Vector3(random() - 0.5, random() - 0.5, random() - 0.5)
      .normalize()
      .toArray();
    return {
      velocity: [
        Math.cos(angle) * out,
        5.6 + random() * 3,
        Math.sin(angle) * out,
      ],
      spin: 5 + random() * 9,
      axis,
      phase: random() * Math.PI * 2,
    };
  });
}

/** Where a flake is `ms` after the burst, relative to it, into `out`: a
 *  throw slowed by drag under gravity, toward a slow terminal fall, with a
 *  flutter across. */
export function flakeAt(flake: Flake, ms: number, out: Vector3): Vector3 {
  const t = ms / 1000;
  const carried = (1 - Math.exp(-DRAG * t)) / DRAG;
  const [vx, vy, vz] = flake.velocity;
  const flutter = Math.sin(t * 7 + flake.phase) * 0.12 * Math.min(t, 1);
  return out.set(
    vx * carried + flutter,
    (vy + GRAVITY / DRAG) * carried - (GRAVITY / DRAG) * t,
    vz * carried + flutter * 0.5,
  );
}

/** A flake's size `ms` in, 1 until its fade, then down to 0 at the end. */
export function flakeSize(ms: number): number {
  const left = 1 - ms / CONFETTI.ms;
  return Math.min(Math.max(left / CONFETTI.fade, 0), 1);
}

export function createConfetti(options: { board: Group; paint: Paint }) {
  const { board, paint } = options;
  const geometry = new PlaneGeometry(0.26, 0.16);
  const inks = CONFETTI.inks.map((ink, index) => {
    const mesh = new InstancedMesh(
      geometry,
      paint.shared(ink, { doubleSided: true }),
      CONFETTI.perInk,
    );
    mesh.visible = false;
    mesh.frustumCulled = false;
    board.add(mesh);
    return { mesh, flakes: flakes(CONFETTI.perInk, index + 11) };
  });
  const from = new Vector3();
  let elapsed: number = CONFETTI.ms;

  const matrix = new Matrix4();
  const at = new Vector3();
  const axis = new Vector3();
  const turn = new Quaternion();
  const size = new Vector3();

  function pose() {
    const shown = elapsed < CONFETTI.ms;
    const scale = flakeSize(elapsed);
    for (const { mesh, flakes } of inks) {
      mesh.visible = shown;
      if (!shown) continue;
      flakes.forEach((flake, i) => {
        flakeAt(flake, elapsed, at).add(from);
        turn.setFromAxisAngle(
          axis.fromArray(flake.axis),
          flake.spin * (elapsed / 1000) + flake.phase,
        );
        matrix.compose(at, turn, size.setScalar(scale));
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    /** Throws the confetti up from `point`, in the board's frame. */
    burst(point: Vector3) {
      from.copy(point);
      elapsed = 0;
      pose();
    },
    /** Moves it on `ms`; whether it still flies. */
    tick(ms: number) {
      if (elapsed >= CONFETTI.ms) return false;
      elapsed = Math.min(elapsed + ms, CONFETTI.ms);
      pose();
      return true;
    },
    active() {
      return elapsed < CONFETTI.ms;
    },
    /** Lands it at once: gone. Its meshes are on the board, so the
     *  runtime's dispose frees them with the rest. */
    finish() {
      elapsed = CONFETTI.ms;
      pose();
    },
  };
}
