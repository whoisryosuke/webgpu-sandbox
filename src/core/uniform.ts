import { isObject, isArray } from "./helpers/data-types";

type UniformPrimitiveDataTypes = number | string | boolean;
/**
 * Acceptable data types for a uniform.
 * Basically array (`[0,0,1,1]`), object (`{x, y, z}`), or single value
 */
type UniformDataTypes =
  | UniformPrimitiveDataTypes[]
  | Record<string, UniformPrimitiveDataTypes>
  | UniformPrimitiveDataTypes;
type UniformsDataStructure = Record<string, UniformDataTypes>;

/**
 * Handles creating uniforms for storing data for shaders.
 * Creates a uniform buffer + bind group and offers setters for uniforms.
 */
export class Uniform<UniformObject extends UniformsDataStructure> {
  name: string;

  /**
   * The uniforms
   */
  uniforms: UniformObject;
  /**
   * Maps uniforms to their buffer alignment offset
   * Automatically generated when buffer size is calculated.
   */
  uniformsMapping!: Record<keyof UniformObject, number>;

  // GPU Specific
  uniformBuffer!: GPUBuffer;
  uniformBindGroup!: GPUBindGroup;
  /**
   * The uniform data we submit to buffer. This is where you update uniform properties.
   */
  uniformValues!: Float32Array;

  constructor(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    name: string,
    uniforms: UniformObject,
    bindGroupLayoutId: number
  ) {
    this.name = name;
    this.uniforms = uniforms;

    // Calculate buffer size and generate buffer offset mapping
    const uniformBufferSize = this.calculateUniformBufferSize();
    this.createUniformBuffer(device, uniformBufferSize);
    this.createUniformsBindGroup(device, renderPipeline, bindGroupLayoutId);
    this.setUniforms(device);
  }

  calculateUniformBufferSize() {
    // Number of bytes required for a buffer
    const requirement = 16;
    let byteOffset = 0;
    for (const key in this.uniforms) {
      const uniform = this.uniforms[key];

      // Add to uniform mapping
      this.uniformsMapping[key] = byteOffset;

      // Check the data type
      const checkObj = isObject(uniform);
      const checkArray = isArray(uniform);

      // Assume it's a shallow object with only keys + values
      // Check how many keys we have
      let size = 0;
      if (checkObj) {
        const objKeys = Object.keys(uniform);
        size = objKeys.length * 4;
      } else if (checkArray) {
        size = (uniform as Array<any>).length * 4;
      }

      // Check if property meets WebGPU requirement
      // Basically gets the remainder of current byte offset vs alignment
      // Then subtracts by alignment to get padding
      // Then final remainder to handle the `0` edge case (or first loop will add empty padding)
      const padding = (requirement - (byteOffset % requirement)) % requirement;

      // Did we need padding between the last prop?
      byteOffset += padding;
      // Add current property size
      byteOffset += size;
    }

    const padding = (requirement - (byteOffset % requirement)) % requirement;

    const finalBufferSize = byteOffset + padding;

    return finalBufferSize;
  }

  createUniformsBindGroup(
    device: GPUDevice,
    renderPipeline: GPURenderPipeline,
    bindGroupLayoutId: number
  ) {
    // Create a bind group to hold the uniforms
    this.uniformBindGroup = device.createBindGroup({
      label: `${this.name} Uniform`,
      layout: renderPipeline.getBindGroupLayout(bindGroupLayoutId),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.uniformBuffer,
          },
        },
      ],
    });
  }

  createUniformBuffer(device: GPUDevice, uniformBufferSize: number) {
    // Create a uniform buffer
    this.uniformBuffer = device.createBuffer({
      label: `${this.name} Uniform`,
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create an buffer-friendly array (aka `TypedArray`) and use the buffer size
    this.uniformValues = new Float32Array(uniformBufferSize / 4);
  }

  /**
   * Loops through each uniform and stores it in buffer friendly array.
   * Uses the uniform mapping to align properties in buffer array.
   */
  setUniforms(device: GPUDevice) {
    for (const key in this.uniforms) {
      const uniform = this.uniforms[key];

      // Check the data type
      const checkObj = isObject(uniform);
      const checkArray = isArray(uniform);

      // The final buffer data
      let data: number[] = [];

      // Depending on the data type, loop through the array elements / obj props
      // and convert the underlying values to shader-friendly floats/number.
      if (checkObj) {
        // Handle objects
        const values = Object.values(uniform);
        const parsedValues = values.map(this.convertUniformValuesToNum);
        data = [...parsedValues];
      } else if (checkArray) {
        // Handle arrays
        const parsedValues = (uniform as UniformPrimitiveDataTypes[]).map(
          this.convertUniformValuesToNum
        );
        data = [...parsedValues];
      } else if (!checkArray) {
        // Handle single values
        data = [
          this.convertUniformValuesToNum(uniform as UniformPrimitiveDataTypes),
        ];
      }

      this.uniformValues.set(data, this.uniformsMapping[key]);
    }

    this.updateUniforms(device);
  }

  /**
   * Updates buffer with new uniform data from buffer array
   */
  updateUniforms(device: GPUDevice) {
    device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformValues.buffer);
  }

  convertUniformValuesToNum = (value: UniformPrimitiveDataTypes) => {
    // Check data types
    const dataType = typeof value;
    switch (dataType) {
      // Convert boolean to 0 or 1
      case "boolean":
        return Number(value);

      // No change needed
      case "number":
        return value as number;

      // Convert strings to float numbers
      // @TODO: Maybe add an error if we detect a weird type (like function)
      case "string":
      default:
        return parseFloat(value as string);
    }
  };
}
