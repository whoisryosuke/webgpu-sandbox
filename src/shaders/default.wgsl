struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

struct LocalUniforms {
  color: vec4f,
  scale: vec2f,
  offset: vec2f,
};

@group(0) @binding(0) var<uniform> locals: LocalUniforms;
 

@vertex
fn vertex_main(
  @location(0) position: vec4f,
  @location(1) color: vec4f
) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.color = color * locals.color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}