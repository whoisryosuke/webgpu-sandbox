// Main
export { default as WebGPURenderer } from "./core/renderer";

// Core classes
export { default as Camera } from "./core/camera";
export { default as Geometry } from "./core/geometry";
export { Mesh } from "./core/mesh";
export { default as Material } from "./core/material";
export type { MaterialUniform, MaterialFlags } from "./core/material";
export { Uniforms } from "./core/uniforms";
export { default as ParticleSystem } from "./core/particle-system";
export { default as ComputePipeline } from "./core/compute-pipeline";

// Lights
export { default as Light } from "./core/lights/light";
export { default as DirectionalLight } from "./core/lights/directional-light";
export { default as PointLight } from "./core/lights/point-light";
export { default as SpotLight } from "./core/lights/spot-light";
export { default as AmbientLight } from "./core/lights/ambient-light";

// Primitives
export { generateCube } from "./primitives/cube";
export { generateSphere } from "./primitives/sphere";
export { generateCylinder } from "./primitives/cylinder";
export { generateCone } from "./primitives/cone";
export { generateTorus } from "./primitives/torus";
export { generatePlane } from "./primitives/plane";

// Texture
export {
  createTexture,
  createTextureBindGroup,
  loadImage,
  createSampler,
  createTextureFromUrl,
} from "./core/texture";

// Import
export { importObj, loadObj } from "./core/import/obj";

// Math re-exports
export { mat4, mat3, vec2, vec3, vec4, quat } from "wgpu-matrix";
export * as MathUtils from "./core/math/utils";

// Types
export type { RenderProps, RenderStats } from "./core/renderer";
export type { Vector2D, Vector3D, Vector4D } from "./core/vertex";
export type { CreateGeometryData } from "./core/geometry";
export type { ComputeBufferBinding, ComputePipelineConfig } from "./core/compute-pipeline";
export type { TextureOptions, SamplerOptions } from "./core/texture";
export type { CameraControlMode } from "./core/camera";
