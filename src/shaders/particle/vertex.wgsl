struct Particle {
  pos : vec3<f32>,
  vel : vec3<f32>,
};

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) uv: vec2<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) life: f32,
  @location(2) particleSize: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;

@vertex
fn main(input: VertexInput, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  let particle = particles[instanceIndex];
  
  // Billboard the quad to face the camera
  let worldPos = particle.pos + vec3<f32>(input.position * 0.5, 0.0);
  
  var output: VertexOutput;
  output.position = vec4<f32>(worldPos * 0.1, 1.0); // Simple projection
  output.uv = input.uv;
  output.life = 1.0;
  output.particleSize = 1.0;
  
  return output;
}