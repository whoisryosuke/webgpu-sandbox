import "./style.css";
import defaultShader from "./shaders/default.wgsl?raw";

console.log("shader code", defaultShader);

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
    -1.0, -1.0, 0, 1, 0, 0, 1, 1.0, -1.0, 0, 0, 1, 0, 1, 1.0, 1.0, 0, 0, 1, 1,
    1, -1.0, 1.0, 0, 0, 0, 1, 1,
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
          format: "float32x3",
        },
        // Color
        {
          shaderLocation: 1,
          offset: 12,
          format: "float32x4",
        },
      ],
      arrayStride: 28,
      stepMode: "vertex",
    },
  ];

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
    // TODO: Set this up manually
    layout: "auto",
  };
  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

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

  passEncoder.setPipeline(renderPipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(4);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

window.addEventListener("load", main);
