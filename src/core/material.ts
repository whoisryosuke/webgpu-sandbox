import { UNIFORM_BIND_GROUP_LAYOUT_IDS } from "./constants/uniforms";
import { RGBAColor, rgbaToArray } from "./import/obj";
import { createTexture, createTextureBindGroup } from "./texture";
import { Vector2D, Vector3D, Vector4D } from "./vertex";

const BUFFER_OFFSET_MAP = {
  color: 0,
  scale: 4,
  offset: 8,
  flags: 12,
};

export type MaterialFlags = {
  texture: boolean;
  debugUv: boolean;
  debugNormals: boolean;
  debugColor: boolean;
};

export type MaterialUniform = {
  color: RGBAColor;
  scale: Vector3D;
  offset: Vector3D;
  /**
   * 0 = No, 1 = Yes
   */
  flags: MaterialFlags;
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
    z: 1,
  },
  offset: {
    x: 0,
    y: 0,
    z: 0,
  },
  flags: {
    texture: false,
    debugUv: false,
    debugNormals: false,
    debugColor: false,
  },
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
      layout: renderPipeline.getBindGroupLayout(
        UNIFORM_BIND_GROUP_LAYOUT_IDS["material"]
      ),
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
      3 * 4 + // scale is 3 32bit floats (4bytes each)
      1 * 4 + // padding
      3 * 4 + // offset is 3 32bit floats (4bytes each)
      1 * 4 + // padding
      4 * 4; // flags is 4 32bit floats (4bytes each)
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
    this.setFlags(uniform.flags);
    console.log("uniforms", this.uniformValues);

    this.updateUniforms(device);
  }

  updateUniforms(device: GPUDevice) {
    device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformValues.buffer);
  }

  setColor(color: RGBAColor) {
    this.uniformValues.set(rgbaToArray(color), BUFFER_OFFSET_MAP["color"]);
  }

  setScale(scale: Vector3D) {
    this.uniformValues.set(
      [scale.x, scale.y, scale.z],
      BUFFER_OFFSET_MAP["scale"]
    );
  }

  setOffset(offset: Vector3D) {
    this.uniformValues.set(
      [offset.x, offset.y, offset.z],
      BUFFER_OFFSET_MAP["offset"]
    );
  }

  setFlags(flags: MaterialFlags) {
    this.uniformValues.set(
      [
        Number(flags.texture),
        Number(flags.debugUv),
        Number(flags.debugNormals),
        Number(flags.debugColor),
      ],
      BUFFER_OFFSET_MAP["flags"]
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
