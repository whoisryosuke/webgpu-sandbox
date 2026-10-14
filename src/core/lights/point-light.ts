import Light from "./light";

/**
 * A point light that emits in all directions from a position.
 */
export default class PointLight extends Light {
  constructor(position: { x: number; y: number; z: number } = { x: 0, y: 5, z: 5 }) {
    super();
    this.setPosition(position.x, position.y, position.z);
  }
}
