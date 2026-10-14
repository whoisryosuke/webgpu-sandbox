import { UNIFORM_BIND_GROUP_LAYOUT_IDS } from "./constants/uniforms";

/**
 * Options for creating a texture.
 */
export interface TextureOptions {
  format?: GPUTextureFormat;
  usage?: GPUTextureUsageFlags;
  mipLevelCount?: number;
}

/**
 * Options for creating a sampler.
 */
export interface SamplerOptions {
  magFilter?: GPUFilterMode;
  minFilter?: GPUFilterMode;
  mipmapFilter?: GPUFilterMode;
  addressModeU?: GPUAddressMode;
  addressModeV?: GPUAddressMode;
  addressModeW?: GPUAddressMode;
}

export async function loadImage(url: string) {
  const response = await fetch(url);
  const imageBitmap = await createImageBitmap(await response.blob());
  return imageBitmap;
}

export function createTexture(
  device: GPUDevice,
  imageBitmap: ImageBitmap,
  options?: TextureOptions,
): GPUTexture {
  let cubeTexture: GPUTexture;

  // Create a texture for GPU
  cubeTexture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: options?.format ?? "rgba8unorm",
    usage:
      options?.usage ??
      (GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT),
    mipLevelCount: options?.mipLevelCount ?? 1,
  });

  // Copy image to texture buffer
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: cubeTexture },
    [imageBitmap.width, imageBitmap.height],
  );

  return cubeTexture;
}

/**
 * Create a sampler with custom options.
 */
export function createSampler(
  device: GPUDevice,
  options?: SamplerOptions,
): GPUSampler {
  return device.createSampler({
    magFilter: options?.magFilter ?? "linear",
    minFilter: options?.minFilter ?? "linear",
    mipmapFilter: options?.mipmapFilter ?? "linear",
    addressModeU: options?.addressModeU ?? "clamp-to-edge",
    addressModeV: options?.addressModeV ?? "clamp-to-edge",
    addressModeW: options?.addressModeW ?? "clamp-to-edge",
  });
}

/**
 * Load a texture from a URL, create GPU texture + bind group.
 */
export async function createTextureFromUrl(
  device: GPUDevice,
  sampler: GPUSampler,
  renderPipeline: GPURenderPipeline,
  url: string,
  options?: TextureOptions,
) {
  const image = await loadImage(url);
  const texture = createTexture(device, image, options);
  const bindGroup = createTextureBindGroup(device, renderPipeline, texture, sampler);
  return { texture, bindGroup };
}

/**
 * Creates a bind group containing a single texture and sampler
 */
export function createTextureBindGroup(
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  texture: GPUTexture,
  sampler: GPUSampler,
  groupIndex: number = UNIFORM_BIND_GROUP_LAYOUT_IDS["texture"]
) {
  const textureBindGroup = device.createBindGroup({
    label: "Textures",
    layout: renderPipeline.getBindGroupLayout(groupIndex),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: texture.createView() },
    ],
  });
  return textureBindGroup;
}
