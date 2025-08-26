import { getDevice } from "./device";
import { vertexBufferDescriptor } from "./vertex";
import defaultShader from "../shaders/default.wgsl?raw";
import rendererStore from "./store/renderer";
import { simpleRandomHash } from "./helpers/random";

export interface RenderPipelineConfig {
  name?: string;
  vertex?: string;
  fragment?: string;
  shader?: string;
  wireframe?: boolean;
}

export function createRenderPipeline(config: RenderPipelineConfig) {
  const device = getDevice();

  // Setup shader
  // We allow for a single shader file, or split between vert + frag
  const shaderModules: Record<"vertex" | "fragment", GPUShaderModule | null> = {
    vertex: null,
    fragment: null,
  };
  if (config.shader) {
    const shaderModule = device.createShaderModule({
      code: config.shader,
    });
    shaderModules.vertex = shaderModule;
    shaderModules.fragment = shaderModule;
  }
  if (config.vertex && config.fragment) {
    const vertexShader = device.createShaderModule({
      code: config.vertex,
    });
    const fragmentShader = device.createShaderModule({
      code: config.fragment,
    });
    shaderModules.vertex = vertexShader;
    shaderModules.fragment = fragmentShader;
  }
  // No shader provided? Use default shaders
  if (!shaderModules.vertex || !shaderModules.fragment) {
    const shaderModule = device.createShaderModule({
      code: defaultShader,
    });
    if (!shaderModules.vertex) {
      shaderModules.vertex = shaderModule;
    }
    if (!shaderModules.fragment) {
      shaderModules.fragment = shaderModule;
    }
  }

  // Setup shader

  // Render pipeline
  const pipelineDescriptor: GPURenderPipelineDescriptor = {
    vertex: {
      module: shaderModules.vertex,
      entryPoint: "vertex_main",
      buffers: vertexBufferDescriptor,
    },
    fragment: {
      module: shaderModules.fragment,
      entryPoint: "fragment_main",
      targets: [
        {
          format: "bgra8unorm",
        },
      ],
    },
    primitive: {
      // topology: "point-list", // Debug: See all points
      topology: config.wireframe ? "line-list" : "triangle-list",
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

  const pipeline = device.createRenderPipeline(pipelineDescriptor);

  const name = config.name ?? simpleRandomHash();

  // Add to global store
  rendererStore.setState((prev) => ({
    ...prev,
    renderPipelines: prev.renderPipelines.set(name, pipeline),
  }));

  // Return the name to user (in case we auto generated)
  return { name, pipeline };
}
