import Light from "./light";

/**
 * An ambient light that illuminates all objects equally.
 */
export default class AmbientLight extends Light {
  constructor(intensity: number = 0.3) {
    super();
    this.setIntensity(intensity);
  }
}
