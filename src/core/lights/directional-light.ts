import Light from "./light";
import { Vector3D } from "../vertex";

/**
 * A directional light (like the sun).
 * Has a direction but no position (infinite distance).
 */
export default class DirectionalLight extends Light {
  constructor(direction: Vector3D = { x: 0, y: -1, z: 0 }) {
    super();
    this.setDirection(direction.x, direction.y, direction.z);
  }
}
