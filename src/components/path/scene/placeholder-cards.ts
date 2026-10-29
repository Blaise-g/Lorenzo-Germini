import type { DataTexture } from "three";

import type { CardArt } from "./card-art";
import { drawnInk, type InkPlates } from "./ink";

/* Stand-ins for the card art while it is being made: each card's silhouette
   drawn in code, in the same ink-separation format and at the manifest's
   size, so the board, its fold and its shader are built against the real
   shape. Retired by setting `CARD_SOURCE` in `board.ts` to "files". */

const PX_PER_UNIT = 96;
const MARGIN = 6;

type Silhouette = (plates: InkPlates) => void;

function outline(plates: InkPlates, path: Path2D) {
  plates.cut.lineJoin = "round";
  plates.cut.lineWidth = MARGIN * 2;
  plates.cut.fill(path);
  plates.cut.stroke(path);
}

const tower: Silhouette = (plates) => {
  const { width: w, height: h } = plates;
  const path = new Path2D();
  path.moveTo(w * 0.5, MARGIN);
  path.lineTo(w * 0.62, h * 0.22);
  path.lineTo(w * 0.72, h * 0.22);
  path.lineTo(w * 0.78, h - MARGIN);
  path.lineTo(w * 0.22, h - MARGIN);
  path.lineTo(w * 0.28, h * 0.22);
  path.lineTo(w * 0.38, h * 0.22);
  path.closePath();
  outline(plates, path);
  plates.ink1.fill(path);
  for (let y = h * 0.3; y < h - 20; y += 26) {
    plates.ink2.fillRect(w * 0.42, y, w * 0.16, 12);
  }
};

const range: Silhouette = (plates) => {
  const { width: w, height: h } = plates;
  const path = new Path2D();
  path.moveTo(MARGIN, h - MARGIN);
  path.lineTo(w * 0.3, MARGIN + 4);
  path.lineTo(w * 0.48, h * 0.4);
  path.lineTo(w * 0.66, MARGIN + 20);
  path.lineTo(w - MARGIN, h - MARGIN);
  path.closePath();
  outline(plates, path);
  plates.ink2.fill(path);
  plates.ink1.fillRect(0, h * 0.72, w, h);
};

const building: Silhouette = (plates) => {
  const { width: w, height: h } = plates;
  const path = new Path2D();
  path.moveTo(MARGIN, h - MARGIN);
  path.lineTo(MARGIN, h * 0.35);
  path.lineTo(w * 0.5, MARGIN);
  path.lineTo(w - MARGIN, h * 0.35);
  path.lineTo(w - MARGIN, h - MARGIN);
  path.closePath();
  outline(plates, path);
  plates.ink1.fill(path);
  for (let x = w * 0.12; x < w * 0.88; x += w * 0.16) {
    plates.ink2.fillRect(x, h * 0.48, w * 0.08, h * 0.2);
  }
};

const tree: Silhouette = (plates) => {
  const { width: w, height: h } = plates;
  const path = new Path2D();
  path.ellipse(w / 2, h * 0.4, w * 0.42, h * 0.36, 0, 0, Math.PI * 2);
  path.rect(w * 0.44, h * 0.6, w * 0.12, h * 0.4 - MARGIN);
  outline(plates, path);
  plates.ink2.fill(path);
};

const disc: Silhouette = (plates) => {
  const { width: w, height: h } = plates;
  const path = new Path2D();
  path.ellipse(w / 2, h / 2, w / 2 - MARGIN, h / 2 - MARGIN, 0, 0, Math.PI * 2);
  outline(plates, path);
  plates.ink1.lineWidth = 8;
  plates.ink1.beginPath();
  plates.ink1.ellipse(w / 2, h / 2, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
  plates.ink1.stroke();
};

const blank: Silhouette = (plates) => {
  const { width: w, height: h } = plates;
  const path = new Path2D();
  path.rect(MARGIN, MARGIN, w - MARGIN * 2, h - MARGIN * 2);
  outline(plates, path);
  plates.ink1.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    plates.ink1.beginPath();
    plates.ink1.arc(w * (0.18 + i * 0.16), h * 0.4, w * 0.06, 0, Math.PI * 2);
    plates.ink1.stroke();
  }
};

const band: Silhouette = (plates) => {
  const { width: w, height: h } = plates;
  const path = new Path2D();
  path.rect(MARGIN, MARGIN, w - MARGIN * 2, h - MARGIN * 2);
  outline(plates, path);
  plates.ink1.fillRect(MARGIN, h * 0.3, w - MARGIN * 2, h * 0.4);
};

function silhouette(card: CardArt): Silhouette {
  if (card.id.includes("tree")) return tree;
  if (/dial|clock|coils|sailboat|window/.test(card.id)) return disc;
  if (card.id.includes("blank")) return blank;
  if (/bisalta|lake/.test(card.id)) return range;
  if (/pipe|plateau|courtyard/.test(card.id)) return band;
  if (card.height > card.width * 1.6) return tower;
  return building;
}

/** A stand-in separation for `card`, at its manifest aspect. */
export function placeholderCard(card: CardArt): DataTexture {
  const width = Math.round(card.width * PX_PER_UNIT);
  const height = Math.round(card.height * PX_PER_UNIT);
  return drawnInk(width, height, silhouette(card));
}
