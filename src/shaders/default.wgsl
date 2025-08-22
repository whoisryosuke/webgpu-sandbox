struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) world_position: vec3<f32>,
  @location(1) color : vec4f,
  @location(2) normal : vec3f,
  @location(3) uv : vec2f,
  @location(4) light_direction : vec3f,
  @location(5) surface_to_view : vec3f,
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
// @group(0) @binding(2) var<storage, read> instances : array<mat4x4<f32>>;
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
  let animation_circle_top = sin(globals.time / 420);
  let animation_circle_side = cos(globals.time / 420);
  
  let view_position = camera.view_matrix * world_position;
  output.position = camera.projection_matrix * view_position;
  
  output.world_position = world_position.xyz;
  
  // Lighting
  let light_position_perspective = camera.model_matrix * vec4f(globals.light_position, 1.0);
  var light_animation = vec3f(animation_circle_top, animation_circle_side, animation_circle_side);
  var light_position = light_position_perspective.xyz + light_animation;
  // Figure out where light is facing relative to the object
  output.light_direction = normalize(light_position - world_position.xyz);

  // Pass down direction of camera relative to object (used for lighting math)
  output.surface_to_view = camera.view_world_position - world_position.xyz;

  // Pass material color down to fragmennt
  output.color = material.color;
  
  output.normal = normalize((camera.model_matrix * vec4<f32>(normal, 0.0)).xyz);
  output.uv = uv;
  
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  
  let textureColor = textureSample(myTexture, mySampler, fragData.uv);

  // return vec4f(0.0,0.0,material.texture, 1.0);

  // Lighting
  // Use normal for simple lighting-based coloring
  var light_amount = max(dot(fragData.normal, fragData.light_direction), 0.3); // Minimum ambient


  // Calculate specularity
  let surface_to_view_direction = normalize(fragData.surface_to_view);
  let half_vector = normalize(fragData.light_direction + surface_to_view_direction);
  var specular_multiplier = select(0.0, material.specular / 1000.0, material.specular > 0.0);
  // We get the vector direction from the normals and our "half" angle
  var specular = dot(fragData.normal, half_vector);
  // Then we scale it by the Material's specular property (and clamp where necessary)
  specular = select(0.0, pow(specular, specular_multiplier), specular > 0.0);
  // Debug: Animated
  // specular = select(0.0, pow(specular, sin(globals.time / 420)), specular > 0.0);
  // Debug: See effect
  // specular = pow(specular, specular_multiplier);

  if(material.flags.x > 0.5) {
    return textureColor * light_amount + specular;
  }
  let uv_color_with_lighting = vec3f(abs(fragData.uv), 1.0) * light_amount + specular;
  return vec4f(uv_color_with_lighting, 1.0);
  // return fragData.color;
  // return vec4f(fragData.uv, 1.0, 1.0);
}