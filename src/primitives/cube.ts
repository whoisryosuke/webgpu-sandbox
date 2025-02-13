import { createVertexBufferData, Vertex } from "../core/vertex";

export function generateCube(scale: number) {
  const vertexData = [
    {
      position: [-scale, scale, -scale, scale],
      normals: [-0, scale, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, scale, scale],
      normals: [-0, scale, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, -scale, scale],
      normals: [-0, scale, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, scale, scale],
      normals: [-0, -0, scale, scale],
    } as Vertex,
    {
      position: [-scale, -scale, scale, scale],
      normals: [-0, -0, scale, scale],
    } as Vertex,
    {
      position: [scale, -scale, scale, scale],
      normals: [-0, -0, scale, scale],
    } as Vertex,
    {
      position: [-scale, scale, scale, scale],
      normals: [-scale, -0, -0, scale],
    } as Vertex,
    {
      position: [-scale, -scale, -scale, scale],
      normals: [-scale, -0, -0, scale],
    } as Vertex,
    {
      position: [-scale, -scale, scale, scale],
      normals: [-scale, -0, -0, scale],
    } as Vertex,
    {
      position: [scale, -scale, -scale, scale],
      normals: [-0, -scale, -0, scale],
    } as Vertex,
    {
      position: [-scale, -scale, scale, scale],
      normals: [-0, -scale, -0, scale],
    } as Vertex,
    {
      position: [-scale, -scale, -scale, scale],
      normals: [-0, -scale, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, -scale, scale],
      normals: [scale, -0, -0, scale],
    } as Vertex,
    {
      position: [scale, -scale, scale, scale],
      normals: [scale, -0, -0, scale],
    } as Vertex,
    {
      position: [scale, -scale, -scale, scale],
      normals: [scale, -0, -0, scale],
    } as Vertex,
    {
      position: [-scale, scale, -scale, scale],
      normals: [-0, -0, -scale, scale],
    } as Vertex,
    {
      position: [scale, -scale, -scale, scale],
      normals: [-0, -0, -scale, scale],
    } as Vertex,
    {
      position: [-scale, -scale, -scale, scale],
      normals: [-0, -0, -scale, scale],
    } as Vertex,
    {
      position: [-scale, scale, -scale, scale],
      normals: [-0, scale, -0, scale],
    } as Vertex,
    {
      position: [-scale, scale, scale, scale],
      normals: [-0, scale, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, scale, scale],
      normals: [-0, scale, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, scale, scale],
      normals: [-0, -0, scale, scale],
    } as Vertex,
    {
      position: [-scale, scale, scale, scale],
      normals: [-0, -0, scale, scale],
    } as Vertex,
    {
      position: [-scale, -scale, scale, scale],
      normals: [-0, -0, scale, scale],
    } as Vertex,
    {
      position: [-scale, scale, scale, scale],
      normals: [-scale, -0, -0, scale],
    } as Vertex,
    {
      position: [-scale, scale, -scale, scale],
      normals: [-scale, -0, -0, scale],
    } as Vertex,
    {
      position: [-scale, -scale, -scale, scale],
      normals: [-scale, -0, -0, scale],
    } as Vertex,
    {
      position: [scale, -scale, -scale, scale],
      normals: [-0, -scale, -0, scale],
    } as Vertex,
    {
      position: [scale, -scale, scale, scale],
      normals: [-0, -scale, -0, scale],
    } as Vertex,
    {
      position: [-scale, -scale, scale, scale],
      normals: [-0, -scale, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, -scale, scale],
      normals: [scale, -0, -0, scale],
    } as Vertex,
    {
      position: [scale, scale, scale, scale],
      normals: [scale, -0, -0, scale],
    } as Vertex,
    {
      position: [scale, -scale, scale, scale],
      normals: [scale, -0, -0, scale],
    } as Vertex,
    {
      position: [-scale, scale, -scale, scale],
      normals: [-0, -0, -scale, scale],
    } as Vertex,
    {
      position: [scale, scale, -scale, scale],
      normals: [-0, -0, -scale, scale],
    } as Vertex,
    {
      position: [scale, -scale, -scale, scale],
      normals: [-0, -0, -scale, scale],
    } as Vertex,
  ];

  const vertices = createVertexBufferData(vertexData);

  //   const indices = new Uint32Array([
  //     5, 3, 1, 3, 8, 4, 7, 6, 8, 2, 8, 6, 1, 4, 2, 5, 2, 6, 5, 7, 3, 3, 2, 7, 7,
  //     5, 6, 2, 4, 6, 1, 3, 4, 5, 1, 2,
  //   ]);

  const indices = new Uint32Array(vertexData.map((_, index) => index));

  return { vertices, indices };
}
