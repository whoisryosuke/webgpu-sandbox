struct FragmentInput {
  @location(0) uv: vec2<f32>,
  @location(1) life: f32,
  @location(2) particleSize: f32,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  let center = input.uv - vec2<f32>(0.5);
  let dist = length(center);
  
  // Circular particle shape
  // if (dist > 0.5) {
  //   discard;
  // }
  
  // let alpha = (1.0 - dist * 2.0) * input.life;
  // let color = vec3<f32>(
  //   0.5 + input.life * 0.5,
  //   0.3 + input.particleSize * 10.0,
  //   0.8 - input.life * 0.3
  // );
  let color = vec3<f32>(input.uv,
    1.0
  );
  let alpha = 1.0;
  
  return vec4<f32>(color, alpha);
}