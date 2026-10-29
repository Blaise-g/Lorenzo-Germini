/* Where on the stage the board may stand: inside the stage, and clear of
   the board's tabs laid over its corner. Pure arithmetic in clip space, so
   a spec checks it without a GPU. */

/** A rectangle on the stage, in CSS pixels from its top-left corner. */
export type StageRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** What the page leaves the board: `safe`, the part of the stage it stays
 *  inside, and `clear`, the cards laid over it that no tile goes under. */
export type StageFrame = {
  safe: StageRect;
  clear: readonly StageRect[];
};

/** A rectangle in clip space: -1 to 1 across, and up. */
export type ClipRect = { x0: number; x1: number; y0: number; y1: number };

/** A point in clip space. */
export type ClipPoint = readonly [number, number];

/** The whole stage: nothing laid over it. */
export function wholeStage(width: number, height: number): StageFrame {
  return {
    safe: { left: 0, top: 0, right: width, bottom: height },
    clear: [],
  };
}

export function toClip(
  rect: StageRect,
  width: number,
  height: number,
): ClipRect {
  return {
    x0: (rect.left / width) * 2 - 1,
    x1: (rect.right / width) * 2 - 1,
    y0: 1 - (rect.bottom / height) * 2,
    y1: 1 - (rect.top / height) * 2,
  };
}

/** `rect` shrunk about its centre to `fill` of its size each way. */
export function filled(
  rect: ClipRect,
  fill: { x: number; y: number },
): ClipRect {
  const cx = (rect.x0 + rect.x1) / 2;
  const cy = (rect.y0 + rect.y1) / 2;
  const hx = ((rect.x1 - rect.x0) / 2) * fill.x;
  const hy = ((rect.y1 - rect.y0) / 2) * fill.y;
  return { x0: cx - hx, x1: cx + hx, y0: cy - hy, y1: cy + hy };
}

/** The middle of an outline's corners. */
export function middleOf(outline: readonly ClipPoint[]): ClipPoint {
  const x = outline.reduce((sum, [px]) => sum + px, 0) / outline.length;
  const y = outline.reduce((sum, [, py]) => sum + py, 0) / outline.length;
  return [x, y];
}

export function centreOf(rect: ClipRect): ClipPoint {
  return [(rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2];
}

export function inRect(rect: ClipRect, [x, y]: ClipPoint): boolean {
  return x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;
}

/** Whether `point` is inside the convex `outline`, wound either way. */
export function inConvex(
  outline: readonly ClipPoint[],
  point: ClipPoint,
): boolean {
  if (outline.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < outline.length; i++) {
    const [ax, ay] = outline[i];
    const [bx, by] = outline[(i + 1) % outline.length];
    const cross = (bx - ax) * (point[1] - ay) - (by - ay) * (point[0] - ax);
    if (cross === 0) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

/** Whether a convex outline and a rectangle overlap: a corner of either
 *  inside the other, or an edge of the outline crossing the rectangle. */
export function overlaps(
  outline: readonly ClipPoint[],
  rect: ClipRect,
): boolean {
  if (outline.some((point) => inRect(rect, point))) return true;
  const corners: ClipPoint[] = [
    [rect.x0, rect.y0],
    [rect.x1, rect.y0],
    [rect.x1, rect.y1],
    [rect.x0, rect.y1],
  ];
  if (corners.some((corner) => inConvex(outline, corner))) return true;
  return outline.some((a, i) =>
    crossesRect(a, outline[(i + 1) % outline.length], rect),
  );
}

/** Whether the segment from `a` to `b` passes through `rect`: clipped to
 *  the rectangle's slab on each axis, something is left. */
function crossesRect(a: ClipPoint, b: ClipPoint, rect: ClipRect) {
  let enter = 0;
  let leave = 1;
  for (const [from, to, low, high] of [
    [a[0], b[0], rect.x0, rect.x1],
    [a[1], b[1], rect.y0, rect.y1],
  ]) {
    const span = to - from;
    if (span === 0) {
      if (from < low || from > high) return false;
      continue;
    }
    const t0 = (low - from) / span;
    const t1 = (high - from) / span;
    enter = Math.max(enter, Math.min(t0, t1));
    leave = Math.min(leave, Math.max(t0, t1));
  }
  return enter <= leave;
}

/** Whether every outline, projected, stands inside `safe` and clear of
 *  every `clear` rectangle. */
export function framed(
  outlines: readonly (readonly ClipPoint[])[],
  safe: ClipRect,
  clear: readonly ClipRect[],
): boolean {
  return outlines.every(
    (outline) =>
      outline.every((point) => inRect(safe, point)) &&
      clear.every((rect) => !overlaps(outline, rect)),
  );
}
