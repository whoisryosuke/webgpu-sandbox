import { createVertexBufferData, Vertex } from "../core/vertex";

export function generatePlane(scale: number = 1.0, scaleY: number = 1.0) {
  const vertexData = [
    {
      position: [-scale, -scale, 0.0, 1.0],
      normals: [1, 0, 0, 1],
    } as Vertex,
    {
      position: [scale, -scale, 0.0, 1.0],
      normals: [0, 1, 0, 1],
    } as Vertex,
    {
      position: [-scale, scale, 0.0, 1.0],
      normals: [0, 0, 1, 1],
    } as Vertex,
    {
      position: [scale, scale, 0.0, 1.0],
      normals: [0, 0.5, 0.5, 1],
    } as Vertex,
  ];

  const vertices = createVertexBufferData(vertexData);

  const indices = new Uint32Array([
    0,
    1,
    3,
    0,
    2,
    3, // front
  ]);
  return { vertices, indices };
}
