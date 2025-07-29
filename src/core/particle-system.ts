import computeShaderCode from "../shaders/particle/compute.wgsl?raw";
import vertexShaderCode from "../shaders/particle/vertex.wgsl?raw";
import fragmentShaderCode from "../shaders/particle/fragment.wgsl?raw";

const MAX_PARTICLES = 100;
const PARTICLE_BYTE_OFFSET = 48; // vec3 * 3 + f32 + padding

export default class ParticleSystem {
  device: GPUDevice;
  particles: Float32Array = new Float32Array(
    MAX_PARTICLES * PARTICLE_BYTE_OFFSET
  ).fill(0);
  currentIndex: number = 0;

  particleBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  vertexBuffer: GPUBuffer;
  // particleCountBuffer: GPUBuffer;
  computePipeline: GPUComputePipeline;
  renderPipeline: GPURenderPipeline;
  computeBindGroup: GPUBindGroup;
  renderBindGroup: GPUBindGroup;

  constructor(device: GPUDevice) {
    this.device = device;
    this.particleBuffer = device.createBuffer({
      label: "Particles buffer",
      size: this.particles.byteLength, // Size for translation matrix per instance,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    // this.particleCountBuffer = device.createBuffer({
    //   label: "Particle count buffer",
    //   size: 4, // Size of u32
    //   usage:
    //     GPUBufferUsage.STORAGE |
    //     GPUBufferUsage.COPY_SRC |
    //     GPUBufferUsage.COPY_DST,
    // });

    // Uniform buffer for time and other constants
    this.uniformBuffer = this.device.createBuffer({
      size: 64, // 4 floats * 4 bytes each, padded to 64 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Quad vertices for instanced rendering
    const quadVertices = new Float32Array([
      // position, uv
      ...[-1, -1, 0, 0],
      ...[1, -1, 1, 0],
      ...[-1, 1, 0, 1],
      ...[-1, 1, 0, 1],
      ...[1, -1, 1, 0],
      ...[1, 1, 1, 1],
    ]);

    this.vertexBuffer = this.device.createBuffer({
      size: 96,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(quadVertices);
    this.vertexBuffer.unmap();

    const computeBindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "uniform" },
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
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });

    this.renderBindGroup = device.createBindGroup({
      layout: renderBindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.particleBuffer } }],
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
        buffers: [
          {
            arrayStride: 16, // 4 floats * 4 bytes
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" }, // pos (2D)
              { shaderLocation: 1, offset: 8, format: "float32x2" }, // uv
            ],
          },
        ],
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
      primitive: { topology: "triangle-list" },

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

    const newParticles = this.generateRandomPositions(10);
    this.device.queue.writeBuffer(this.particleBuffer, 0, newParticles.buffer);
  }

  generateRandomPositions(num: number): Float32Array {
    const particles = new Float32Array(num).reduce((merge) => {
      const particle = [
        // Position
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        // Velocity
        0,
        Math.random() * 2 - 1,
        0,
      ];
      return [...merge, ...particle];
    }, [] as number[]);

    return new Float32Array(particles);
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
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.draw(6, MAX_PARTICLES);
  }

  spawn() {
    this.particles.set(
      [
        // Position
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        // Velocity
        0,
        Math.random() * 2 - 1,
        0,
      ],
      this.currentIndex * PARTICLE_BYTE_OFFSET
    );
    this.currentIndex += 1;

    this.device.queue.writeBuffer(
      this.particleBuffer,
      0,
      this.particles.buffer
    );
  }
}
