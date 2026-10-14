import customShader from "../shaders/examples/custom.wgsl?raw";
import Camera from "./camera";
import { mat4, vec4 } from "wgpu-matrix";
import ParticleSystem from "./particle-system";
import AudioPlayer from "./audio";
import { importObj, loadObj } from "./import/obj";
import {
  createTexture,
  createTextureBindGroup,
  loadImage,
  createSampler,
  createTextureFromUrl,
  SamplerOptions,
  TextureOptions,
} from "./texture";
import { generateCube } from "../primitives/cube";
import { generatePlane } from "../primitives/plane";
import { generateSphere } from "../primitives/sphere";
import { generateCylinder } from "../primitives/cylinder";
import { generateCone } from "../primitives/cone";
import { generateTorus } from "../primitives/torus";
import Geometry, {
  CreateGeometryData,
  generateIndexBufferData,
  generateVertexBufferData,
} from "./geometry";
import { UNIFORM_BIND_GROUP_LAYOUT_IDS } from "./constants/uniforms";
import { Uniforms, UniformsDataStructure } from "./uniforms";
import { Vector2D, Vector3D, Vector4D } from "./vertex";
import { Mesh } from "./mesh";
import Material from "./material";
import { getDevice, requestWebGPUDevice } from "./device";
import {
  createRenderPipeline,
  getRenderPipeline_DEPRECATED,
  RenderPipelineCacheItem,
  RenderPipelineConfig,
} from "./render-pipeline";
import rendererStore from "./store/renderer";
import ComputePipeline, {
  ComputeBufferBinding,
  ComputePipelineConfig,
} from "./compute-pipeline";
import Light from "./lights/light";
import DirectionalLight from "./lights/directional-light";
import AmbientLight from "./lights/ambient-light";

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
  lightDirection: Vector3D;
  /**
   * rgb = light color, w = light intensity.
   */
  lightColor: Vector4D;
  ambientIntensity: number;
}

export type RenderProps = {
  timestamp: number;
  meshes: Mesh[];
  materials: Record<string, Material>;
  commandEncoder: GPUCommandEncoder;
};

export type RenderStats = {
  fps: number;
  frameCount: number;
  deltaTime: number;
};

export default class WebGPURenderer {
  // Core Dependencies
  canvas!: HTMLCanvasElement;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  camera!: Camera;
  depthTexture!: GPUTexture;
  multisampleTexture!: GPUTexture;

  // Uniforms
  globalUniforms!: Uniforms<GlobalUniforms>;

  // Textures
  sampler!: GPUSampler;

  // Timing
  frameCount: number = 0;
  prevTime: number = 0;

  // Animation frame management
  private animationFrameId: number | null = null;
  private renderCallback: ((props: RenderProps) => void) | null = null;

  // FPS tracking
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;

  // Scene
  meshes: Mesh[] = [];
  materials: Record<string, Material> = {};
  pipelines: Map<string, RenderPipelineCacheItem> = new Map();
  computePipelines: Map<string, ComputePipeline> = new Map();
  lights: Map<string, Light> = new Map();

  // Resize observer
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Check if the browser supports WebGPU.
   * @returns true if WebGPU is available
   */
  static isWebGPUSupported(): boolean {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }

  async init() {
    // Check WebGPU support
    if (!WebGPURenderer.isWebGPUSupported()) {
      throw new Error(
        "WebGPU is not supported in this browser. Please use a browser with WebGPU support (Chrome 113+, Edge 113+, Firefox 141+, or Safari 26+).",
      );
    }

    // See if user supports WebGPU and store "device" in global store
    await requestWebGPUDevice();
    // Grab the device from the global store
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

    // Setup default render pipeline (basically PBR)
    const renderConfig: RenderPipelineConfig = {
      // shader: defaultShader,
      name: "Default",
    };
    const defaultRenderPipeline = createRenderPipeline(renderConfig);

    // Save to local cache
    this.pipelines.set(defaultRenderPipeline.name, defaultRenderPipeline);

    // Create a sampler with linear filtering for smooth interpolation.
    this.sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    // Example: Custom shader
    // const customShaderConfig: RenderPipelineConfig = {
    //   shader: customShader,
    //   name: "Custom",
    // };
    // const customRenderPipeline = createRenderPipeline(customShaderConfig);
    // const customMaterial = new Material(
    //   this.device,
    //   "Custom",
    //   customRenderPipeline.pipeline,
    // );

    // Create meshes (with geometry and materials inside) to render
    // const cubeMesh = generateCube(
    //   this.device,
    //   customRenderPipeline.pipeline,
    //   0.1,
    // );

    // Create a default material for any object
    const defaultMaterial = new Material(
      this.device,
      "Default",
      defaultRenderPipeline.pipeline,
    );
    // Default shader samples a texture at group(3), so every material
    // needs a texture bind group. Give the default material a 1x1 white
    // texture until the user assigns a real one.
    defaultMaterial.createDefaultTexture(this.device, this.sampler);

    // Save material to cache
    this.materials = {
      Default: defaultMaterial,
    };

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
      lightDirection: {
        x: 0,
        y: -1,
        z: -1,
      },
      lightColor: {
        x: 1,
        y: 1,
        z: 1,
        w: 1,
      },
      ambientIntensity: 0.3,
    };

    // Global Uniforms
    this.globalUniforms = new Uniforms(
      this.device,
      defaultRenderPipeline.pipeline,
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
      ],
    );

    // Create depth and MSAA texture
    this.createCanvasTextures();

    // Create default lighting
    this.createDirectionalLight("DefaultDirectional", { x: 0, y: -1, z: -1 });
    this.createAmbientLight("DefaultAmbient", 0.3);

    // Create particle system
    // this.particleSystem = new ParticleSystem(
    //   this.device,
    //   this.camera,
    //   cubeMesh.geometry,
    // );

    // Setup events
    this.setupResize();

    this.frameCount = 0;
    this.prevTime = 0;
  }

  /**
   * Gets render pipeline from cache by key
   * @param name
   * @returns
   */
  getRenderPipeline(name: string) {
    const defaultPipeline = this.pipelines.get(name);
    if (!defaultPipeline)
      throw new Error(`Couldn't get the render pipeline: ${name}`);

    return defaultPipeline;
  }

  async loadObj(url: string = "/models/cube-tri-untextured.obj") {
    const defaultPipeline = this.getRenderPipeline("Default");

    const { meshes, materials } = await importObj(
      url,
      this.device,
      defaultPipeline.pipeline,
      this.sampler,
    );

    // Add meshes and material to local renderer cache
    meshes.forEach((newMesh) => {
      this.meshes.push(newMesh);
    });

    for (const name in materials) {
      const newMaterial = materials[name];
      this.materials[name] = newMaterial;
    }
  }

  /**
   * Creates `Geometry` and appropriate buffers using provided 3D data.
   * @param name
   * @param positions
   * @param normals
   * @param uvs
   * @param meshIndices
   * @returns
   */
  createGeometry(
    name: string,
    positions: Vector3D[],
    normals: Vector3D[],
    uvs: Vector2D[],
    meshIndices: number[],
    customVertexBufferDescriptor?: GPUVertexBufferLayout[],
  ) {
    // Create "geometry" containing the vertex + index data
    const geometry = new Geometry(this.device, {
      name: name,
      vertices: generateVertexBufferData(positions, normals, uvs),
      indices: generateIndexBufferData(meshIndices),
    });

    return geometry;
  }

  /**
   * Creates `Geometry` with custom vertex layout and appropriate buffers using provided 3D data.
   * @param name
   * @param positions
   * @param normals
   * @param uvs
   * @param meshIndices
   * @returns
   */
  createCustomGeometry(
    name: string,
    vertices: Float32Array<ArrayBufferLike>,
    customVertexBufferDescriptor: GPUVertexBufferLayout[],
    meshIndices?: number[],
  ) {
    const geometryData = {
      name: name,
      vertices,
    } as CreateGeometryData;
    if (meshIndices) {
      geometryData.indices = generateIndexBufferData(meshIndices);
    }

    // Create "geometry" containing the vertex + index data
    const geometry = new Geometry(
      this.device,
      geometryData,
      customVertexBufferDescriptor,
    );

    return geometry;
  }

  /**
   * Adds a `Mesh` to the scene using provided `Geometry` and key of existing material.
   * @param renderPipeline -
   * @param geometry - The geometry
   * @param material - The key/name of the Material that should be loaded into renderer cache.
   * @returns
   */
  addMesh(geometry: Geometry, material: string, renderPipelineName?: string) {
    const pipelineKey = renderPipelineName ?? "Default";
    const defaultPipeline = this.getRenderPipeline(pipelineKey);

    // Create a mesh that combines geometry and material
    const mesh = new Mesh(
      this.device,
      defaultPipeline.pipeline,
      geometry,
      material,
    );

    return mesh;
  }

  /**
   * Creates a cube `Mesh` and adds to scene.
   * @param scale
   * @param renderPipelineName
   */
  createCube(scale: number = 0.1, renderPipelineName?: string) {
    const pipelineKey = renderPipelineName ?? "Default";
    const defaultPipeline = this.getRenderPipeline(pipelineKey);

    const cubeMesh = generateCube(this.device, defaultPipeline.pipeline, scale);

    this.meshes.push(cubeMesh);
  }

  /**
   * Creates a plane `Mesh` and adds to scene.
   * @param width - Plane width
   * @param height - Plane height
   * @param renderPipelineName
   */
  createPlane(
    width: number = 1,
    height: number = 1,
    renderPipelineName?: string,
  ) {
    const pipelineKey = renderPipelineName ?? "Default";
    const defaultPipeline = this.getRenderPipeline(pipelineKey);

    const planeMesh = generatePlane(
      this.device,
      defaultPipeline.pipeline,
      width,
      height,
    );

    this.meshes.push(planeMesh);
  }

  /**
   * Creates a sphere `Mesh` and adds to scene.
   * @param radius - Sphere radius
   * @param widthSegments - Number of horizontal segments
   * @param heightSegments - Number of vertical segments
   * @param renderPipelineName
   */
  createSphere(
    radius: number = 1,
    widthSegments: number = 32,
    heightSegments: number = 16,
    renderPipelineName?: string,
  ) {
    const pipelineKey = renderPipelineName ?? "Default";
    const defaultPipeline = this.getRenderPipeline(pipelineKey);

    const sphereMesh = generateSphere(
      this.device,
      defaultPipeline.pipeline,
      radius,
      widthSegments,
      heightSegments,
    );

    this.meshes.push(sphereMesh);
  }

  /**
   * Creates a cylinder `Mesh` and adds to scene.
   * @param radiusTop - Top radius
   * @param radiusBottom - Bottom radius
   * @param height - Cylinder height
   * @param radialSegments - Number of segments around the circumference
   * @param renderPipelineName
   */
  createCylinder(
    radiusTop: number = 1,
    radiusBottom: number = 1,
    height: number = 2,
    radialSegments: number = 32,
    renderPipelineName?: string,
  ) {
    const pipelineKey = renderPipelineName ?? "Default";
    const defaultPipeline = this.getRenderPipeline(pipelineKey);

    const cylinderMesh = generateCylinder(
      this.device,
      defaultPipeline.pipeline,
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
    );

    this.meshes.push(cylinderMesh);
  }

  /**
   * Creates a cone `Mesh` and adds to scene.
   * @param radius - Base radius
   * @param height - Cone height
   * @param radialSegments - Number of segments around the circumference
   * @param renderPipelineName
   */
  createCone(
    radius: number = 1,
    height: number = 2,
    radialSegments: number = 32,
    renderPipelineName?: string,
  ) {
    const pipelineKey = renderPipelineName ?? "Default";
    const defaultPipeline = this.getRenderPipeline(pipelineKey);

    const coneMesh = generateCone(
      this.device,
      defaultPipeline.pipeline,
      radius,
      height,
      radialSegments,
    );

    this.meshes.push(coneMesh);
  }

  /**
   * Creates a torus `Mesh` and adds to scene.
   * @param radius - Major radius
   * @param tube - Minor radius (tube thickness)
   * @param radialSegments - Number of segments around the tube
   * @param tubularSegments - Number of segments around the torus
   * @param renderPipelineName
   */
  createTorus(
    radius: number = 1,
    tube: number = 0.4,
    radialSegments: number = 16,
    tubularSegments: number = 48,
    renderPipelineName?: string,
  ) {
    const pipelineKey = renderPipelineName ?? "Default";
    const defaultPipeline = this.getRenderPipeline(pipelineKey);

    const torusMesh = generateTorus(
      this.device,
      defaultPipeline.pipeline,
      radius,
      tube,
      radialSegments,
      tubularSegments,
    );

    this.meshes.push(torusMesh);
  }

  /**
   * Load a texture from a URL.
   * @param url - The image URL
   * @param options - Texture creation options
   * @returns The created GPUTexture
   */
  async loadTexture(
    url: string,
    options?: TextureOptions,
  ): Promise<GPUTexture> {
    const image = await loadImage(url);
    return createTexture(this.device, image, options);
  }

  /**
   * Create a sampler with custom options.
   * @param options - Sampler configuration
   * @returns The created GPUSampler
   */
  createSamplerWithOptions(options?: SamplerOptions): GPUSampler {
    return createSampler(this.device, options);
  }

  /**
   * Loads custom shader as render pipeline + material into scene.
   * @param shaderName - The key/name of shader. Use it later to attach to mesh.
   * @param shaderCode - The WGSL shader code with vertex and/or fragment
   */
  createCustomShader(shaderName: string, shaderCode: string, mesh?: Mesh) {
    const customShaderConfig: RenderPipelineConfig = {
      shader: shaderCode,
      name: shaderName,
    };
    // Did user pass a specific `Mesh`? Use a custom vertex layout for shader.
    // e.g. if Geometry vertices are amplitude/index versus the default position/normal/UVs
    const vertexBufferLayout = mesh
      ? mesh.geometry.vertexBufferDescriptor
      : undefined;

    const customRenderPipeline = createRenderPipeline(
      customShaderConfig,
      vertexBufferLayout,
    );
    this.pipelines.set(shaderName, customRenderPipeline);

    const customMaterial = new Material(
      this.device,
      shaderName,
      customRenderPipeline.pipeline,
    );

    this.materials[shaderName] = customMaterial;
  }

  /**
   * Create a compute pipeline.
   * @param name - Key/name for the compute pipeline
   * @param shaderCode - WGSL compute shader code
   * @param bufferBindings - Buffer bindings for the shader
   * @returns The created ComputePipeline
   */
  createComputeShader(
    name: string,
    shaderCode: string,
    bufferBindings: ComputeBufferBinding[],
  ): ComputePipeline {
    const config: ComputePipelineConfig = {
      shaderCode,
      bufferBindings,
      label: name,
    };
    const computePipeline = new ComputePipeline(this.device, config);
    this.computePipelines.set(name, computePipeline);
    return computePipeline;
  }

  /**
   * Get a compute pipeline by name.
   * @param name - The name of the compute pipeline
   * @returns The ComputePipeline or undefined
   */
  getComputePipeline(name: string): ComputePipeline | undefined {
    return this.computePipelines.get(name);
  }

  /**
   * Update a shader with new WGSL code (hot-reload).
   * @param name - The name of the shader to update
   * @param newShaderCode - New WGSL shader code
   */
  updateShader(name: string, newShaderCode: string) {
    const existing = this.pipelines.get(name);
    if (!existing) {
      console.warn(`[WebGPURenderer] Shader "${name}" not found.`);
      return;
    }

    const config: RenderPipelineConfig = {
      shader: newShaderCode,
      name,
    };
    const newPipeline = createRenderPipeline(config);
    this.pipelines.set(name, newPipeline);

    // Update materials that use this pipeline
    Object.values(this.materials).forEach((material) => {
      if (material.renderPipeline === existing.pipeline) {
        material.renderPipeline = newPipeline.pipeline;
      }
    });
  }

  /**
   * Add a light to the scene.
   * Light properties are packed into the shared globals uniform each frame.
   * @param name - Key/name for the light
   * @param light - The light to add
   * @returns this (for chaining)
   */
  addLight(name: string, light: Light): this {
    this.lights.set(name, light);
    return this;
  }

  /**
   * Remove a light from the scene.
   * @param name - The name of the light to remove
   * @returns this (for chaining)
   */
  removeLight(name: string): this {
    this.lights.delete(name);
    return this;
  }

  /**
   * Get a light by name.
   * @param name - The name of the light
   * @returns The Light or undefined
   */
  getLight(name: string): Light | undefined {
    return this.lights.get(name);
  }

  /**
   * Create and add a directional light.
   * @param name - Key/name for the light
   * @param direction - Light direction
   * @returns The created DirectionalLight
   */
  createDirectionalLight(
    name: string = "DirectionalLight",
    direction: Vector3D = { x: 0, y: -1, z: 0 },
  ): DirectionalLight {
    const light = new DirectionalLight(direction);
    this.addLight(name, light);
    return light;
  }

  /**
   * Create and add an ambient light.
   * @param name - Key/name for the light
   * @param intensity - Light intensity
   * @returns The created AmbientLight
   */
  createAmbientLight(
    name: string = "AmbientLight",
    intensity: number = 0.3,
  ): AmbientLight {
    const light = new AmbientLight(intensity);
    this.addLight(name, light);
    return light;
  }

  /**
   * Pack scene light properties into the shared globals uniform.
   * Called each frame before the globals uniform is uploaded, so light
   * mutations (e.g. `getLight("Sun").setColor(...)`) take effect
   * without any extra work from the user.
   */
  syncLightsToGlobals() {
    if (!this.globalUniforms) return;

    // First directional light wins for direction + color.
    for (const light of this.lights.values()) {
      if (light instanceof DirectionalLight) {
        this.globalUniforms.uniforms.lightDirection = { ...light.direction };
        this.globalUniforms.uniforms.lightColor = {
          x: light.color.x,
          y: light.color.y,
          z: light.color.z,
          w: light.intensity,
        };
        break;
      }
    }

    // First ambient light wins for the ambient floor.
    for (const light of this.lights.values()) {
      if (light instanceof AmbientLight) {
        this.globalUniforms.uniforms.ambientIntensity = light.intensity;
        break;
      }
    }
  }

  /**
   * Start the continuous render loop.
   * @param callback - Called each frame with scene data for mutation before render
   */
  render(callback: (props: RenderProps) => void) {
    this.renderCallback = callback;
    this.startLoop();
  }

  /**
   * Start the animation frame loop (internal).
   */
  private startLoop() {
    const loop = (timestamp: number) => {
      this.renderFrame(timestamp);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the animation frame loop.
   */
  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render a single frame without starting the loop.
   * Useful for render-on-demand workflows.
   */
  renderOnce() {
    if (!this.renderCallback) {
      console.warn("[WebGPURenderer] No render callback set. Call render() first.");
      return;
    }
    this.renderFrame(performance.now());
  }

  /**
   * Internal: render a single frame.
   */
  private renderFrame(timestamp: number) {
    // Check if we have required element for rendering
    if (
      !this.device ||
      !this.camera ||
      !this.multisampleTexture ||
      !this.depthTexture
    )
      return;

    this.camera.loop();

    // Update time uniform + pack latest light properties into globals
    this.globalUniforms.uniforms.time = timestamp;
    this.syncLightsToGlobals();
    this.globalUniforms.setUniforms();

    // Calculate delta time in seconds
    const deltaTime = (timestamp - this.prevTime) / 1000;
    this.prevTime = timestamp;

    // FPS tracking
    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 1.0) {
      this.currentFps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    // Render callback
    const commandEncoder = this.device.createCommandEncoder();
    const renderProps: RenderProps = {
      timestamp,
      meshes: this.meshes,
      materials: this.materials,
      commandEncoder,
    };
    this.renderCallback?.(renderProps);

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          loadValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
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

    this.camera.updateRotation();

    // Render each visible mesh
    this.meshes.forEach((mesh) => {
      if (mesh.visible === false) return;

      const material = this.materials[mesh.material];
      if (!material) return;

      passEncoder.setPipeline(material.renderPipeline);
      passEncoder.setBindGroup(0, this.globalUniforms.uniformBindGroup);

      material.uniforms.updateUniforms();

      passEncoder.setBindGroup(
        UNIFORM_BIND_GROUP_LAYOUT_IDS["locals"],
        mesh.uniforms.uniformBindGroup,
      );
      passEncoder.setBindGroup(
        UNIFORM_BIND_GROUP_LAYOUT_IDS["material"],
        material.uniforms.uniformBindGroup,
      );
      if (material.textureBindGroup) {
        passEncoder.setBindGroup(
          UNIFORM_BIND_GROUP_LAYOUT_IDS["texture"],
          material.textureBindGroup,
        );
      }

      passEncoder.setVertexBuffer(0, mesh.geometry.vertexBuffer);

      if (mesh.geometry.indices && mesh.geometry.indexBuffer) {
        passEncoder.setIndexBuffer(mesh.geometry.indexBuffer, "uint16");
        passEncoder.drawIndexed(mesh.geometry.indices.length, 1);
      } else {
        passEncoder.draw(mesh.geometry.vertices.length, 1);
      }
    });

    passEncoder.end();
    this.device.queue.submit([commandEncoder.finish()]);

    this.frameCount++;
  }

  /**
   * Add a mesh to the scene.
   * @param mesh - The mesh to add
   * @returns this (for chaining)
   */
  add(mesh: Mesh): this {
    this.meshes.push(mesh);
    return this;
  }

  /**
   * Remove a mesh from the scene.
   * @param mesh - The mesh to remove
   * @returns this (for chaining)
   */
  remove(mesh: Mesh): this {
    const index = this.meshes.indexOf(mesh);
    if (index !== -1) {
      this.meshes.splice(index, 1);
    }
    return this;
  }

  /**
   * Find a mesh by its geometry name.
   * @param name - The geometry name to search for
   * @returns The matching mesh, or undefined
   */
  getMeshByName(name: string): Mesh | undefined {
    return this.meshes.find((mesh) => mesh.geometry.name === name);
  }

  /**
   * Get render statistics.
   * @returns Current FPS, frame count, and delta time
   */
  getStats(): RenderStats {
    return {
      fps: Math.round(this.currentFps),
      frameCount: this.frameCount,
      deltaTime: this.prevTime > 0 ? (performance.now() - this.prevTime) / 1000 : 0,
    };
  }

  /**
   * Resize the canvas and recreate GPU textures.
   * @param width - New width in CSS pixels
   * @param height - New height in CSS pixels
   */
  setSize(width: number, height: number) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.createCanvasTextures();
    this.camera?.updateScreenSize(width, height);
  }

  /**
   * Set the pixel ratio for the canvas backing store.
   * @param ratio - Device pixel ratio (e.g., window.devicePixelRatio)
   */
  setPixelRatio(ratio: number) {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth || this.canvas.width;
    const height = this.canvas.clientHeight || this.canvas.height;
    this.setSize(Math.floor(width * ratio), Math.floor(height * ratio));
  }

  /**
   * Dispose of all GPU resources.
   * Call this when the renderer is no longer needed.
   */
  dispose() {
    this.stop();

    // Disconnect resize observer
    this.resizeObserver?.disconnect();

    // Destroy textures
    this.depthTexture?.destroy();
    this.multisampleTexture?.destroy();

    // Dispose meshes (geometry buffers + uniform buffers)
    this.meshes.forEach((mesh) => mesh.dispose?.());

    // Dispose materials
    Object.values(this.materials).forEach((material) => material.dispose?.());

    // Lights hold no GPU resources (packed into globals), just clear the map.

    // Dispose compute pipelines
    this.computePipelines.forEach((pipeline) => pipeline.dispose());

    // Clear collections
    this.meshes = [];
    this.materials = {};
    this.pipelines.clear();
    this.lights.clear();
    this.computePipelines.clear();

    // Unconfigure context
    this.context?.unconfigure();

    this.device = null!;
    this.context = null!;
    this.depthTexture = null!;
    this.multisampleTexture = null!;
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
        "Couldn't create a context with canvas element. Please check if your browser supports WebGPU.",
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
    this.resizeObserver = new ResizeObserver((entries) => {
      if (!this.device || !this.camera) return;
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement;
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;
        canvas.width = Math.max(
          1,
          Math.min(width, this.device.limits.maxTextureDimension2D),
        );
        canvas.height = Math.max(
          1,
          Math.min(height, this.device.limits.maxTextureDimension2D),
        );
        console.log("resizing...", canvas.width, canvas.height);

        this.createCanvasTextures();
        this.camera.updateScreenSize(canvas.width, canvas.height);
      }
    });

    let canvas = this.getCanvas();
    this.resizeObserver.observe(canvas);
  }

  preventRightClick() {
    this.canvas.addEventListener("contextmenu", (event) =>
      event.preventDefault(),
    );
  }
}
