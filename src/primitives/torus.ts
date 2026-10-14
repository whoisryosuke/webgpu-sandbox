import Geometry, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../core/geometry";
import { Mesh } from "../core/mesh";
import { Vector2D, Vector3D } from "../core/vertex";

/**
 * Generate a torus (donut) mesh.
 * @param device - GPU device
 * @param renderPipeline - Render pipeline to use
 * @param radius - Major radius (center of tube to center of torus)
 * @param tube - Minor radius (radius of the tube)
 * @param radialSegments - Number of segments around the tube
 * @param tubularSegments - Number of segments around the torus
 * @returns Mesh
 */
export function generateTorus(
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  radius: number = 1,
  tube: number = 0.4,
  radialSegments: number = 16,
  tubularSegments: number = 48,
): Mesh {
  const positions: Vector3D[] = [];
  const normals: Vector3D[] = [];
  const uvs: Vector2D[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= radialSegments; j++) {
    const u = (j / radialSegments) * Math.PI * 2;

    for (let i = 0; i <= tubularSegments; i++) {
      const v = (i / tubularSegments) * Math.PI * 2;

      const px = (radius + tube * Math.cos(v)) * Math.cos(u);
      const py = (radius + tube * Math.cos(v)) * Math.sin(u);
      const pz = tube * Math.sin(v);

      positions.push({ x: px, y: py, z: pz });

      // Normal
      const nx = Math.cos(v) * Math.cos(u);
      const ny = Math.cos(v) * Math.sin(u);
      const nz = Math.sin(v);
      normals.push({ x: nx, y: ny, z: nz });

      uvs.push({ x: j / radialSegments, y: i / tubularSegments });
    }
  }

  for (let j = 0; j < radialSegments; j++) {
    for (let i = 0; i < tubularSegments; i++) {
      const a = j * (tubularSegments + 1) + i;
      const b = (j + 1) * (tubularSegments + 1) + i;
      const c = (j + 1) * (tubularSegments + 1) + i + 1;
      const d = j * (tubularSegments + 1) + i + 1;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new Geometry(device, {
    name: "Torus",
    vertices: generateVertexBufferData(positions, normals, uvs),
    indices: generateIndexBufferData(indices),
  });

  return new Mesh(device, renderPipeline, geometry);
}
