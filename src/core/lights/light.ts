import { Vector3D } from "../vertex";

/**
 * Base class for all light types.
 * Plain data holder — the renderer packs light properties into the
 * shared `@group(0)` globals uniform buffer each frame, so lights
 * consume no bind group slots of their own.
 */
export default class Light {
  color: Vector3D = { x: 1, y: 1, z: 1 };
  intensity: number = 1;
  position: Vector3D = { x: 0, y: 5, z: 5 };
  direction: Vector3D = { x: 0, y: -1, z: 0 };

  /**
   * Set light color.
   */
  setColor(r: number, g: number, b: number): this {
    this.color = { x: r, y: g, z: b };
    return this;
  }

  /**
   * Set light intensity.
   */
  setIntensity(intensity: number): this {
    this.intensity = intensity;
    return this;
  }

  /**
   * Set light position.
   */
  setPosition(x: number, y: number, z: number): this {
    this.position = { x, y, z };
    return this;
  }

  /**
   * Set light direction.
   */
  setDirection(x: number, y: number, z: number): this {
    this.direction = { x, y, z };
    return this;
  }
}
