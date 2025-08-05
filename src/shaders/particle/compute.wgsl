struct Particle {
  pos : vec3<f32>,
  vel : vec3<f32>,
};

// @group(0) @binding(0)
// var<storage, read_write> particles : array<Particle>;
@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(2) var<storage, read> waveform : array<f32, 1024>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id : vec3<u32>) {
  let i = id.x;
  if (i >= arrayLength(&particles)) { return; }

  var p = particles[i];

  let waveform_index = i % 512;
  p.vel.z += waveform[waveform_index] * 0.1;

  // Simple gravity
  let gravity = vec3<f32>(0.0, 0, -0.0005);
  p.vel += gravity;
  p.pos += p.vel;

  // Bounce off edges
  if (p.pos.z < -1.0) {
    p.pos.z = -1.0;
    p.vel.z *= -0.8;
  }

  particles[i] = p;
}