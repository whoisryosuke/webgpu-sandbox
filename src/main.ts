import "./style.css";
import defaultShader from "./shaders/default.wgsl?raw";

async function main() {
  await init();
}

async function init() {
  // Setup adapter and device
  const adapter = await window.navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error(
      "Couldn't create an adapter. Please check if your browser supports WebGPU."
    );
    return;
  }
  const device = await adapter.requestDevice();

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
    device,
    format: "bgra8unorm",
  });

  // Setup vertex buffer
  const vertices = new Float32Array([
    0.0, 0.6, 0, 1, 1, 0, 0, 1, -0.5, -0.6, 0, 1, 0, 1, 0, 1, 0.5, -0.6, 0, 1,
    0, 0, 1, 1,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
  vertexBuffer.unmap();

  // Setup shader
  const shaderModule = device.createShaderModule({
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
          format: "float32x4",
        },
        // Color
        {
          shaderLocation: 1,
          // This offset represents the 4x4 value from above
          // which comes from our 4D position (XYZA)
          offset: 16,
          format: "float32x4",
        },
      ],
      arrayStride: 32,
      stepMode: "vertex",
    },
  ];

  // Ideally we'd setup a bind group layout for our bind group
  // but since the render pipeline is set to `auto`, we don't need it
  // const bindGroupLayout = device.createBindGroupLayout({
  //   entries: [
  //     {
  //       binding: 0,
  //       visibility: GPUShaderStage.VERTEX,
  //       buffer: {
  //         type: "uniform",
  //       },
  //     },
  //   ],
  // });

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
      topology: "triangle-list",
    },
    // This determines the bind group layout automatically by analyzing the shader modules
    layout: "auto",
  };
  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

  // Create a uniform buffer
  // The buffer size is equivalent to all the data we put into our shader struct
  const uniformBufferSize =
    4 * 4 + // color is 4 32bit floats (4bytes each)
    2 * 4 + // scale is 2 32bit floats (4bytes each)
    2 * 4; // offset is 2 32bit floats (4bytes each)
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  // Create an buffer-friendly array (aka `TypedArray`) and use the buffer size
  const uniformValues = new Float32Array(uniformBufferSize / 4);
  // offsets to the various uniform values in float32 indices
  const kColorOffset = 0;
  const kScaleOffset = 4;
  const kOffsetOffset = 6;

  // Create the uniforms
  uniformValues.set([0, 1, 0, 1], kColorOffset); // set the color
  uniformValues.set([-0.5, -0.25], kOffsetOffset); // set the offset

  // Create a bind group to hold the uniforms
  const uniformBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });
  const timeUniformData = Date.now();

  // Ideally you'd set this during the `render()` lifecycle (since canvas may change)
  // aka example of a "dynamic" uniform
  const aspect = canvas.width / canvas.height;
  uniformValues.set([0.5 / aspect, 0.5], kScaleOffset); // set the scale

  // Update uniforms
  device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

  // Create command encoder (that runs render tasks)
  const commandEncoder = device.createCommandEncoder();

  const clearColor = { r: 0.2, g: 0.2, b: 0.2, a: 1.0 };
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        loadValue: clearColor,
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      } as GPURenderPassColorAttachment,
    ],
  };
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  // Render
  passEncoder.setPipeline(renderPipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(3);
  passEncoder.end();

  // Finish rendering
  device.queue.submit([commandEncoder.finish()]);
}

window.addEventListener("load", main);
