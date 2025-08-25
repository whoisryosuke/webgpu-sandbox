export type Number2DArray = [number, number];
export type Number3DArray = [...Number2DArray, number];
export type Number4DArray = [...Number3DArray, number];
export type Vector2D = {
  x: number;
  y: number;
};
export type Vector3D = Vector2D & {
  z: number;
};
export type Vector4D = Vector3D & {
  w: number;
};

export type Vertex = {
  position: Number3DArray;
  normals: Number3DArray;
  uv: Number2DArray;
};

/**
 * Takes our vertex type and converts to an indexed array type for GPU buffers.
 * by merging all vertex data into a single contiguous array.
 * @param vertices
 * @returns
 */
export function createVertexBufferData(vertices: Vertex[]) {
  const data = vertices.reduce((merge, vertex) => {
    return [...merge, ...vertex.position, ...vertex.normals, ...vertex.uv];
  }, [] as number[]);

  return new Float32Array(data);
}

// Setup "shape" of vertex (aka what data we're packing into each point of a mesh)
// Should match the structure of `Vertex` above
export const vertexBufferDescriptor: GPUVertexState["buffers"] = [
  {
    attributes: [
      // Position
      {
        shaderLocation: 0,
        offset: 0,
        format: "float32x3", // 4 * 3
      },
      // Normal
      {
        shaderLocation: 1,
        offset: 12,
        format: "float32x3", // 4 * 3
      },
      // UV
      {
        shaderLocation: 2,
        offset: 24,
        format: "float32x2", // 4 * 2
      },
    ],
    arrayStride: 32, // Add up all formats + padding to meet 16 multiple req.
    stepMode: "vertex",
  },
];
