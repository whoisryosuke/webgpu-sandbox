struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) world_position: vec3<f32>,
  @location(1) color : vec4f,
  @location(2) normal : vec3f,
  @location(3) uv : vec2f
}

struct GlobalUniforms {
  time: f32,
}

struct LocalUniforms {
  color: vec4f,
  scale: vec3f,
  offset: vec3f,
  texture: f32,
  debug_uv: f32
};
struct CameraUniforms {
  model_matrix: mat4x4<f32>,
  view_matrix: mat4x4<f32>,
  projection_matrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var<uniform> camera: CameraUniforms;
@group(1) @binding(0) var<uniform> locals: LocalUniforms;
// @group(0) @binding(2) var<storage, read> instances : array<mat4x4<f32>>;
@group(2) @binding(0) var mySampler: sampler;
@group(2) @binding(1) var myTexture: texture_2d<f32>;
 
@vertex
fn vertex_main(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f
) -> VertexOut
{
  var output : VertexOut;

  // let instance_position = instances[instanceIndex] * vec4<f32>(position, 1.0);
  let scaled_position = position * locals.scale + locals.offset;
  let local_position = vec4<f32>(scaled_position, 1.0);
  let world_position = camera.model_matrix * local_position;

  // Use globals
  let simple_math = globals.time;
  
  let view_position = camera.view_matrix * world_position;
  output.position = camera.projection_matrix * view_position;
  
  output.world_position = world_position.xyz;
  
  output.color = vec4f(normal, 1.0);
  
  output.normal = normalize((camera.model_matrix * vec4<f32>(normal, 0.0)).xyz);
  // output.normal = normal;
  output.uv = uv;
  
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  
  let textureColor = textureSample(myTexture, mySampler, fragData.uv);

  // return vec4f(0.0,0.0,locals.texture, 1.0);

  if(locals.texture > 0.5) {
    return textureColor;
  }
  // return fragData.color;
  return vec4f(fragData.uv, 1.0, 1.0);
}