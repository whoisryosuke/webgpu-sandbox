export async function loadImage(url: string) {
  const response = await fetch(url);
  const imageBitmap = await createImageBitmap(await response.blob());
  return imageBitmap;
}

export function createTexture(device: GPUDevice, imageBitmap: ImageBitmap) {
  let cubeTexture: GPUTexture;

  // Create a texture for GPU
  cubeTexture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Copy image to texture buffer
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: cubeTexture },
    [imageBitmap.width, imageBitmap.height]
  );

  return cubeTexture;
}

/**
 * Creates a bind group containing a single texture and sampler
 */
export function createTextureBindGroup(
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  texture: GPUTexture,
  sampler: GPUSampler,
  groupIndex: number = 1
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
