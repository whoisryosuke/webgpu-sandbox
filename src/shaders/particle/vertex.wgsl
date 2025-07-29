struct Particle {
  pos : vec2<f32>,
  vel : vec2<f32>,
};

@group(0) @binding(0)
var<storage, read> particles : array<Particle>;

struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec4<f32>,
};

@vertex
fn main(@builtin(vertex_index) i : u32) -> VSOut {
  let p = particles[i];
  var out : VSOut;
  out.position = vec4<f32>(p.pos, 0.0, 1.0);
  out.color = vec4<f32>(abs(p.vel) * 100.0, 1.0, 1.0);
  return out;
}
