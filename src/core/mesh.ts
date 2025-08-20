import Material from "./material";
import { Vector2D, Vector3D } from "./vertex";

export function generateVertexBufferData(
  positions: Vector3D[],
  normals: Vector3D[],
  uvs: Vector2D[]
) {
  let newVertices: number[] = [];
  positions.forEach((position, index) => {
    const normal = normals[index];
    const uv = uvs[index];
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
  return new Float32Array(newVertices);
}

export function generateIndexBufferData(meshIndices: number[]) {
  // Because we use Uint16 each row needs to be 4 bytes
  // 1 number x 2 bytes = 2 bytes per element
  // So we pad when necessary
  // Basically make sure this is an even number
  const paddedSize = Math.ceil(meshIndices.length / 2) * 2;
  const meshIndicesTypedArray = new Uint16Array(paddedSize);
  meshIndicesTypedArray.set(meshIndices);

  return meshIndicesTypedArray;
}

export default class Mesh {
  name: string;

  /**
   * Represents the vertex data for vertex buffer
   * It contains all the mesh data, like position, normals, etc
   * Each vertex has: position (3), normal (3), UV (2) = 8 floats per vertex
   */
  vertices: Float32Array;
  indices: Uint16Array;
  /**
   * A key that maps to a global cache with all loaded mats
   */
  material: string;

  // Buffers
  vertexBuffer!: GPUBuffer;
  indexBuffer!: GPUBuffer;

  constructor(
    device: GPUDevice,
    data: {
      vertices: Float32Array;
      indices: Uint16Array;
      /**
       * A key that maps to a global cache with all loaded mats.
       * The mesh only holds a reference to the materials which live elsewhere
       */
      material?: string;
      name?: string;
    }
  ) {
    this.name = data.name ?? "Mesh";
    this.vertices = data.vertices;
    this.indices = data.indices;
    this.material = data.material ?? "Default";

    this.createBuffers(device);
  }

  createBuffers(device: GPUDevice) {
    this.vertexBuffer = device.createBuffer({
      label: "Vertex buffer",
      size: this.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.vertexBuffer, 0, this.vertices.buffer);

    this.indexBuffer = device.createBuffer({
      label: "Index buffer",
      size: this.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.indexBuffer, 0, this.indices.buffer);
  }
}
