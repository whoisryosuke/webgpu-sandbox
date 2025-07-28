import defaultShader from "../shaders/default.wgsl?raw";
import { generateCube } from "../primitives/cube";
import Camera from "./camera";

export default class WebGPURenderer {
  device?: GPUDevice;
  camera?: Camera;

  async init() {
    // Setup adapter and device
    const adapter = await window.navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error(
        "Couldn't create an adapter. Please check if your browser supports WebGPU."
      );
      return;
    }
    this.device = await adapter.requestDevice();

    // Setup canvas and context
    let canvas = document.getElementById("gpu-canvas") as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "gpu-canvas";
      document.getElementById("app")?.appendChild(canvas);
    }
    // Make it fullscreen
    canvas.width = window.screen.width;
    canvas.height = window.screen.height;

    const context = canvas.getContext("webgpu");
    if (!context) {
      console.error(
        "Couldn't create a context with canvas element. Please check if your browser supports WebGPU."
      );
      return;
    }
    context.configure({
      device: this.device,
      format: "bgra8unorm",
    });

    // Setup vertex buffer
    // Generate vertices for a plane (a rectangle aka 2 tris)
    // const { vertices, indices } = generatePlane(0.5);
    const { vertices, indices } = generateCube(0.5);

    console.log("vertices", vertices);
    console.log("indices", indices);

    const vertexBuffer = this.device.createBuffer({
      label: "Vertex buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, vertices);

    const indexBuffer = this.device.createBuffer({
      label: "Index buffer",
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(indexBuffer, 0, indices);

    // Setup shader
    const shaderModule = this.device.createShaderModule({
      code: defaultShader,
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

    // Ideally we'd setup a bind group layout for our bind group
    // but since the render pipeline is set to `auto`, we don't need it
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
          },
        },
      ],
    });

    // Render pipeline
    const pipelineDescriptor: GPURenderPipelineDescriptor = {
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
        buffers: vertexBufferDescriptor,
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_main",
        targets: [
          {
            format: "bgra8unorm",
          },
        ],
      },
      primitive: {
        // topology: "point-list",
        topology: "triangle-list",
      },
      // Add depth testing
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },

      // This determines the bind group layout automatically by analyzing the shader modules
      // layout: "auto",

      // Manually define the bind group layout for shader uniforms
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
    };
    const renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);

    // Create a uniform buffer
    // The buffer size is equivalent to all the data we put into our shader struct
    const uniformBufferSize =
      4 * 4 + // color is 4 32bit floats (4bytes each)
      2 * 4 + // scale is 2 32bit floats (4bytes each)
      2 * 4 + // offset is 2 32bit floats (4bytes each)
      1 * 4 + // time is 1 32bit floats (4bytes each)
      3 * 4; // we need some padding to meet 48 requirement;
    const uniformBuffer = this.device.createBuffer({
      label: "Local Uniform buffer",
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    console.log("uniformBufferSize", uniformBufferSize);
    // Create an buffer-friendly array (aka `TypedArray`) and use the buffer size
    const uniformValues = new Float32Array(uniformBufferSize / 4);
    // offsets to the various uniform values in float32 indices
    const kColorOffset = 0;
    const kScaleOffset = 4;
    const kOffsetOffset = 6;
    const kTimeOffset = 7;

    // Create the uniforms
    // Because we initialize the array with a length, but not a real array,
    // we need to explicitly set each "slot" in the array
    uniformValues.set([0, 0, 1, 1], kColorOffset); // set the color
    uniformValues.set([0.5, 0.5], kScaleOffset); // set the scale
    uniformValues.set([0, 0], kOffsetOffset); // set the offset
    uniformValues.set([0], kTimeOffset); // set the time

    // Create the camera
    this.camera = new Camera(this.device);
    this.camera.updateScreenSize(canvas.width, canvas.height);

    // Create a bind group to hold the uniforms
    const uniformBindGroup = this.device.createBindGroup({
      label: "Local Uniforms",
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.camera.buffer,
          },
        },
      ],
    });

    const depthTexture = this.device.createTexture({
      size: [canvas.width, canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    let frameCount = 0;
    let prevTime = 0;

    const render = (timestamp: number) => {
      if (!this.device || !this.camera) return;
      // Ideally you'd set this during the `render()` lifecycle (since canvas may change)
      // aka example of a "dynamic" uniform
      // const timeUniformData = Date.now();
      const timeUniformData = timestamp;
      const aspect = canvas.width / canvas.height;
      uniformValues[kScaleOffset] = 0.5 / aspect;
      uniformValues[kScaleOffset + 1] = 0.5;
      uniformValues[kOffsetOffset + 1] = frameCount;
      uniformValues[kTimeOffset + 1] = timestamp;

      // Calculate delta time in seconds
      const deltaTime = (timestamp - prevTime) / 1000;
      prevTime = timestamp;

      // console.log("time / frame", timeUniformData, frameCount, uniformValues);

      // Create command encoder (that runs render tasks)
      const commandEncoder = this.device.createCommandEncoder();

      const clearColor = { r: 0.2, g: 0.2, b: 0.2, a: 1.0 };
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            loadValue: [0.5, 0, 1, 1],
            loadOp: "clear",
            storeOp: "store",
            view: context.getCurrentTexture().createView(),
          } as GPURenderPassColorAttachment,
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      };
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      // Update uniforms
      this.device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      this.camera.updateRotation(deltaTime, this.device);

      // Render
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setIndexBuffer(indexBuffer, "uint16");
      passEncoder.drawIndexed(indices.length, 1);
      // passEncoder.draw(vertices.length);
      passEncoder.end();
      // Finish rendering
      this.device.queue.submit([commandEncoder.finish()]);

      // Rinse repeat
      frameCount++;
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }
}
