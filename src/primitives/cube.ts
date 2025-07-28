import { createVertexBufferData, Vertex } from "../core/vertex";

export function generateCube(size: number) {
  // Each vertex has: position (3), normal (3), UV (2) = 8 floats per vertex
  // 24 vertices total (4 vertices per face * 6 faces)
  const vertices = new Float32Array([
    // Front face (z = +size)
    -size,
    -size,
    size,
    0,
    0,
    1,
    0,
    0, // bottom-left
    size,
    -size,
    size,
    0,
    0,
    1,
    1,
    0, // bottom-right
    size,
    size,
    size,
    0,
    0,
    1,
    1,
    1, // top-right
    -size,
    size,
    size,
    0,
    0,
    1,
    0,
    1, // top-left

    // Back face (z = -size)
    size,
    -size,
    -size,
    0,
    0,
    -1,
    0,
    0, // bottom-left
    -size,
    -size,
    -size,
    0,
    0,
    -1,
    1,
    0, // bottom-right
    -size,
    size,
    -size,
    0,
    0,
    -1,
    1,
    1, // top-right
    size,
    size,
    -size,
    0,
    0,
    -1,
    0,
    1, // top-left

    // Left face (x = -size)
    -size,
    -size,
    -size,
    -1,
    0,
    0,
    0,
    0, // bottom-left
    -size,
    -size,
    size,
    -1,
    0,
    0,
    1,
    0, // bottom-right
    -size,
    size,
    size,
    -1,
    0,
    0,
    1,
    1, // top-right
    -size,
    size,
    -size,
    -1,
    0,
    0,
    0,
    1, // top-left

    // Right face (x = +size)
    size,
    -size,
    size,
    1,
    0,
    0,
    0,
    0, // bottom-left
    size,
    -size,
    -size,
    1,
    0,
    0,
    1,
    0, // bottom-right
    size,
    size,
    -size,
    1,
    0,
    0,
    1,
    1, // top-right
    size,
    size,
    size,
    1,
    0,
    0,
    0,
    1, // top-left

    // Top face (y = +size)
    -size,
    size,
    size,
    0,
    1,
    0,
    0,
    0, // bottom-left
    size,
    size,
    size,
    0,
    1,
    0,
    1,
    0, // bottom-right
    size,
    size,
    -size,
    0,
    1,
    0,
    1,
    1, // top-right
    -size,
    size,
    -size,
    0,
    1,
    0,
    0,
    1, // top-left

    // Bottom face (y = -size)
    -size,
    -size,
    -size,
    0,
    -1,
    0,
    0,
    0, // bottom-left
    size,
    -size,
    -size,
    0,
    -1,
    0,
    1,
    0, // bottom-right
    size,
    -size,
    size,
    0,
    -1,
    0,
    1,
    1, // top-right
    -size,
    -size,
    size,
    0,
    -1,
    0,
    0,
    1, // top-left
  ]);

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
    - Vertices: ${vertices.length / 8} (${vertices.length} floats)
    - Indices: ${indices.length}
    - Max index: ${Math.max(...indices)}
    - Vertex stride: 8 floats (32 bytes)`);

  return { vertices, indices };
}
