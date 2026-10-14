import Geometry, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../core/geometry";
import { Mesh } from "../core/mesh";
import { Vector2D, Vector3D } from "../core/vertex";

/**
 * Generate a cylinder mesh.
 * @param device - GPU device
 * @param renderPipeline - Render pipeline to use
 * @param radiusTop - Top radius
 * @param radiusBottom - Bottom radius
 * @param height - Cylinder height
 * @param radialSegments - Number of segments around the circumference
 * @returns Mesh
 */
export function generateCylinder(
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  radiusTop: number = 1,
  radiusBottom: number = 1,
  height: number = 2,
  radialSegments: number = 32,
): Mesh {
  const positions: Vector3D[] = [];
  const normals: Vector3D[] = [];
  const uvs: Vector2D[] = [];
  const indices: number[] = [];

  const halfHeight = height / 2;

  // Generate side vertices
  for (let y = 0; y <= 1; y++) {
    const radius = y === 0 ? radiusBottom : radiusTop;
    const yy = y === 0 ? -halfHeight : halfHeight;

    for (let x = 0; x <= radialSegments; x++) {
      const u = x / radialSegments;
      const theta = u * Math.PI * 2;

      const px = radius * Math.sin(theta);
      const pz = radius * Math.cos(theta);

      positions.push({ x: px, y: yy, z: pz });

      // Normal for the side
      const slope = (radiusBottom - radiusTop) / height;
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
    indices.push(b, b + 1, a + 1);
  }

  // Top cap
  const topCenterIndex = positions.length;
  positions.push({ x: 0, y: halfHeight, z: 0 });
  normals.push({ x: 0, y: 1, z: 0 });
  uvs.push({ x: 0.5, y: 0.5 });

  for (let x = 0; x <= radialSegments; x++) {
    const theta = (x / radialSegments) * Math.PI * 2;
    positions.push({
      x: radiusTop * Math.sin(theta),
      y: halfHeight,
      z: radiusTop * Math.cos(theta),
    });
    normals.push({ x: 0, y: 1, z: 0 });
    uvs.push({
      x: Math.sin(theta) * 0.5 + 0.5,
      y: Math.cos(theta) * 0.5 + 0.5,
    });
  }

  for (let x = 0; x < radialSegments; x++) {
    indices.push(topCenterIndex, topCenterIndex + x + 1, topCenterIndex + x + 2);
  }

  // Bottom cap
  const bottomCenterIndex = positions.length;
  positions.push({ x: 0, y: -halfHeight, z: 0 });
  normals.push({ x: 0, y: -1, z: 0 });
  uvs.push({ x: 0.5, y: 0.5 });

  for (let x = 0; x <= radialSegments; x++) {
    const theta = (x / radialSegments) * Math.PI * 2;
    positions.push({
      x: radiusBottom * Math.sin(theta),
      y: -halfHeight,
      z: radiusBottom * Math.cos(theta),
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
    name: "Cylinder",
    vertices: generateVertexBufferData(positions, normals, uvs),
    indices: generateIndexBufferData(indices),
  });

  return new Mesh(device, renderPipeline, geometry);
}
