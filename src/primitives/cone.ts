import Geometry, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../core/geometry";
import { Mesh } from "../core/mesh";
import { Vector2D, Vector3D } from "../core/vertex";

/**
 * Generate a cone mesh (cylinder with top radius = 0).
 * @param device - GPU device
 * @param renderPipeline - Render pipeline to use
 * @param radius - Base radius
 * @param height - Cone height
 * @param radialSegments - Number of segments around the circumference
 * @returns Mesh
 */
export function generateCone(
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  radius: number = 1,
  height: number = 2,
  radialSegments: number = 32,
): Mesh {
  const positions: Vector3D[] = [];
  const normals: Vector3D[] = [];
  const uvs: Vector2D[] = [];
  const indices: number[] = [];

  const halfHeight = height / 2;

  // Side vertices
  for (let y = 0; y <= 1; y++) {
    const r = y === 0 ? radius : 0;
    const yy = y === 0 ? -halfHeight : halfHeight;

    for (let x = 0; x <= radialSegments; x++) {
      const u = x / radialSegments;
      const theta = u * Math.PI * 2;

      positions.push({
        x: r * Math.sin(theta),
        y: yy,
        z: r * Math.cos(theta),
      });

      // Normal
      const slope = radius / height;
      const normalLen = Math.sqrt(1 + slope * slope);
      normals.push({
        x: Math.sin(theta) / normalLen,
        y: slope / normalLen,
        z: Math.cos(theta) / normalLen,
      });
      uvs.push({ x: u, y: y });
    }
  }

  // Side indices
  for (let x = 0; x < radialSegments; x++) {
    const a = x;
    const b = x + radialSegments + 1;
    indices.push(a, b, a + 1);
  }

  // Bottom cap
  const bottomCenterIndex = positions.length;
  positions.push({ x: 0, y: -halfHeight, z: 0 });
  normals.push({ x: 0, y: -1, z: 0 });
  uvs.push({ x: 0.5, y: 0.5 });

  for (let x = 0; x <= radialSegments; x++) {
    const theta = (x / radialSegments) * Math.PI * 2;
    positions.push({
      x: radius * Math.sin(theta),
      y: -halfHeight,
      z: radius * Math.cos(theta),
    });
    normals.push({ x: 0, y: -1, z: 0 });
    uvs.push({
      x: Math.sin(theta) * 0.5 + 0.5,
      y: Math.cos(theta) * 0.5 + 0.5,
    });
  }

  for (let x = 0; x < radialSegments; x++) {
    indices.push(
      bottomCenterIndex,
      bottomCenterIndex + x + 2,
      bottomCenterIndex + x + 1,
    );
  }

  const geometry = new Geometry(device, {
    name: "Cone",
    vertices: generateVertexBufferData(positions, normals, uvs),
    indices: generateIndexBufferData(indices),
  });

  return new Mesh(device, renderPipeline, geometry);
}
