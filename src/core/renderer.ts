import defaultShader from "../shaders/default.wgsl?raw";
import Camera from "./camera";
import { mat4, vec4 } from "wgpu-matrix";
import ParticleSystem from "./particle-system";
import AudioPlayer from "./audio";
import { importObj, loadObj } from "./import/obj";
import { createTexture, createTextureBindGroup, loadImage } from "./texture";
import { generateCube } from "../primitives/cube";
import Geometry from "./geometry";
import { UNIFORM_BIND_GROUP_LAYOUT_IDS } from "./constants/uniforms";
import { Uniforms, UniformsDataStructure } from "./uniforms";
import { Vector3D } from "./vertex";

export default class WebGPURenderer {
  canvas!: HTMLCanvasElement;
  device!: GPUDevice;
  camera!: Camera;
  depthTexture!: GPUTexture;
  multisampleTexture!: GPUTexture;
  audio!: AudioPlayer;
  particleSystem!: ParticleSystem;

  // Mesh attributes
  // @TODO: Extract to a mesh class
  texture!: GPUTexture;

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
    this.canvas = this.getCanvas();
    // Make it fullscreen
    this.canvas.width = window.screen.width;
    this.canvas.height = window.screen.height;
    console.log("canvas created", this.canvas.width, this.canvas.height);

    // Remove right click menu
    this.preventRightClick();

    const context = this.getContext();
    context.configure({
      device: this.device,
      format: "bgra8unorm",
    });

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
    // const bindGroupLayout = this.device.createBindGroupLayout({
    //   entries: [
    //     {
    //       binding: 0,
    //       visibility: GPUShaderStage.VERTEX,
    //       buffer: {
    //         type: "uniform",
    //       },
    //     },
    //     {
    //       binding: 1,
    //       visibility: GPUShaderStage.VERTEX,
    //       buffer: {
    //         type: "uniform",
    //       },
    //     },
    //     {
    //       binding: 2,
    //       visibility: GPUShaderStage.VERTEX,
    //       buffer: {
    //         type: "read-only-storage",
    //       },
    //     },
    //     {
    //       binding: 3,
    //       visibility: GPUShaderStage.VERTEX,
    //       buffer: {
    //         type: "storage",
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
      // Add depth testing
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },

      multisample: {
        count: 4,
      },

      // This determines the bind group layout automatically by analyzing the shader modules
      layout: "auto",

      // Manually define the bind group layout for shader uniforms
      // layout: this.device.createPipelineLayout({
      //   bindGroupLayouts: [bindGroupLayout],
      // }),
    };
    const renderPipeline = this.device.createRenderPipeline(pipelineDescriptor);

    // Create a sampler with linear filtering for smooth interpolation.
    const sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    // Setup vertex buffer
    // Generate vertices for a plane (a rectangle aka 2 tris)
    // const { vertices, indices } = generatePlane(0.5);
    const cubeMesh = generateCube(this.device, renderPipeline, 0.1);
    const { meshes: planeMeshes, materials: planeMats } = await importObj(
      "/models/plane-with-texture/plane-with-texture.obj",
      //   "/models/classic-piano/classic-piano.obj",
      // "/models/suzanne-tri-untextured.obj",
      this.device,
      renderPipeline,
      sampler
    );

    planeMeshes[0].uniforms.uniforms.position.x = 2;
    planeMeshes[0].uniforms.uniforms.position.y = 2;
    planeMeshes[0].uniforms.setUniforms(this.device);

    const { meshes: monkeyMeshes, materials: monkeyMats } = await importObj(
      // "/models/torus-knot-tri-untextured.obj",
      // "/models/cube-tri-untextured.obj",
      "/models/suzanne-tri-untextured.obj",
      // "/models/classic-piano/classic-piano.obj",
      this.device,
      renderPipeline,
      sampler
    );

    const meshes = [...planeMeshes, ...monkeyMeshes, cubeMesh];
    const materials = { ...planeMats, ...monkeyMats };

    // Test updating uniforms
    cubeMesh.uniforms.uniforms.scale.x = 4;
    cubeMesh.uniforms.uniforms.scale.y = 4;
    cubeMesh.uniforms.uniforms.scale.z = 4;
    cubeMesh.uniforms.setUniforms(this.device);

    monkeyMeshes[0].uniforms.uniforms.position.x = -2;
    monkeyMeshes[0].uniforms.uniforms.position.y = -2;

    console.log("[RENDERER] loaded OBJ", meshes, materials);

    // Create the camera
    this.camera = new Camera(this.device);
    this.camera.updateScreenSize(this.canvas.width, this.canvas.height);

    // Instance uniforms
    // Update the uniform buffer with instance matrices (translation)

    const instanceCount = 500;
    const floatsPerInstance = 16; // mat4 + color
    const instanceUniformValue = new Float32Array(
      instanceCount * floatsPerInstance
    );

    for (let i = 0; i < instanceCount; i++) {
      const offset = i * floatsPerInstance;

      const model = mat4.translation([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 2,
      ]);

      instanceUniformValue.set(model, offset);
    }

    const instanceUniformBuffer = this.device.createBuffer({
      label: "Instances Uniform buffer",
      size: instanceUniformValue.byteLength, // Size for translation matrix per instance,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    interface GlobalUniforms extends UniformsDataStructure {
      time: number;
      lightPosition: Vector3D;
    }

    const globalUniformData: GlobalUniforms = {
      time: 0,
      lightPosition: {
        x: 3,
        y: 3,
        z: 3,
      },
    };

    // Global Uniforms
    const globalUniforms = new Uniforms(
      this.device,
      renderPipeline,
      "Global",
      globalUniformData,
      UNIFORM_BIND_GROUP_LAYOUT_IDS["globals"],
      [
        {
          binding: 1,
          resource: {
            buffer: this.camera.buffer,
          },
        },
      ]
    );

    // Create depth and MSAA texture
    this.createCanvasTextures();

    // Create particle system
    this.particleSystem = new ParticleSystem(
      this.device,
      this.camera,
      cubeMesh.geometry
    );

    this.audio = new AudioPlayer();
    await this.audio.load();

    // Setup events
    this.setupResize();

    let frameCount = 0;
    let prevTime = 0;

    const render = (timestamp: number) => {
      // Check if we have required element for rendering
      if (
        !this.device ||
        !this.camera ||
        !this.multisampleTexture ||
        !this.depthTexture
      )
        return;

      // Get latest waveform data
      let waveform;
      if (this.audio) waveform = this.audio.waveform();
      if (waveform) this.particleSystem?.updateAudioBuffer(waveform.buffer);
      this.camera.loop();

      // Ideally you'd set this during the `render()` lifecycle (since canvas may change)
      // aka example of a "dynamic" uniform
      globalUniforms.uniforms.time = timestamp;
      globalUniforms.setUniforms(this.device);

      // Calculate delta time in seconds
      const deltaTime = (timestamp - prevTime) / 1000;
      prevTime = timestamp;

      // console.log("time / frame", timeUniformData, frameCount, uniformValues);

      // Create command encoder (that runs render tasks)
      const commandEncoder = this.device.createCommandEncoder();

      // Compute shaders
      this.particleSystem?.compute(commandEncoder);

      const clearColor = { r: 0.2, g: 0.2, b: 0.2, a: 1.0 };
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            loadValue: [0.5, 0, 1, 1],
            loadOp: "clear",
            storeOp: "store",
            view: this.multisampleTexture.createView(),
            resolveTarget: context.getCurrentTexture().createView(),
          } as GPURenderPassColorAttachment,
        ],
        depthStencilAttachment: {
          view: this.depthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      };
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      // Render particles
      this.particleSystem?.render(passEncoder);

      // Update uniforms
      // this.device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      // this.camera.animateRotation(deltaTime);
      this.camera.updateRotation();
      // this.device.queue.writeBuffer(
      //   instanceUniformBuffer,
      //   0,
      //   instanceUniformValue
      // );

      // Render
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setBindGroup(0, globalUniforms.uniformBindGroup);

      // Loop over each mesh and render it
      meshes.forEach((mesh) => {
        // console.log("[RENDERING] mesh:", mesh.name);

        // Get mesh material and update material buffers with new data
        const material = materials[mesh.material];
        // console.log("[RENDERING] material", mesh.material, material);
        material.uniforms.updateUniforms(this.device);

        // Set bind groups (uniforms, texture, etc)
        passEncoder.setBindGroup(
          UNIFORM_BIND_GROUP_LAYOUT_IDS["locals"],
          mesh.uniforms.uniformBindGroup
        );
        passEncoder.setBindGroup(
          UNIFORM_BIND_GROUP_LAYOUT_IDS["material"],
          material.uniforms.uniformBindGroup
        );
        if (material && material.textureBindGroup) {
          passEncoder.setBindGroup(
            UNIFORM_BIND_GROUP_LAYOUT_IDS["texture"],
            material.textureBindGroup
          );
        }

        // Set geometry buffers (vertex + index)
        passEncoder.setVertexBuffer(0, mesh.geometry.vertexBuffer);
        passEncoder.setIndexBuffer(mesh.geometry.indexBuffer, "uint16");

        // Draw the mesh
        passEncoder.drawIndexed(mesh.geometry.indices.length, instanceCount);
      });

      passEncoder.end();
      // Finish rendering
      this.device.queue.submit([commandEncoder.finish()]);

      // Rinse repeat
      frameCount++;
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }

  getCanvas() {
    let canvas = document.getElementById("gpu-canvas") as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "gpu-canvas";
      document.getElementById("app")?.appendChild(canvas);
    }
    return canvas;
  }

  getContext() {
    if (!this.canvas) this.canvas = this.getCanvas();
    const context = this.canvas.getContext("webgpu");
    if (!context) {
      throw new Error(
        "Couldn't create a context with canvas element. Please check if your browser supports WebGPU."
      );
    }

    return context;
  }

  createCanvasTextures() {
    if (!this.canvas) this.canvas = this.getCanvas();
    if (!this.device) return;
    const SAMPLE_COUNT = 4;
    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: "depth24plus",
      sampleCount: SAMPLE_COUNT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Multi-sampling / Anti-aliasing
    // Get the current texture from the canvas context
    const context = this.getContext();
    const canvasTexture = context.getCurrentTexture();

    // If the multisample texture doesn't exist or
    // is the wrong size then make a new one.
    if (
      !this.multisampleTexture ||
      this.multisampleTexture.width !== canvasTexture.width ||
      this.multisampleTexture.height !== canvasTexture.height
    ) {
      // If we have an existing multisample texture destroy it.
      if (this.multisampleTexture) {
        this.multisampleTexture.destroy();
      }

      // Create a new multisample texture that matches our
      // canvas's size
      this.multisampleTexture = this.device.createTexture({
        format: canvasTexture.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: [canvasTexture.width, canvasTexture.height],
        sampleCount: SAMPLE_COUNT,
      });
    }
  }

  setupResize() {
    const observer = new ResizeObserver((entries) => {
      if (!this.device || !this.camera) return;
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement;
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;
        canvas.width = Math.max(
          1,
          Math.min(width, this.device.limits.maxTextureDimension2D)
        );
        canvas.height = Math.max(
          1,
          Math.min(height, this.device.limits.maxTextureDimension2D)
        );
        console.log("resizing...", canvas.width, canvas.height);

        this.createCanvasTextures();
        this.camera.updateScreenSize(canvas.width, canvas.height);
      }
    });

    let canvas = this.getCanvas();
    observer.observe(canvas);
  }

  preventRightClick() {
    this.canvas.addEventListener("contextmenu", (event) =>
      event.preventDefault()
    );
  }
}
