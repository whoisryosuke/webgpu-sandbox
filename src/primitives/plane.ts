import Geometry, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../core/geometry";
import { Mesh } from "../core/mesh";
import { Vector2D, Vector3D } from "../core/vertex";

/**
 * Generate a plane mesh.
 * @param device - GPU device
 * @param renderPipeline - Render pipeline to use
 * @param width - Plane width
 * @param height - Plane height
 * @returns Mesh
 */
export function generatePlane(
  device: GPUDevice,
  renderPipeline: GPURenderPipeline,
  width: number = 1,
  height: number = 1,
): Mesh {
  const positions: Vector3D[] = [
    { x: -width, y: -height, z: 0 },
    { x: width, y: -height, z: 0 },
    { x: -width, y: height, z: 0 },
    { x: width, y: height, z: 0 },
  ];

  const normals: Vector3D[] = [
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: 1 },
  ];

  const uvs: Vector2D[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];

  const indices = [0, 1, 3, 0, 3, 2];

  const geometry = new Geometry(device, {
    name: "Plane",
    vertices: generateVertexBufferData(positions, normals, uvs),
    indices: generateIndexBufferData(indices),
  });

  return new Mesh(device, renderPipeline, geometry);
}
