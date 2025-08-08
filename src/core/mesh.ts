import { Vector2D, Vector3D } from "./vertex";

export default class Mesh {
  name: string;

  /**
   * Represents the vertex data for vertex buffer
   * It contains all the mesh data, like position, normals, etc
   * Each vertex has: position (3), normal (3), UV (2) = 8 floats per vertex
   */
  vertices: Float32Array;
  indices: Uint16Array;

  position: Vector3D[];
  normals: Vector3D[];
  uvs: Vector2D[];
  //   materials: Material[];

  constructor() {
    this.name = "Mesh";
    this.vertices = new Float32Array();
    this.indices = new Uint16Array();
    this.position = [];
    this.normals = [];
    this.uvs = [];
  }

  generateVertexBufferData() {
    let newVertices: number[] = [];
    this.position.forEach((position, index) => {
      const normal = this.normals[index];
      const uv = this.uvs[index];
      const newVertex = [
        position.x,
        position.y,
        position.z,
        normal.x,
        normal.y,
        normal.z,
        uv.x,
        uv.y,
      ];
      newVertices.push(...newVertex);
    });

    this.vertices = new Float32Array(newVertices);
  }

  setIndices(newIndices: Uint16Array) {
    this.indices = newIndices;
  }
}
