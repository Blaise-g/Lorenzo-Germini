import { ExtrudeGeometry, Group, Shape, type Object3D } from "three";

/* Small helpers every scene's art places its props with. */

export function at(object: Object3D, x: number, y: number, z: number) {
  object.position.set(x, y, z);
  return object;
}

export function group(...children: Object3D[]): Group {
  const parent = new Group();
  parent.add(...children);
  return parent;
}

/** A gabled roof: a triangle extruded along the building's depth. */
export function gable(width: number, height: number, depth: number) {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}
