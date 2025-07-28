export type Number2DArray = [number, number];
export type Number3DArray = [...Number2DArray, number];
export type Number4DArray = [...Number3DArray, number];

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
