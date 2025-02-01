export function generatePlane(scale: number = 1.0, scaleY: number = 1.0) {
  const vertices = new Float32Array([
    // Front face
    -scale,
    -scale,
    0.0,
    1.0,

    scale,
    -scale,
    0.0,
    1.0,

    -scale,
    scale,
    0.0,
    1.0,

    scale,
    scale,
    0.0,
    1.0,
  ]);

  return { vertices };
}
