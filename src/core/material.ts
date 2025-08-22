import { UNIFORM_BIND_GROUP_LAYOUT_IDS } from "./constants/uniforms";
import { RGBAColor, rgbaToArray } from "./import/obj";
import { createTexture, createTextureBindGroup } from "./texture";
import { Uniforms, UniformsDataStructure } from "./uniforms";
import { Vector2D, Vector3D, Vector4D } from "./vertex";

export type MaterialFlags = {
  texture: boolean;
  debugUv: boolean;
  debugNormals: boolean;
  debugColor: boolean;
};

export interface MaterialUniform extends UniformsDataStructure {
  /**
   * RGBA color. Alpha represents opacity of object.
   */
  color: RGBAColor;
  /**
   * 0 = No, 1 = Yes
   */
  flags: MaterialFlags;
}

export const createMaterialUniform = (): MaterialUniform => ({
  // General properties
  color: {
    r: 0,
    g: 0,
    b: 1,
    a: 1,
  },
  // PBR properties
  /**
   * Shininess of object. 0-1000 range, 1000 less shiny.
   */
  specular: 500,
  // Flags to enable/disable features
  flags: {
    texture: false,
    debugUv: false,
    debugNormals: false,
    debugColor: false,
  },
});

export type MaterialTextureMap = Partial<{
  diffuse: GPUTexture;
}>;

export type MaterialTextureTypes = keyof MaterialTextureMap;

/**
 * The "styling" behind a Mesh.
 * Provides properties like color or opacity,
 * or helpers for managing underlying textures
 */
export default class Material {
  name: string;

  // GPU Specific
  uniforms: Uniforms<MaterialUniform>;
  /**
   * Mapping textures to material properties
   */
  textures: MaterialTextureMap = {};
  textureBindGroup?: GPUBindGroup;

  constructor(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    name: string
  ) {
    this.name = name;
    this.uniforms = new Uniforms(
      device,
      renderPipeline,
      "Material",
      createMaterialUniform(),
      UNIFORM_BIND_GROUP_LAYOUT_IDS["material"]
    );
  }

  addTexture(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    image: ImageBitmap,
    sampler: GPUSampler,
    type: MaterialTextureTypes
  ) {
    const texture = createTexture(device, image);
    this.textures[type] = texture;

    this.createTextureBindGroup(
      device,
      renderPipeline,
      sampler,
      this.textures[type]
    );
  }

  createTextureBindGroup(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    sampler: GPUSampler,
    texture: GPUTexture
  ) {
    // We create a bind group to contain the texture and it's buffer
    // Ideally this bind group is shared between all images,
    // and we create different slots for each (like diffuse vs emissive).
    // For now we only support 1: diffuse
    this.textureBindGroup = createTextureBindGroup(
      device,
      renderPipeline,
      texture,
      sampler
    );
  }

  createDefaultTexture(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    sampler: GPUSampler
  ) {
    const texture = device.createTexture({
      size: [1, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    // Fill with white or neutral color
    device.queue.writeTexture(
      { texture },
      new Uint8Array([255, 255, 255, 255]), // White pixel
      { bytesPerRow: 4 },
      { width: 1, height: 1 }
    );

    this.createTextureBindGroup(device, renderPipeline, sampler, texture);
  }
}
