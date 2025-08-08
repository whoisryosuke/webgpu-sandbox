import Mesh from "../core/mesh";
import {
  createVertexBufferData,
  Vector2D,
  Vector3D,
  Vertex,
} from "../core/vertex";

export function generatePlane(scale: number = 1.0, scaleY: number = 1.0) {
  const positions: Vector3D[] = [
    { x: -1, y: -1, z: 0 },
    { x: 1, y: -1, z: 0 },
    { x: -1, y: 1, z: 0 },
    { x: 1, y: 1, z: 0 },
  ];

  const normals: Vector3D[] = [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0.5, z: 0.5 },
  ];

  const uvs: Vector2D[] = [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 0 },
  ];

  const indices = new Uint16Array([
    0,
    1,
    3,
    0,
    2,
    3, // front
  ]);

  console.log(`Generated cube with:
    - Vertices: ${positions.length}
    - Indices: ${indices.length}
    - Max index: ${Math.max(...indices)}`);

  const mesh = new Mesh();
  mesh.position = positions;
  mesh.indices = indices;
  mesh.normals = normals;
  mesh.uvs = uvs;

  // Convert our data to vertex buffer compatible data
  mesh.generateVertexBufferData();

  return { vertices: mesh.vertices, indices };
}
