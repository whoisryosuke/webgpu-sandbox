import { mat3, Mat4, mat4, Vec3, quat, vec3 } from "wgpu-matrix";
import { Number3DArray, Vector2D, Vector3D } from "./vertex";
import DebugUIInstance from "./debug-ui";

const NAVIGATION_MODES = {
  // move: "Move",
  zoom: "Zoom",
  pan: "Pan",
  rotate: "Rotate",
};
type NavigationModes = keyof typeof NAVIGATION_MODES;

const MOUSE_BUTTON_MAP: Record<number, NavigationModes> = {
  // Left click
  0: "rotate",
  // Middle click
  1: "pan",
  // Right click
  2: "zoom",
};

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
  // The "up" vector (Y-up)
  up = vec3.create(0, 1, 0);
  fov: number = Math.PI / 4;
  navigating: boolean = false;
  navigationMode: NavigationModes = "pan";
  mouseInitial: Vector2D = {
    x: 0,
    y: 0,
  };
  mousePos: Vector2D = {
    x: 0,
    y: 0,
  };

  // Model View Projection matrices
  viewMatrix: Float32Array;
  modelMatrix: Float32Array;
  projectionMatrix: Float32Array;
  rotationMatrix: Float32Array;

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

    this.rotationMatrix = new Float32Array();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer();

    // Setup events
    this.handleEvents();

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

  /**
   * Create rotation matrix from Euler angles
   */
  updateRotationMatrix() {
    const rotX = mat4.rotationX(this.rotation.x);
    const rotY = mat4.rotationY(this.rotation.y);
    const rotZ = mat4.rotationZ(this.rotation.z);

    // Combine rotations (order: Y * X * Z)
    let result = mat4.multiply(rotY, rotX);
    result = mat4.multiply(result, rotZ);

    this.rotationMatrix = result;
  }

  updateFov(fov: number) {
    this.fov = fov;

    // Update projection matrix with new FOV data
    this.updateProjectionMatrix();

    // Update uniform buffer with new matrices
    this.updateUniformBuffer();
  }

  updatePosition(position?: Vector3D) {
    if (position) this.position = position;

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

    // Update rotation matrix
    this.updateRotationMatrix();
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

  handleStartMouseNav = (event: MouseEvent) => {
    // Check if mouse button has mapping - if so - start moving camera
    this.navigating = event.button in MOUSE_BUTTON_MAP;
    // Figure out movement type based on button pressed
    this.navigationMode = MOUSE_BUTTON_MAP[event.button];

    // Store initial position
    this.mouseInitial.x = event.clientX;
    this.mouseInitial.y = event.clientY;
  };

  handleEndMouseNav = (event: MouseEvent) => {
    // Check if mouse button has mapping - if so - start moving camera
    if (event.button in MOUSE_BUTTON_MAP) {
      this.navigating = false;
    }
  };

  handleMouseNavigation = (event: MouseEvent) => {
    if (!this.navigating) return;
    this.mousePos.x = event.clientX;
    this.mousePos.y = event.clientY;

    // Measure the distance of mouse movement
    const deltaX = this.mousePos.x - this.mouseInitial.x;
    const deltaY = this.mousePos.y - this.mouseInitial.y;

    switch (this.navigationMode) {
      case "rotate":
        this.handleMouseRotate(deltaX, deltaY);
        break;
      case "zoom":
        console.log("zooming");
        this.handleMouseZoom(deltaY);
        break;
      case "pan":
        console.log("panning");
        this.handleMousePan(deltaX, deltaY);
        break;
    }

    // Store initial position
    this.mouseInitial.x = event.clientX;
    this.mouseInitial.y = event.clientY;
  };

  handleMousePan(deltaX: number, deltaY: number) {
    const speed = 0.1;
    // Get the camera's right vector (local X-axis)
    const rightVector = this.getRightVector();

    // Scale the movement by speed
    const scaledDeltaX = deltaX * speed;
    const scaledDeltaY = deltaY * speed;

    // Calculate movement in world space
    const horizontalMovement = vec3.scale(rightVector, scaledDeltaX);
    const verticalMovement = vec3.scale(this.up, scaledDeltaY);

    // Apply movement to camera position
    this.position.x += horizontalMovement[0] + verticalMovement[0];
    this.position.y += horizontalMovement[1] + verticalMovement[1];
    this.position.z += horizontalMovement[2] + verticalMovement[2];

    this.updatePosition();
  }

  handleMouseMove(deltaX: number, deltaY: number) {
    this.position.x += deltaX / 100;
    this.position.y += deltaY / 100;

    this.updatePosition();
  }

  handleMouseZoom(deltaY: number) {
    this.zoom(deltaY * 0.1);
  }

  handleMouseRotate(deltaX: number, deltaY: number) {
    const rotateY = (deltaX / this.screenSize.width) * 2;
    const rotateX = (deltaY / this.screenSize.height) * 2;

    // Update rotation based on movement
    this.rotate({
      x: this.rotation.x + rotateX,
      y: this.rotation.y + rotateY,
      z: this.rotation.z,
    });
  }

  zoom(zoomAmount: number) {
    this.position.z += zoomAmount;
    this.updatePosition();
  }

  handleMouseScroll = (event: WheelEvent) => {
    console.log("scroll", event, this.position);
    this.zoom(event.deltaY / 100);
  };

  handleEvents() {
    const canvas = document.getElementById("gpu-canvas");
    if (!canvas) return;

    canvas.addEventListener("mousedown", this.handleStartMouseNav);
    canvas.addEventListener("mouseup", this.handleEndMouseNav);
    canvas.addEventListener("mousemove", this.handleMouseNavigation);
    canvas.addEventListener("wheel", this.handleMouseScroll);
  }

  /**
   * Get the camera's right vector (local X-axis)
   */
  getRightVector() {
    // Extract right vector (first column of rotation matrix)
    return vec3.normalize([
      this.rotationMatrix[0],
      this.rotationMatrix[4],
      this.rotationMatrix[8],
    ]);
  }

  /**
   * Get the camera's forward vector (local Z-axis, but negated for camera)
   */
  getForwardVector() {
    // Extract forward vector (negative third column for camera convention)
    return vec3.normalize([
      -this.rotationMatrix[2],
      -this.rotationMatrix[6],
      -this.rotationMatrix[10],
    ]);
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
