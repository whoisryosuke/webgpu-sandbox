import { RGBAColor, rgbaToArray } from "./import/obj";
import { createTexture, createTextureBindGroup } from "./texture";
import { Vector2D, Vector4D } from "./vertex";

const BUFFER_OFFSET_MAP = {
  color: 0,
  scale: 4,
  offset: 6,
  texture: 8,
  debugUV: 9,
};

export type MaterialUniform = {
  color: RGBAColor;
  scale: Vector2D;
  offset: Vector2D;
  /**
   * 0 = No, 1 = Yes
   */
  texture: number;
  debugUV: number;
};

const DEFAULT_UNIFORMS: MaterialUniform = {
  color: {
    r: 0,
    g: 0,
    b: 1,
    a: 1,
  },
  scale: {
    x: 1,
    y: 1,
  },
  offset: {
    x: 0,
    y: 0,
  },
  texture: 0,
  debugUV: 0,
};

export type MaterialTextureMap = Partial<{
  diffuse: GPUTexture;
}>;

export type MaterialTextureTypes = keyof MaterialTextureMap;

export default class Material {
  name: string;

  // GPU Specific
  uniformBuffer!: GPUBuffer;
  uniformBindGroup!: GPUBindGroup;
  /**
   * The uniform data we submit to buffer. This is where you update uniform properties.
   */
  uniformValues!: Float32Array;
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
    this.createUniformBuffer(device);
    this.setUniforms(device, DEFAULT_UNIFORMS);
    this.createUniformsBindGroup(device, renderPipeline);
  }
  createUniformsBindGroup(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline
  ) {
    // Create a bind group to hold the uniforms
    // @TODO: Move to material + remove camera and move it to a global uniform bind group
    this.uniformBindGroup = device.createBindGroup({
      label: "Local Uniforms",
      layout: renderPipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
      ],
    });
  }

  createUniformBuffer(device: GPUDevice) {
    // Create a uniform buffer
    // The buffer size is equivalent to all the data we put into our shader struct
    const uniformBufferSize =
      4 * 4 + // color is 4 32bit floats (4bytes each)
      2 * 4 + // scale is 2 32bit floats (4bytes each)
      2 * 4 + // offset is 2 32bit floats (4bytes each)
      1 * 4 + // texture is 1 32bit floats (4bytes each)
      1 * 4 + // debug_uv is 1 32bit floats (4bytes each)
      2 * 4; // we need some padding to meet 48 requirement;
    this.uniformBuffer = device.createBuffer({
      label: "Local Uniform buffer",
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    console.log("uniformBufferSize", uniformBufferSize);

    // Create an buffer-friendly array (aka `TypedArray`) and use the buffer size
    this.uniformValues = new Float32Array(uniformBufferSize / 4);
  }

  setUniforms(device: GPUDevice, uniform: MaterialUniform) {
    this.setColor(uniform.color);
    this.setScale(uniform.scale);
    this.setOffset(uniform.offset);
    this.setDebugUV(uniform.debugUV);
    console.log("setting uniform tex", uniform.texture);
    this.setTextureUniform(uniform.texture);
    console.log("uniforms", this.uniformValues);

    this.updateUniforms(device);
  }

  updateUniforms(device: GPUDevice) {
    device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformValues.buffer);
  }

  setColor(color: RGBAColor) {
    this.uniformValues.set(rgbaToArray(color), BUFFER_OFFSET_MAP["color"]);
  }

  setScale(scale: Vector2D) {
    this.uniformValues.set([scale.x, scale.y], BUFFER_OFFSET_MAP["scale"]);
  }

  setOffset(offset: Vector2D) {
    this.uniformValues.set([offset.x, offset.y], BUFFER_OFFSET_MAP["offset"]);
  }

  setDebugUV(debugUV: number) {
    this.uniformValues.set([debugUV], BUFFER_OFFSET_MAP["debugUV"]);
  }

  setTextureUniform(texture: number) {
    this.uniformValues.set([texture], BUFFER_OFFSET_MAP["texture"]);
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
