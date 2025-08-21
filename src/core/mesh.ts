import { UNIFORM_BIND_GROUP_LAYOUT_IDS } from "./constants/uniforms";
import Geometry from "./geometry";
import { Uniforms, UniformsDataStructure } from "./uniforms";
import { Vector3D } from "./vertex";

interface MeshUniforms extends UniformsDataStructure {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

const createMeshUniforms = (): MeshUniforms => ({
  position: {
    x: 0,
    y: 0,
    z: 0,
  },
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: {
    x: 1,
    y: 1,
    z: 1,
  },
});

/**
 * Handles position, scale, rotation of geometry.
 * Creates a localized uniform buffer to contain properties.
 */
export class Mesh {
  geometry: Geometry;
  /**
   * A key that maps to a global cache with all loaded mats
   */
  material: string;
  uniforms: Uniforms<MeshUniforms>;

  constructor(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    geometry: Geometry,
    material?: string
  ) {
    this.geometry = geometry;
    this.uniforms = new Uniforms(
      device,
      renderPipeline,
      "Mesh",
      createMeshUniforms(),
      UNIFORM_BIND_GROUP_LAYOUT_IDS["locals"]
    );
    this.material = material ?? "Default";
  }
}
