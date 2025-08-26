struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) world_position: vec3<f32>,
  @location(1) color : vec4f,
  @location(2) normal : vec3f,
  @location(3) uv : vec2f,
  @location(4) time : f32,
}

struct GlobalUniforms {
  time: f32,
  light_position: vec3<f32>,
}

struct LocalUniforms {
  position: vec3f,
  rotation: vec3f,
  scale: vec3f,
}

struct MaterialUniforms {
  color: vec4f,
  specular: f32,
  flags: vec4f,
};
struct CameraUniforms {
  model_matrix: mat4x4<f32>,
  view_matrix: mat4x4<f32>,
  projection_matrix: mat4x4<f32>,
  // The camera "eye" aka it's position in 3D
  view_world_position: vec3f,
}

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var<uniform> camera: CameraUniforms;
@group(1) @binding(0) var<uniform> locals: LocalUniforms;
@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(3) @binding(0) var mySampler: sampler;
@group(3) @binding(1) var myTexture: texture_2d<f32>;
 
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

  let scaled_position = position * locals.scale + locals.position;
  let local_position = vec4<f32>(scaled_position, 1.0);
  let world_position = camera.model_matrix * local_position;

  // Use globals
  let simple_math = globals.time;
    let position_offset = sin(globals.time / 420) * 2;


  let view_position = camera.view_matrix * world_position;
  output.position = camera.projection_matrix * view_position + position_offset;
  
  output.world_position = world_position.xyz;

  // Pass material color down to fragment
  output.color = material.color;
  output.normal = normalize((camera.model_matrix * vec4<f32>(normal, 0.0)).xyz);
  output.uv = uv;
  output.time = globals.time;
  
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  
  let textureColor = textureSample(myTexture, mySampler, fragData.uv);

  let animated_color = vec2f(sin(fragData.time / 420), cos(fragData.time / 420));

  return vec4f(fragData.uv * fragData.normal.xy + animated_color, 1.0, 1.0);
}