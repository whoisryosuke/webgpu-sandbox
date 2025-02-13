struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f,
  @location(1) time : f32
}

struct LocalUniforms {
  color: vec4f,
  scale: vec2f,
  offset: vec2f,
  time: f32
};

@group(0) @binding(0) var<uniform> locals: LocalUniforms;
 

@vertex
fn vertex_main(
  @location(0) position: vec4f,
  @location(1) color: vec4f
) -> VertexOut
{
  var output : VertexOut;
  var newPosition = vec4f(position.xy * locals.scale, position.zw);
  // newPosition.y += sin(locals.time * 0.001);
  // newPosition.x += cos(locals.offset.y * 0.01) * 0.25;
  
  // Simple rotation
  var angle = sin(locals.time * 0.001);
  var rotatedX =
    (newPosition.x) * cos(angle) - (newPosition.y) * sin(angle);
  var rotatedY =
    (newPosition.x) * sin(angle) + (newPosition.y) * cos(angle);
  newPosition.x = rotatedX;
  newPosition.y = rotatedY;

  output.position = newPosition;
  // output.position = position;
  // output.color = color + locals.color;
  output.color = color;
  output.time = locals.time;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  // return vec4f(0,0,1.0,1.0);
  return fragData.color;
}