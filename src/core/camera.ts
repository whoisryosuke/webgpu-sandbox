import { Mat4, mat4, Vec3 } from "wgpu-matrix";
import { Number3DArray, Vector3D } from "./vertex";
import DebugUIInstance from "./debug-ui";

export default class Camera {
  device?: GPUDevice;
  buffer: GPUBuffer;
  screenSize = {
    width: 0,
    height: 0,
  };

  // The "eye"
  position: Vector3D = {
    x: 0,
    y: 0,
    z: 4.2,
  };
  // Camera's rotation
  rotation: Vector3D = {
    x: 0,
    y: 0.9,
    z: 0,
  };
  fov: number = Math.PI / 4;

  // Model View Projection matrices
  viewMatrix: Float32Array;
  modelMatrix: Float32Array;
  projectionMatrix: Float32Array;

  constructor(device: GPUDevice) {
    // We keep device around to update uniforms on it
    this.device = device;

    // Create the uniform buffer (3 4x4 matrices = 192 bytes, aligned to 256)
    this.buffer = device.createBuffer({
      label: "Camera Uniform buffer",
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create matrices
    this.viewMatrix = new Float32Array();
    this.updateViewMatrix();
    // Create transformation matrices using wgpu-matrix
    this.modelMatrix = mat4.identity();
    this.projectionMatrix = new Float32Array();
    this.updateProjectionMatrix();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer();

    // Debug UI
    this.debugUI();
  }

  updateScreenSize(width: number, height: number) {
    this.screenSize.width = width;
    this.screenSize.height = height;

    // Projection matrix depends on screen size
    this.updateProjectionMatrix();
  }

  updateViewMatrix() {
    // Create view matrix (camera looking at origin from distance)
    this.viewMatrix = mat4.lookAt(
      [this.position.x, this.position.y, this.position.z], // eye position
      [0, 0, 0], // target
      [0, 1, 0] // up vector
    );
  }

  updateProjectionMatrix() {
    // Create projection matrix (perspective)
    const aspect = this.screenSize.width / this.screenSize.height;
    this.projectionMatrix = mat4.perspective(
      this.fov, // fovy (45 degrees)
      aspect, // aspect ratio
      0.1, // near plane
      100.0 // far plane
    );
  }

  updateModelMatrix() {
    // Create transformation matrices using wgpu-matrix
    this.modelMatrix = mat4.identity();

    // Apply rotations in order: Z, Y, X
    mat4.rotateZ(this.modelMatrix, this.rotation.z, this.modelMatrix);
    mat4.rotateY(this.modelMatrix, this.rotation.y, this.modelMatrix);
    mat4.rotateX(this.modelMatrix, this.rotation.x, this.modelMatrix);
  }

  updateFov(fov: number) {
    this.fov = fov;

    // Update projection matrix with new FOV data
    this.updateProjectionMatrix();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer();
  }

  updatePosition(position: Vector3D) {
    this.position = position;

    // Update buffer
    this.updateViewMatrix();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer();
  }

  // Update rotation and matrices
  rotate(newRotation: Vector3D) {
    // Update rotation angles
    this.rotation.x = newRotation.x;
    this.rotation.y = newRotation.y;
    this.rotation.z = newRotation.z;
  }

  updateRotation() {
    // Update model view matrix with new rotation data
    this.updateModelMatrix();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer();
  }

  // Update rotation and matrices
  animateRotation(deltaTime: number) {
    // Update rotation angles
    this.rotation.x += deltaTime * 0.5;
    this.rotation.y += deltaTime * 0.3;
    this.rotation.z += deltaTime * 0.1;

    // Update model view matrix with new rotation data
    this.updateModelMatrix();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer();
  }

  updateUniformBuffer() {
    if (!this.device) return;
    // Create a buffer to hold all matrix data
    const uniformData = new Float32Array(48); // 3 matrices * 16 floats each

    // Copy matrices into the buffer
    uniformData.set(this.modelMatrix, 0); // offset 0
    uniformData.set(this.viewMatrix, 16); // offset 16
    uniformData.set(this.projectionMatrix, 32); // offset 32

    // Write to GPU buffer
    this.device.queue.writeBuffer(this.buffer, 0, uniformData.buffer);
  }

  debugUI() {
    // Position
    const positionHandler = (e: { value: any }) => {
      console.log("cam change", e.value);
      const newPos = e.value;
      this.updatePosition(newPos);
    };
    DebugUIInstance.add(
      "Camera",
      {
        position: {
          x: this.position.x,
          y: this.position.y,
          z: this.position.z,
        },
      },
      "position",
      {},
      positionHandler
    );

    // Rotation
    const rotationHandler = (e: { value: any }) => {
      console.log("cam change", e.value);
      const newPos = e.value;
      this.rotate(newPos);
    };
    DebugUIInstance.add(
      "Camera",
      {
        rotation: {
          x: this.rotation.x,
          y: this.rotation.y,
          z: this.rotation.z,
        },
      },
      "rotation",
      {},
      rotationHandler
    );

    // FOV
    const fovHandler = (e: { value: any }) => {
      console.log("cam change", e.value);
      const newFov = e.value;
      this.updateFov(newFov);
    };
    DebugUIInstance.slider(
      "Camera",
      {
        fov: this.fov,
      },
      "fov",
      { min: 0, max: Math.PI, step: 0.1 },
      fovHandler
    );
  }
}
