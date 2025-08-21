type UniformsDataStructure = Record<string, number[]>;

/**
 * Handles creating uniforms for storing data for shaders.
 * Creates a uniform buffer + bind group and offers setters for uniforms.
 */
export class Uniform<UniformObject extends UniformsDataStructure> {
  name: string;

  /**
   * The uniforms
   */
  uniforms: UniformObject;
  /**
   * Maps uniforms to their buffer alignment offset
   */
  uniformsMapping: Record<keyof UniformObject, number>;

  // GPU Specific
  uniformBuffer!: GPUBuffer;
  uniformBindGroup!: GPUBindGroup;
  /**
   * The uniform data we submit to buffer. This is where you update uniform properties.
   */
  uniformValues!: Float32Array;

  constructor(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    name: string,
    uniforms: UniformObject,
    uniformMapping: Record<keyof UniformObject, number>,
    /**
     * The size of the uniform buffer (should be a multiple of 16)
     */
    uniformBufferSize: number,
    bindGroupLayoutId: number
  ) {
    this.name = name;
    this.createUniformBuffer(device, name, uniformBufferSize);
    this.createUniformsBindGroup(device, renderPipeline, bindGroupLayoutId);
    this.uniforms = uniforms;
    this.uniformsMapping = uniformMapping;
    this.setUniforms(device);
  }

  // calculateUniformBufferSize() {
  //   for(const key in this.uniforms) {
  //     const uniform = this.uniforms[key];

  //     // Check the data type
  //     const isObject = typeof uniform === 'object' && !Array.isArray(uniform);
  //     const isArray = typeof uniform != "object" && Array.isArray(uniform);

  //     // Assume it's a shallow object with only keys + values
  //     // Check how many keys we have
  //     let size = 0;
  //     if(isObject) {
  //       const objKeys = Object.keys(uniform);
  //       size = objKeys.length * 4;
  //     }

  //     // Check if property meets WebGPU requirement
  //     const requirement = 16;
  //     const paddingSize = size % requirement;
  //     if(paddingSize > 0) {
  //       // Add padding
  //     }
  //   }
  // }

  createUniformsBindGroup(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    bindGroupLayoutId: number
  ) {
    // Create a bind group to hold the uniforms
    this.uniformBindGroup = device.createBindGroup({
      label: "Local Uniforms",
      layout: renderPipeline.getBindGroupLayout(bindGroupLayoutId),
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

  createUniformBuffer(
    device: GPUDevice,
    name: string,
    uniformBufferSize: number
  ) {
    // Create a uniform buffer
    this.uniformBuffer = device.createBuffer({
      label: `${name} Uniform Buffer`,
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create an buffer-friendly array (aka `TypedArray`) and use the buffer size
    this.uniformValues = new Float32Array(uniformBufferSize / 4);
  }

  /**
   * Loops through each uniform and stores it in buffer friendly array.
   * Uses the uniform mapping to align properties in buffer array.
   */
  setUniforms(device: GPUDevice) {
    for (const key in this.uniforms) {
      this.uniformValues.set(this.uniforms[key], this.uniformsMapping[key]);
    }

    this.updateUniforms(device);
  }

  /**
   * Updates buffer with new uniform data from buffer array
   */
  updateUniforms(device: GPUDevice) {
    device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformValues.buffer);
  }
}
