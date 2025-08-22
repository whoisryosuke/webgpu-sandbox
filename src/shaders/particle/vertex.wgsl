struct Particle {
  pos : vec3<f32>,
  vel : vec3<f32>,
};

struct CameraUniforms {
  model_matrix: mat4x4<f32>,
  view_matrix: mat4x4<f32>,
  projection_matrix: mat4x4<f32>,
}

struct VertexInput {
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) normal: vec3f,
  @location(2) life: f32,
  @location(3) particleSize: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> camera: CameraUniforms;

@vertex
fn main(input: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  let particle = particles[instanceIndex];
  
  let instance_position = vec4<f32>(particle.pos, 1.0) + vec4<f32>(input.position, 1.0);
  let world_position = camera.model_matrix * instance_position;

  let view_position = camera.view_matrix * world_position;
  
  var output: VertexOutput;
  output.position = camera.projection_matrix * view_position; // Simple projection
  output.uv = input.uv;
  output.life = 1.0;
  output.particleSize = 1.0;
  
  return output;
}