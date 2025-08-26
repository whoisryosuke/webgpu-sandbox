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
import { Vector3D, vertexBufferDescriptor } from "./vertex";
import { Mesh } from "./mesh";
import Material from "./material";
import { getDevice, requestWebGPUDevice } from "./device";
import { createRenderPipeline, RenderPipelineConfig } from "./render-pipeline";

const PIANO_KEY_SPACING = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

interface GlobalUniforms extends UniformsDataStructure {
  time: number;
  lightPosition: Vector3D;
}

export type RenderProps = {
  timestamp: number;
  meshes: Mesh[];
  materials: Record<string, Material>;
};

export default class WebGPURenderer {
  canvas!: HTMLCanvasElement;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  renderPipeline!: GPURenderPipeline;
  camera!: Camera;
  depthTexture!: GPUTexture;
  multisampleTexture!: GPUTexture;
  audio!: AudioPlayer;
  particleSystem!: ParticleSystem;

  // Uniforms
  globalUniforms!: Uniforms<GlobalUniforms>;

  // Timing
  frameCount: number = 0;
  prevTime: number = 0;

  // Scene
  meshes: Mesh[] = [];
  materials: Record<string, Material> = {};

  async init() {
    await requestWebGPUDevice();
    this.device = getDevice();

    // Setup canvas and context
    this.canvas = this.getCanvas();
    // Make it fullscreen
    this.canvas.width = window.screen.width;
    this.canvas.height = window.screen.height;
    console.log("canvas created", this.canvas.width, this.canvas.height);

    // Remove right click menu
    this.preventRightClick();

    this.context = this.getContext();
    this.context.configure({
      device: this.device,
      format: "bgra8unorm",
    });

    // Setup render pipeline
    const renderConfig: RenderPipelineConfig = {
      // shader: defaultShader,
      name: "Default",
    };
    const { name: renderPipelineName, pipeline } =
      createRenderPipeline(renderConfig);
    this.renderPipeline = pipeline;

    // Create a sampler with linear filtering for smooth interpolation.
    const sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    // Setup vertex buffer
    // Generate vertices for a plane (a rectangle aka 2 tris)
    // const { vertices, indices } = generatePlane(0.5);
    const cubeMesh = generateCube(this.device, this.renderPipeline, 0.1);
    const defaultMaterial = new Material(
      this.device,
      this.renderPipeline,
      "Default"
    );

    const { meshes: planeMeshes, materials: planeMats } = await importObj(
      "/models/plane-with-texture/plane-with-texture.obj",
      //   "/models/classic-piano/classic-piano.obj",
      // "/models/suzanne-tri-untextured.obj",
      this.device,
      this.renderPipeline,
      sampler
    );

    planeMeshes[0].uniforms.uniforms.position.x = 2;
    planeMeshes[0].uniforms.uniforms.position.y = 2;
    planeMeshes[0].uniforms.setUniforms();

    const { meshes: customMesh, materials: customMats } = await importObj(
      // "/models/torus-knot-tri-untextured.obj",
      // "/models/cube-tri-untextured.obj",
      // "/models/ryoturia/ryoturia.obj",
      // "/models/ryoturia/ryoturia-keys.obj",
      // "/models/suzanne-tri-untextured.obj",
      // "/models/piano-key-set/piano-key-set.obj",
      "/models/classic-piano/classic-piano.obj",
      this.device,
      this.renderPipeline,
      sampler
    );

    this.meshes = [...planeMeshes, ...customMesh, cubeMesh];
    // this.meshes = [...customMesh];
    this.materials = { ...planeMats, ...customMats, Default: defaultMaterial };

    // Test updating uniforms
    cubeMesh.uniforms.uniforms.scale.x = 4;
    cubeMesh.uniforms.uniforms.scale.y = 4;
    cubeMesh.uniforms.uniforms.scale.z = 4;
    cubeMesh.uniforms.setUniforms();

    console.log("[RENDERER] loaded OBJ", this.meshes, this.materials);

    // Create the camera
    this.camera = new Camera(this.device);
    this.camera.updateScreenSize(this.canvas.width, this.canvas.height);

    // Instance uniforms
    // Update the uniform buffer with instance matrices (translation)

    const instanceCount = 500;
    // const floatsPerInstance = 16; // mat4 + color
    // const instanceUniformValue = new Float32Array(
    //   instanceCount * floatsPerInstance
    // );

    // for (let i = 0; i < instanceCount; i++) {
    //   const offset = i * floatsPerInstance;

    //   const model = mat4.translation([
    //     (Math.random() - 0.5) * 10,
    //     (Math.random() - 0.5) * 10,
    //     (Math.random() - 0.5) * 2,
    //   ]);

    //   instanceUniformValue.set(model, offset);
    // }

    // const instanceUniformBuffer = this.device.createBuffer({
    //   label: "Instances Uniform buffer",
    //   size: instanceUniformValue.byteLength, // Size for translation matrix per instance,
    //   usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    // });

    const globalUniformData: GlobalUniforms = {
      time: 0,
      lightPosition: {
        x: 3,
        y: 3,
        z: 3,
      },
    };

    // Global Uniforms
    this.globalUniforms = new Uniforms(
      this.device,
      this.renderPipeline,
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

    this.frameCount = 0;
    this.prevTime = 0;
  }

  render(callback: (props: RenderProps) => void) {
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
      this.globalUniforms.uniforms.time = timestamp;
      this.globalUniforms.setUniforms();

      // Calculate delta time in seconds
      const deltaTime = (timestamp - this.prevTime) / 1000;
      this.prevTime = timestamp;

      // Render callback
      // Let's user mutate scene before render
      const renderProps: RenderProps = {
        timestamp,
        meshes: this.meshes,
        materials: this.materials,
      };
      callback(renderProps);

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
            resolveTarget: this.context.getCurrentTexture().createView(),
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
      passEncoder.setPipeline(this.renderPipeline);
      passEncoder.setBindGroup(0, this.globalUniforms.uniformBindGroup);

      // Loop over each mesh and render it
      this.meshes.forEach((mesh) => {
        // console.log(
        //   "[RENDERING] mesh:",
        //   mesh.geometry.name,
        //   mesh.uniforms.uniforms.position
        // );

        // Get mesh material and update material buffers with new data
        const material = this.materials[mesh.material];
        // console.log("[RENDERING] material", mesh.material, material);
        material.uniforms.updateUniforms();

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
        passEncoder.drawIndexed(mesh.geometry.indices.length, 1);
      });

      passEncoder.end();
      // Finish rendering
      this.device.queue.submit([commandEncoder.finish()]);

      // Rinse repeat
      this.frameCount++;
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
