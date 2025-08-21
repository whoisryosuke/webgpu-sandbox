import Geometry, {
  generateIndexBufferData,
  generateVertexBufferData,
} from "../core/geometry";
import { Vector2D, Vector3D } from "../core/vertex";

export function generateCube(device: GPUDevice, size: number = 1) {
  // 24 vertices total (4 vertices per face * 6 faces)
  const positions: Vector3D[] = [
    { x: -size, y: -size, z: size },
    { x: size, y: -size, z: size },
    { x: size, y: size, z: size },
    { x: -size, y: size, z: size },

    { x: -size, y: -size, z: -size },
    { x: size, y: -size, z: -size },
    { x: size, y: size, z: -size },
    { x: -size, y: size, z: -size },

    { x: -size, y: -size, z: -size },
    { x: -size, y: -size, z: size },
    { x: -size, y: size, z: size },
    { x: -size, y: size, z: -size },

    { x: size, y: -size, z: -size },
    { x: size, y: -size, z: size },
    { x: size, y: size, z: size },
    { x: size, y: size, z: -size },

    { x: -size, y: size, z: -size },
    { x: -size, y: size, z: size },
    { x: size, y: size, z: size },
    { x: size, y: size, z: -size },

    { x: -size, y: -size, z: -size },
    { x: size, y: -size, z: -size },
    { x: size, y: -size, z: size },
    { x: -size, y: -size, z: size },
  ];

  const normals: Vector3D[] = [
    // Front face (z = +size)
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: 1 },

    // Back face (z = -size)
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: -1 },

    // Left face (x = -size)
    { x: -1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },

    // Right face (x = +size)
    { x: 1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },

    // Top face (y = +size)
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 1, z: 0 },

    // Bottom face (y = -size)
    { x: 0, y: -1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: -1, z: 0 },
  ];

  const uvs: Vector2D[] = [
    // Front face (z = +size)
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },

    // Back face (z = -size)
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },

    // Left face (x = -size)
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },

    // Right face (x = +size)
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },

    // Top face (y = +size)
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },

    // Bottom face (y = -size)
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  // Indices for 12 triangles (2 per face * 6 faces)
  const indices = new Uint16Array([
    // Front face
    0, 1, 2, 2, 3, 0,
    // Back face
    4, 5, 6, 6, 7, 4,
    // Left face
    8, 9, 10, 10, 11, 8,
    // Right face
    12, 13, 14, 14, 15, 12,
    // Top face
    16, 17, 18, 18, 19, 16,
    // Bottom face
    20, 21, 22, 22, 23, 20,
  ]);

  console.log(`Generated cube with:
    - Vertices: ${positions.length}
    - Indices: ${indices.length}
    - Max index: ${Math.max(...indices)}`);

  const mesh = new Geometry(device, {
    name: "Cube",
    vertices: generateVertexBufferData(positions, normals, uvs),
    indices: indices,
    // material: obj.material,
  });

  return mesh;
}
