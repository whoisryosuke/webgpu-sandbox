import { Mat4, mat4 } from "wgpu-matrix";

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

  constructor(device: GPUDevice) {
    // Create the uniform buffer (3 4x4 matrices = 192 bytes, aligned to 256)
    this.buffer = device.createBuffer({
      label: "Camera Uniform buffer",
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  updateScreenSize(width: number, height: number) {
    this.screenSize.width = width;
    this.screenSize.height = height;
  }

  // Update rotation and matrices
  updateRotation(deltaTime: number, device: GPUDevice) {
    // Update rotation angles
    this.rotation.x += deltaTime * 0.5;
    this.rotation.y += deltaTime * 0.3;
    this.rotation.z += deltaTime * 0.1;

    // Create transformation matrices using wgpu-matrix
    const modelMatrix = mat4.identity();

    // Apply rotations in order: Z, Y, X
    mat4.rotateZ(modelMatrix, this.rotation.z, modelMatrix);
    mat4.rotateY(modelMatrix, this.rotation.y, modelMatrix);
    mat4.rotateX(modelMatrix, this.rotation.x, modelMatrix);

    // Create view matrix (camera looking at origin from distance)
    const viewMatrix = mat4.lookAt(
      [0, 0, 5], // eye position
      [0, 0, 0], // target
      [0, 1, 0] // up vector
    );

    // Create projection matrix (perspective)
    const aspect = this.screenSize.width / this.screenSize.height;
    const projectionMatrix = mat4.perspective(
      Math.PI / 4, // fovy (45 degrees)
      aspect, // aspect ratio
      0.1, // near plane
      100.0 // far plane
    );

    // Update uniform buffer with new matrices
    this.updateUniformBuffer(device, modelMatrix, viewMatrix, projectionMatrix);
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
