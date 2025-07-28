struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) world_position: vec3<f32>,
  @location(1) color : vec4f,
  @location(2) normal : vec3f,
  @location(3) uv : vec2f
}

struct LocalUniforms {
  color: vec4f,
  scale: vec2f,
  offset: vec2f,
  time: f32
};
struct CameraUniforms {
  model_matrix: mat4x4<f32>,
  view_matrix: mat4x4<f32>,
  projection_matrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> locals: LocalUniforms;
@group(0) @binding(1) var<uniform> camera: CameraUniforms;
@group(0) @binding(2) var<storage, read> instances : array<mat4x4<f32>>;
 
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

  
  
  // Apply scaling (keep Z coordinate)
  // pos.x *= locals.scale.x;
  // pos.y *= locals.scale.y;
  

  // Transform position through model, view, and projection matrices
  // let transformedPosition = instances[0] * vec4<f32>(position, 1.0); // Apply instance matrix
  // let world_position = camera.model_matrix * transformedPosition;

  let instance_position = instances[instanceIndex] * vec4<f32>(position, 1.0);
  let world_position = camera.model_matrix * instance_position;


  // let world_position = camera.model_matrix * vec4<f32>(position, 1.0);
  
  let view_position = camera.view_matrix * world_position;
  output.position = camera.projection_matrix * view_position;
  
  output.world_position = world_position.xyz;
  
  // Use normal for simple lighting-based coloring
  // var lightDir = normalize(vec3f(1.0, 1.0, 1.0));
  // var lightAmount = max(dot(normal, lightDir), 0.3); // Minimum ambient
  // output.color = vec4f(abs(normal) * lightAmount, 1.0);
  // output.color = vec4f(uv, 1.0, 1.0) * vec4f(normal, 1.0);
  output.color = vec4f(uv, 1.0, 1.0);
  
  output.normal = normal;
  output.uv = uv;
  
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}