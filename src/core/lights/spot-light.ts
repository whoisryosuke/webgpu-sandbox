import Light from "./light";
import { Vector3D } from "../vertex";

/**
 * A spot light that emits in a cone direction.
 */
export default class SpotLight extends Light {
  constructor(
    position: { x: number; y: number; z: number } = { x: 0, y: 5, z: 5 },
    direction: Vector3D = { x: 0, y: -1, z: 0 },
  ) {
    super();
    this.setPosition(position.x, position.y, position.z);
    this.setDirection(direction.x, direction.y, direction.z);
  }
}
