import computeShaderCode from "../shaders/particle/compute.wgsl?raw";
import vertexShaderCode from "../shaders/particle/vertex.wgsl?raw";
import fragmentShaderCode from "../shaders/particle/fragment.wgsl?raw";

const MAX_PARTICLES = 10000;

export default class ParticleSystem {
  particles: Float32Array = new Float32Array(MAX_PARTICLES);
  currentIndex: number = 0;

  buffer: GPUBuffer;
  computePipeline: GPUComputePipeline;
  renderPipeline: GPURenderPipeline;
  computeBindGroup: GPUBindGroup;
  renderBindGroup: GPUBindGroup;

  constructor(device: GPUDevice) {
    this.buffer = device.createBuffer({
      label: "Particles buffer",
      size: this.particles.byteLength, // Size for translation matrix per instance,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const computeBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });
    const renderBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    this.computeBindGroup = device.createBindGroup({
      layout: computeBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    });

    this.renderBindGroup = device.createBindGroup({
      layout: renderBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.buffer } }],
    });

    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({ code: computeShaderCode }), // 'compute.wgsl'
        entryPoint: "main",
      },
    });

    this.renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [renderBindGroupLayout],
      }),
      vertex: {
        module: device.createShaderModule({ code: vertexShaderCode }), // 'vertex.wgsl'
        entryPoint: "main",
      },
      fragment: {
        module: device.createShaderModule({ code: fragmentShaderCode }), // 'fragment.wgsl'
        entryPoint: "main",
        targets: [
          {
            format: "bgra8unorm",
          },
        ],
      },
      primitive: { topology: "point-list" },

      // Add depth testing
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },

      multisample: {
        count: 4,
      },
    });
  }

  compute(commandEncoder: GPUCommandEncoder) {
    // Compute pass
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(MAX_PARTICLES / 64));
    computePass.end();
  }
  render(renderPass: GPURenderPassEncoder) {
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.draw(MAX_PARTICLES, 1, 0, 0);
  }
}
