import { Mat4, mat4, Vec3 } from "wgpu-matrix";
import { Number3DArray } from "./vertex";
import DebugUIInstance from "./debug-ui";

export default class Camera {
  buffer: GPUBuffer;
  rotation = {
    x: 0,
    y: 0,
    z: 0,
  };
  screenSize = {
    width: 0,
    height: 0,
  };

  // The "eye"
  position: Number3DArray;
  viewMatrix: Float32Array;
  modelMatrix: Float32Array;
  projectionMatrix: Float32Array;

  constructor(device: GPUDevice) {
    // Create the uniform buffer (3 4x4 matrices = 192 bytes, aligned to 256)
    this.buffer = device.createBuffer({
      label: "Camera Uniform buffer",
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.position = [0, 0, 5];
    this.viewMatrix = new Float32Array();
    // Create transformation matrices using wgpu-matrix
    this.modelMatrix = mat4.identity();
    this.projectionMatrix = new Float32Array();
  }

  updateScreenSize(width: number, height: number) {
    this.screenSize.width = width;
    this.screenSize.height = height;
  }

  updateViewMatrix() {
    // Create view matrix (camera looking at origin from distance)
    this.viewMatrix = mat4.lookAt(
      this.position, // eye position
      [0, 0, 0], // target
      [0, 1, 0] // up vector
    );
  }

  updateProjectionMatrix() {
    // Create projection matrix (perspective)
    const aspect = this.screenSize.width / this.screenSize.height;
    this.projectionMatrix = mat4.perspective(
      Math.PI / 4, // fovy (45 degrees)
      aspect, // aspect ratio
      0.1, // near plane
      100.0 // far plane
    );
  }

  updatePosition(position: Number3DArray) {
    this.position = position;

    // Update buffer
  }

  updateModelMatrix() {
    // Create transformation matrices using wgpu-matrix
    this.modelMatrix = mat4.identity();

    // Apply rotations in order: Z, Y, X
    mat4.rotateZ(this.modelMatrix, this.rotation.z, this.modelMatrix);
    mat4.rotateY(this.modelMatrix, this.rotation.y, this.modelMatrix);
    mat4.rotateX(this.modelMatrix, this.rotation.x, this.modelMatrix);
  }

  // Update rotation and matrices
  updateRotation(deltaTime: number, device: GPUDevice) {
    // Update rotation angles
    this.rotation.x += deltaTime * 0.5;
    this.rotation.y += deltaTime * 0.3;
    this.rotation.z += deltaTime * 0.1;

    // Update model view matrix with new rotation data
    this.updateModelMatrix();

    // Update view matrix
    this.updateViewMatrix();

    this.updateProjectionMatrix();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer(
      device,
      this.modelMatrix,
      this.viewMatrix,
      this.projectionMatrix
    );
  }

  updateUniformBuffer(
    device: GPUDevice,
    model: Mat4,
    view: Mat4,
    projection: Mat4
  ) {
    // Create a buffer to hold all matrix data
    const uniformData = new Float32Array(48); // 3 matrices * 16 floats each

    // Copy matrices into the buffer
    uniformData.set(model, 0); // offset 0
    uniformData.set(view, 16); // offset 16
    uniformData.set(projection, 32); // offset 32

    // Write to GPU buffer
    device.queue.writeBuffer(this.buffer, 0, uniformData.buffer);
  }
}
