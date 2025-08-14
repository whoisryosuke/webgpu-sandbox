import computeShaderCode from "../shaders/particle/compute.wgsl?raw";
import vertexShaderCode from "../shaders/particle/vertex.wgsl?raw";
import fragmentShaderCode from "../shaders/particle/fragment.wgsl?raw";
import { generateCube } from "../primitives/cube";
import Camera from "./camera";
import { importObj, loadObj } from "./import/obj";

const MAX_PARTICLES = 1000;
const PARTICLE_BYTE_OFFSET = 32; // 24 bytes per particle (vec3<f32> * 2)
const BUFFER_SIZE = MAX_PARTICLES * PARTICLE_BYTE_OFFSET;
const ARRAY_SIZE = MAX_PARTICLES * 8; // Divide by 4 because each element is a float32.

export default class ParticleSystem {
  device: GPUDevice;
  particles: Float32Array = new Float32Array(ARRAY_SIZE).fill(0);
  currentIndex: number = 0;

  particleBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  audioBuffer: GPUBuffer;
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  // particleCountBuffer: GPUBuffer;
  computePipeline: GPUComputePipeline;
  renderPipeline: GPURenderPipeline;
  computeBindGroup: GPUBindGroup;
  renderBindGroup: GPUBindGroup;

  indexCount: number = 0;

  constructor(
    device: GPUDevice,
    camera: Camera,
    vertices: Float32Array,
    indices: Uint16Array
  ) {
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

    // Audio buffer for waveform data
    this.audioBuffer = this.device.createBuffer({
      size: 1024 * 4, // 1024 samples x 4 bytes for f32 - Float32Array
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // const { vertices, indices } = generateCube(0.1);
    this.indexCount = indices.length;

    this.vertexBuffer = this.device.createBuffer({
      label: "Vertex buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices.buffer);

    this.indexBuffer = this.device.createBuffer({
      label: "Index buffer",
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.indexBuffer, 0, indices.buffer);

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
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage" },
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
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    this.computeBindGroup = device.createBindGroup({
      layout: computeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
        { binding: 2, resource: { buffer: this.audioBuffer } },
      ],
    });

    this.renderBindGroup = device.createBindGroup({
      layout: renderBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: camera.buffer } },
      ],
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

    // Setup vertex buffer descriptors
    const vertexBufferDescriptor: GPUVertexState["buffers"] = [
      {
        attributes: [
          // Position
          {
            shaderLocation: 0,
            offset: 0,
            format: "float32x3",
          },
          // Normal
          {
            shaderLocation: 1,
            offset: 12,
            format: "float32x3",
          },
          // UV
          {
            shaderLocation: 2,
            offset: 24,
            format: "float32x2",
          },
        ],
        arrayStride: 32,
        stepMode: "vertex",
      },
    ];

    this.renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [renderBindGroupLayout],
      }),
      vertex: {
        module: device.createShaderModule({ code: vertexShaderCode }), // 'vertex.wgsl'
        entryPoint: "main",
        buffers: vertexBufferDescriptor,
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

    // const newParticles = this.generateRandomPositions(MAX_PARTICLES);
    const newParticles = this.generateGridPositions(MAX_PARTICLES);
    this.device.queue.writeBuffer(this.particleBuffer, 0, newParticles.buffer);
  }

  generateRandomPositions(num: number): Float32Array {
    const particles = new Float32Array(num).reduce((merge) => {
      const particle = [
        // Position
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ];
      return [...merge, ...particle];
    }, [] as number[]);

    return new Float32Array(particles);
  }

  generateGridPositions(num: number) {
    // Calculate the closest perfect square to maxElements
    let sideLength = Math.floor(Math.sqrt(num));

    let particles: number[] = [];
    const scaleX = 100.0;
    const scaleY = 80.0;
    const offsetCenter = scaleX / 2;
    for (let x = 0; x < num; x++) {
      const realX = (x % sideLength) / sideLength;
      const scaledX = realX * scaleX;
      const y = x / sideLength;
      const realY = y / sideLength;
      const scaledY = realY * scaleY;
      const particle = [
        // Position
        scaledX - offsetCenter,
        scaledY - offsetCenter,
        0,
        0,
        // Velocity
        0,
        0,
        0,
        0,
      ];
      particles = [...particles, ...particle];
    }

    console.log("grid pos", particles.length / 6, num);

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
    renderPass.setIndexBuffer(this.indexBuffer, "uint16");
    renderPass.drawIndexed(this.indexCount, MAX_PARTICLES);
  }

  updateAudioBuffer(buffer: BufferSource | SharedArrayBuffer) {
    this.device.queue.writeBuffer(this.audioBuffer, 0, buffer);
  }
}
