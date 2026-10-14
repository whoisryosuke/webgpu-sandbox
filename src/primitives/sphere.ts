import Geometry, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../core/geometry";
import { Mesh } from "../core/mesh";
import { Vector2D, Vector3D } from "../core/vertex";

/**
 * Generate a sphere mesh with UV mapping.
 * @param device - GPU device
 * @param renderPipeline - Render pipeline to use
 * @param radius - Sphere radius
 * @param widthSegments - Number of horizontal segments
 * @param heightSegments - Number of vertical segments
 * @returns Mesh
 */
export function generateSphere(
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  radius: number = 1,
  widthSegments: number = 32,
  heightSegments: number = 16,
): Mesh {
  const positions: Vector3D[] = [];
  const normals: Vector3D[] = [];
  const uvs: Vector2D[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;

      const px = -radius * Math.cos(theta) * Math.sin(phi);
      const py = radius * Math.cos(phi);
      const pz = radius * Math.sin(theta) * Math.sin(phi);

      positions.push({ x: px, y: py, z: pz });
      normals.push({
        x: px / radius,
        y: py / radius,
        z: pz / radius,
      });
      uvs.push({ x: u, y: 1 - v });
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;

      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geometry = new Geometry(device, {
    name: "Sphere",
    vertices: generateVertexBufferData(positions, normals, uvs),
    indices: generateIndexBufferData(indices),
  });

  return new Mesh(device, renderPipeline, geometry);
}
