struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
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
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f
) -> VertexOut
{
  var output : VertexOut;
  
  // Start with a very simple transformation
  var pos = vec4f(position * 0.5, 1.0); // Scale down the cube
  
  // Simple rotation around Y axis
  var angle = locals.time * 0.001;
  var rotatedX = pos.x * cos(angle) - pos.z * sin(angle);
  var rotatedY = pos.y * cos(angle) - pos.z * sin(angle);
  var rotatedZ = pos.x * sin(angle) + pos.z * cos(angle);
  pos.x = rotatedX;
  pos.y = rotatedY;
  pos.z = rotatedZ;
  
  output.position = pos;
  
  // Color each face differently based on normal
  var color = vec3f(0.5, 0.5, 0.5); // Default gray
  
  // Check for right face (+X)
  if (normal.x > 0.9) {
    color = vec3f(1.0, 0.0, 0.0); // Red
  }
  // Check for left face (-X)  
  else if (normal.x < -0.9) {
    color = vec3f(0.0, 1.0, 1.0); // Cyan
  }
  // Check for top face (+Y)
  else if (normal.y > 0.9) {
    color = vec3f(0.0, 1.0, 0.0); // Green
  }
  // Check for bottom face (-Y)
  else if (normal.y < -0.9) {
    color = vec3f(1.0, 0.0, 1.0); // Magenta
  }
  // Check for front face (+Z)
  else if (normal.z > 0.9) {
    color = vec3f(0.0, 0.0, 1.0); // Blue
  }
  // Check for back face (-Z)
  else if (normal.z < -0.9) {
    color = vec3f(1.0, 1.0, 0.0); // Yellow
  }
  
  output.color = vec4f(color, 1.0);
  
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}