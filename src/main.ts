import "./style.css";
import defaultShader from "./shaders/default.wgsl?raw";
import { generatePlane } from "./primitives/plane";

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

  // Debug triangle
  // const vertices = new Float32Array([
  //   ...[0.0, 0.6, 0, 1], // Vertex
  //   ...[1, 0, 0, 1],
  //   ...[-0.5, -0.6, 0, 1],
  //   ...[0, 1, 0, 1],
  //   ...[0.5, -0.6, 0, 1],
  //   ...[0, 0, 1, 1],
  // ]);

  // Generate vertices for a plane (a rectangle aka 2 tris)
  const { vertices } = generatePlane(0.5);

  const vertexBuffer = device.createBuffer({
    label: "Vertex buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const indexData = new Uint32Array([
    0,
    1,
    3,
    0,
    2,
    3, // front
    // 4, 5, 6, 4, 6, 7, // back
    // 8, 9, 10, 8, 10, 11, // top
    // 12, 13, 14, 12, 14, 15, // bottom
    // 16, 17, 18, 16, 18, 19, // right
    // 20, 21, 22, 20, 22, 23, // left
  ]);
  //-0.5, -0.5, 0, 1, // 0
  // 0.5, -0.5, 0, 1, // 1
  // -0.5, 0.5, 0, 1, // 2
  // 0.5, 0.5, 0, 1 // 3

  const indexBuffer = device.createBuffer({
    label: "Index buffer",
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indexData);

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
      // topology: "point-list",
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
    2 * 4 + // offset is 2 32bit floats (4bytes each)
    1 * 4 + // time is 1 32bit floats (4bytes each)
    3 * 4; // we need some padding to meet 48 requirement;
  const uniformBuffer = device.createBuffer({
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

  // Create a bind group to hold the uniforms
  const uniformBindGroup = device.createBindGroup({
    label: "Local Uniforms",
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

  let frameCount = 0;

  const render = (timestamp: number) => {
    // Ideally you'd set this during the `render()` lifecycle (since canvas may change)
    // aka example of a "dynamic" uniform
    // const timeUniformData = Date.now();
    const timeUniformData = timestamp;
    const aspect = canvas.width / canvas.height;
    uniformValues[kScaleOffset] = 0.5 / aspect;
    uniformValues[kScaleOffset + 1] = 0.5;
    uniformValues[kOffsetOffset + 1] = frameCount;
    uniformValues[kTimeOffset + 1] = timestamp;

    // console.log("time / frame", timeUniformData, frameCount, uniformValues);

    // Create command encoder (that runs render tasks)
    const commandEncoder = device.createCommandEncoder();

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
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

    // Update uniforms
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // Render
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setIndexBuffer(indexBuffer, "uint32");
    passEncoder.drawIndexed(indexData.length, 1);
    // passEncoder.draw(3);
    passEncoder.end();
    // Finish rendering
    device.queue.submit([commandEncoder.finish()]);

    // Rinse repeat
    frameCount++;
    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
}

window.addEventListener("load", main);
