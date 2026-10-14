/**
 * A buffer binding for a compute pipeline.
 */
export interface ComputeBufferBinding {
  /** GPU buffer to bind */
  buffer: GPUBuffer;
  /** Binding index in the compute shader */
  binding: number;
}

/**
 * Configuration for creating a compute pipeline.
 */
export interface ComputePipelineConfig {
  /** WGSL shader code */
  shaderCode: string;
  /** Buffer bindings */
  bufferBindings: ComputeBufferBinding[];
  /** Optional label */
  label?: string;
}

/**
 * Wraps a GPU compute pipeline and its bind group.
 * Use this to dispatch compute shaders from the renderer.
 */
export default class ComputePipeline {
  pipeline: GPUComputePipeline;
  bindGroup: GPUBindGroup;

  constructor(device: GPUDevice, config: ComputePipelineConfig) {

    const bindGroupLayout = device.createBindGroupLayout({
      label: config.label ?? "Compute Pipeline",
      entries: config.bufferBindings.map((b) => ({
        binding: b.binding,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      })),
    });

    this.pipeline = device.createComputePipeline({
      label: config.label ?? "Compute Pipeline",
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({ code: config.shaderCode }),
        entryPoint: "main",
      },
    });

    this.bindGroup = device.createBindGroup({
      label: config.label ?? "Compute Pipeline",
      layout: this.pipeline.getBindGroupLayout(0),
      entries: config.bufferBindings.map((b) => ({
        binding: b.binding,
        resource: { buffer: b.buffer },
      })),
    });
  }

  /**
   * Dispatch this compute pipeline.
   * @param encoder - The command encoder to use
   * @param workgroupCount - Number of workgroups to dispatch (default: 1)
   */
  dispatch(encoder: GPUCommandEncoder, workgroupCount: number = 1) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(workgroupCount);
    pass.end();
  }

  /**
   * Dispose of GPU resources.
   */
  dispose() {
    // ComputePipeline doesn't have a dispose method in WebGPU,
    // but we clean up references
    this.pipeline = null!;
    this.bindGroup = null!;
  }
}
