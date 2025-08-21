/**
 * When we create uniform bind groups, we need to set the group ID.
 * These IDs need to match the `@group` in WGSL shader.
 *
 * Since we don't auto-generate shaders based on uniform structure,
 * this helps keep the structure consistent.
 */
export const UNIFORM_BIND_GROUP_LAYOUT_IDS = {
  globals: 0,
  locals: 1,
  material: 2,
  texture: 3,
};
