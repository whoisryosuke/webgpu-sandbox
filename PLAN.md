# PLAN: WebGPU Library — Third-Party API & Feature Completion

## Goal
Transform `@whoisryosuke/webgpu-ts` from an internal sandbox into a usable, three.js-inspired WebGPU rendering library consumable via npm. The library should let third-party users initialize a renderer, build scenes with geometry/materials/lights, dispatch compute shaders, and render custom WGSL shaders — all through a clean public API.

---

## Current State Summary

| Module | File | Status |
|--------|------|--------|
| **Renderer** | `src/core/renderer.ts` | Core init + render loop exist. Missing: `dispose()`, `setSize()`, `setPixelRatio()`, `renderOnce()`, FPS stats, scene `add()`/`remove()`, render-on-demand |
| **Camera** | `src/core/camera.ts` | Full MVP matrices + mouse nav + debug UI. Missing: camera control modes (orbit/FPS), camera clone |
| **Geometry** | `src/core/geometry.ts` | Vertex/index buffers + default layout. Missing: attribute API, disposal, primitive generators |
| **Mesh** | `src/core/mesh.ts` | Geometry + material key + local uniforms. Missing: `translate/rotate/scale` helpers, visibility toggle, removal |
| **Material** | `src/core/material.ts` | Uniforms + textures + pipeline. Missing: built-in material types, clone, disposal, texture slot management |
| **RenderPipeline** | `src/core/render-pipeline.ts` | Creates pipeline with 4 bind group layouts. Missing: pipeline disposal, cache invalidation |
| **Texture** | `src/core/texture.ts` | Image loading + texture creation. Missing: filter/wrap config, renderer-level convenience |
| **Uniforms** | `src/core/uniforms.ts` | Generic uniform buffer + bind group. Missing: partial update, disposal |
| **Device** | `src/core/device.ts` | Adapter/device request + store sync. Missing: device limits query, device loss recovery UX |
| **ParticleSystem** | `src/core/particle-system.ts` | Compute + render particles. Missing: generic compute dispatch API |
| **Import/OBJ** | `src/core/import/obj.ts` | Full OBJ+MTL parser. Missing: GLTF loader |
| **Primitives** | `src/primitives/cube.ts` | Cube complete. Plane is broken. Missing: Sphere, Cylinder, Cone, Torus, Box2 |
| **Shaders** | `src/shaders/*.wgsl` | Default + custom + particle. Missing: compute dispatch wrapper |
| **Store** | `src/core/store/*.ts` | Simple pub/sub. OK as internal |
| **Input** | `src/core/input/*.ts` | Keyboard manager. OK as internal |
| **Audio** | `src/core/audio.ts` | Audio player with MIDI. OK as internal |
| **Exports** | `src/index.ts` | Only exports `WebGPURenderer`. Missing: all other classes, types |

---

## Phase 1: Renderer API Completeness

**File:** `src/core/renderer.ts`

### 1.1 — `dispose(): void`
- Destroy depth + MSAA textures
- Destroy all geometry buffers (vertex + index)
- Destroy all uniform buffers + bind groups
- Destroy all pipelines
- Destroy all material textures
- Unconfigure canvas context
- Cancel animation frame
- Clear meshes/materials/pipelines maps
- Remove resize observer

### 1.2 — `setSize(width: number, height: number): void`
- Update canvas width/height
- Recreate depth + MSAA textures
- Update camera screen size + projection matrix
- Used by consumer to handle responsive layouts manually

### 1.3 — `setPixelRatio(ratio: number): void`
- Multiply canvas backing store size by ratio
- Call `setSize` with adjusted dimensions

### 1.4 — `renderOnce(): void`
- Run a single frame render without starting the rAF loop
- Useful for render-on-demand (only re-render when scene changes)
- Refactor `render()` to share a `renderFrame(timestamp)` internal method

### 1.5 — `start()` / `stop()`
- `start()`: begin continuous rAF render loop (same as current `render()`)
- `stop()`: cancel the current rAF frame
- Allows user to switch between continuous and on-demand rendering

### 1.6 — Scene management: `add(mesh: Mesh)`, `remove(mesh: Mesh)`
- `add(mesh)`: push mesh to `this.meshes`, return `this` for chaining
- `remove(mesh)`: splice mesh from `this.meshes`
- Support `add()` accepting multiple meshes or an array

### 1.7 — `getMeshByName(name: string): Mesh | undefined`
- Look up mesh by geometry name
- Useful for scene graph queries

### 1.8 — FPS / render stats
- Track `frameCount`, compute rolling FPS
- Expose `getStats(): { fps: number; frameCount: number; deltaTime: number }`
- Auto-log FPS every 2 seconds (configurable)

### 1.9 — Error handling for missing WebGPU
- In `init()`: check `navigator.gpu` exists, throw descriptive error
- Add `isWebGPUSupported(): boolean` static method

---

## Phase 2: Scene Object Model

### 2.1 — Mesh transformation helpers
**File:** `src/core/mesh.ts`

Add methods that wrap `wgpu-matrix` and update uniforms:
- `translate(x, y, z)`: set position uniform
- `rotate(x, y, z)`: set rotation uniform (Euler angles in radians)
- `scale(x, y, z)`: set scale uniform
- `lookAt(target: Vector3D)`: orient mesh to face target
- `setVisible(visible: boolean)`: toggle rendering (renderer skips invisible meshes)
- `dispose()`: destroy geometry buffers + uniform buffers

### 2.2 — Geometry disposal
**File:** `src/core/geometry.ts`
- Add `dispose()` method: destroy `vertexBuffer` + `indexBuffer`
- Add `setVertices(data: Float32Array)`: update vertex buffer data
- Add `setIndices(data: Uint16Array)`: update index buffer data

### 2.3 — Material disposal
**File:** `src/core/material.ts`
- Add `dispose()`: destroy uniform buffer, bind groups, textures
- Add `clone(name: string): Material`: deep copy with new GPU resources

---

## Phase 3: Primitive Geometries

### 3.1 — Fix Plane primitive
**File:** `src/primitives/plane.ts`
- Current code is broken (calls non-existent methods on Geometry)
- Rewrite to match Cube pattern: return `Mesh` using `Geometry` + `generateVertexBufferData`

### 3.2 — New primitive generators (matching `generateCube` pattern)
Each returns a `Mesh` (or `Geometry` if no pipeline provided):

**Files:** `src/primitives/sphere.ts`, `src/primitives/cylinder.ts`, `src/primitives/cone.ts`, `src/primitives/torus.ts`

- `generateSphere(device, pipeline, radius, widthSegments, heightSegments)`
- `generateCylinder(device, pipeline, radiusTop, radiusBottom, height, radialSegments)`
- `generateCone(device, pipeline, radius, height, radialSegments)`
- `generateTorus(device, pipeline, radius, tube, radialSegments, tubularSegments)`

Each generates positions, normals, UVs, and indices procedurally.

### 3.3 — Expose primitives on Renderer
**File:** `src/core/renderer.ts`
- `createSphere(radius?, segments?, renderPipelineName?)`
- `createCylinder(radiusTop?, radiusBottom?, height?, segments?, renderPipelineName?)`
- `createCone(radius?, height?, segments?, renderPipelineName?)`
- `createTorus(radius?, tube?, radialSegments?, tubularSegments?, renderPipelineName?)`
- `createPlane(width?, height?, renderPipelineName?)`

---

## Phase 4: Lighting System

### 4.1 — Light base class + subclasses
**New files:** `src/core/lights/directional-light.ts`, `src/core/lights/point-light.ts`, `src/core/lights/spot-light.ts`, `src/core/lights/ambient-light.ts`

Each light:
- Has `uniforms: Uniforms<LightUniform>` with color, intensity, position, direction
- Has `dispose()` method
- Subclasses add type-specific properties (range, angle, penumbra for spot; etc.)

### 4.2 — Scene-level light management
**File:** `src/core/renderer.ts`
- `lights: Map<string, Light>` property
- `addLight(name: string, light: Light): void`
- `removeLight(name: string): void`
- `getLight(name: string): Light | undefined`
- In render loop: iterate lights and set their bind groups
- Add a 5th bind group layout slot for lights in `render-pipeline.ts`

### 4.3 — Default lighting
- On `init()`: create a default directional light + ambient light so scenes are lit out of the box

---

## Phase 5: Compute Shader API

### 5.1 — Generic ComputePipeline wrapper
**New file:** `src/core/compute-pipeline.ts`

```typescript
class ComputePipeline {
  pipeline: GPUComputePipeline;
  bindGroup: GPUBindGroup;
  
  constructor(device, shaderCode, bufferBindings)
  dispatch(encoder, workgroupCount)
  dispose()
}
```

### 5.2 — Renderer-level compute dispatch
**File:** `src/core/renderer.ts`
- `createComputeShader(name: string, shaderCode: string, bufferBindings: ComputeBufferBinding[]): ComputePipeline`
- `getComputePipeline(name: string): ComputePipeline`
- In `render()`: expose the `commandEncoder` to the render callback so users can dispatch compute before the render pass
- Extend `RenderProps` to include `commandEncoder: GPUCommandEncoder`

### 5.3 — Refactor ParticleSystem to use ComputePipeline
**File:** `src/core/particle-system.ts`
- Replace inline pipeline creation with `ComputePipeline` class
- Keeps existing API intact (backwards compat)

---

## Phase 6: Texture & Material Enhancements

### 6.1 — Texture options
**File:** `src/core/texture.ts`
- `createTexture(device, image, options?)`: support `GPUTextureUsage` flags, format, mipmap generation
- `createSampler(device, options?)`: support addressMode (repeat, clamp, mirror), filter modes, mipmapFilter
- `createTextureFromUrl(device, sampler, url)`: convenience — fetch image + create texture + bind group

### 6.2 — Material texture slots
**File:** `src/core/material.ts`
- Expand `MaterialTextureMap` to support: `diffuse`, `normal`, `specular`, `emissive`, `roughness`, `metallic`, `ao`
- `addTexture(device, image, sampler, type)`: create/replace texture in slot, rebuild bind group
- Update bind group layout in `render-pipeline.ts` to support multiple texture slots (up to 4 textures: bindings 1-4)

### 6.3 — Renderer texture convenience
**File:** `src/core/renderer.ts`
- `loadTexture(url: string): Promise<GPUTexture>`: fetch + create texture
- `createSampler(options?): GPUSampler`: expose sampler creation

---

## Phase 7: Render Pipeline & Shader System

### 7.1 — Pipeline disposal
**File:** `src/core/render-pipeline.ts`
- Add `dispose()` to `RenderPipelineCacheItem` (pipelines don't have dispose in WebGPU, but we clean up references)
- Add pipeline cache clearing method

### 7.2 — Shader hot-reload support
**File:** `src/core/renderer.ts`
- `updateShader(name: string, newShaderCode: string)`: recreate pipeline + update material bind groups
- Useful for development workflows

### 7.3 — Render pipeline configuration
**File:** `src/core/render-pipeline.ts`
- Extend `RenderPipelineConfig` with:
  - `cullMode?: "none" | "front" | "back"` (default `"back"`)
  - `depthWriteEnabled?: boolean`
  - `depthCompare?: GPUCompareFunction`
  - `format?: GPUTextureFormat` (fragment target format)
  - `entryPoint?: { vertex?: string; fragment?: string }` (custom entry points)

---

## Phase 8: Camera Controls

### 8.1 — Camera control modes
**File:** `src/core/camera.ts`
- Add `controlMode: "orbit" | "fps" | "pan" | "none"` property
- `orbit`: current mouse rotate/pan/zoom behavior (default)
- `fps`: WASD + mouse look (pointer lock)
- `pan`: 2D pan only
- `none`: disable all controls
- `setControlMode(mode: ControlMode): void`
- Add `setPosition(x, y, z)` convenience method
- Add `setTarget(x, y, z)` convenience method

### 8.2 — Camera cloning
- `clone(): Camera`: create new camera with same state

---

## Phase 9: Math & Utility Exports

### 9.1 — Re-export wgpu-matrix
**File:** `src/index.ts`
- Re-export `mat4`, `mat3`, `vec2`, `vec3`, `vec4`, `quat` from `wgpu-matrix` so consumers don't need a separate dependency

### 9.2 — Math utility functions
**New file:** `src/core/math/utils.ts`
- `degToRad(degrees)`, `radToDeg(radians)`
- `clamp(value, min, max)`
- `lerp(a, b, t)`
- `randomRange(min, max)`

---

## Phase 10: Public API & Exports

### 10.1 — Full barrel export
**File:** `src/index.ts`

```typescript
// Main
export { WebGPURenderer } from "./core/renderer";

// Core classes
export { default as Camera } from "./core/camera";
export { default as Geometry } from "./core/geometry";
export { default as Mesh } from "./core/mesh";
export { default as Material, MaterialUniform, MaterialFlags } from "./core/material";
export { default as Uniforms } from "./core/uniforms";
export { default as ParticleSystem } from "./core/particle-system";
export { default as ComputePipeline } from "./core/compute-pipeline";

// Lights
export { default as DirectionalLight } from "./core/lights/directional-light";
export { default as PointLight } from "./core/lights/point-light";
export { default as SpotLight } from "./core/lights/spot-light";
export { default as AmbientLight } from "./core/lights/ambient-light";

// Primitives
export { generateCube } from "./primitives/cube";
export { generateSphere } from "./primitives/sphere";
export { generateCylinder } from "./primitives/cylinder";
export { generateCone } from "./primitives/cone";
export { generateTorus } from "./primitives/torus";
export { generatePlane } from "./primitives/plane";

// Texture
export { createTexture, createTextureBindGroup, loadImage } from "./core/texture";

// Import
export { importObj, loadObj } from "./core/import/obj";

// Math re-exports
export { mat4, mat3, vec2, vec3, vec4, quat } from "wgpu-matrix";
export * as MathUtils from "./core/math/utils";

// Types
export type { RenderProps } from "./core/renderer";
export type { Vector2D, Vector3D, Vector4D } from "./core/vertex";
export type { CreateGeometryData } from "./core/geometry";
```

### 10.2 — Package.json cleanup
- Remove `"private": true`
- Update `version` to `0.1.0`
- Ensure `files` includes `dist`
- Verify `exports` map points to correct build outputs

---

## Phase 11: Quality & DX

### 11.1 — TypeScript declaration generation
- Verify `vite-plugin-dts` generates `.d.ts` for all exports
- Ensure `@webgpu/types` is a `devDependency` (not leaked to consumers)
- Run `tsc --noEmit` to verify type safety

### 11.2 — Lint & format
- Run `npm run lint` and fix all errors
- Run `npm run build` and verify dist output

### 11.3 — Example/demo page
- Update `src/main.ts` to showcase the new API (sphere, custom shader, compute, lights)

---

## Dependency Graph & Execution Order

```
Phase 1 (Renderer API) ──┐
Phase 2 (Scene Model) ──┤
Phase 3 (Primitives) ────┼──► Phase 10 (Exports) ──► Phase 11 (Quality)
Phase 4 (Lights) ────────┤
Phase 5 (Compute) ───────┤
Phase 6 (Texture) ───────┤
Phase 7 (Pipeline) ──────┤
Phase 8 (Camera) ────────┘
Phase 9 (Math) ──────────► (independent, anytime)
```

**Recommended implementation order:**
1. Phase 1 — Renderer API (foundation for everything)
2. Phase 2 — Scene Object Model (Mesh/Geometry/Material disposal + helpers)
3. Phase 3 — Primitives (Plane fix + new shapes)
4. Phase 9 — Math utilities (independent, quick win)
5. Phase 8 — Camera controls (independent)
6. Phase 5 — Compute shader API
7. Phase 7 — Pipeline config extensions
8. Phase 6 — Texture & material enhancements
9. Phase 4 — Lighting system (depends on pipeline changes)
10. Phase 10 — Public API exports
11. Phase 11 — Quality pass

---

## Key Design Principles

1. **Three.js-inspired API** — method names and patterns should feel familiar (`add`, `remove`, `translate`, `rotate`, `scale`, `lookAt`)
2. **GPU resource lifecycle** — every class that creates GPU resources must have a `dispose()` method; renderer `dispose()` cascades to all children
3. **Chainable methods** — `add()`, `remove()`, transformation helpers return `this`
4. **Backwards compatible** — existing `init()`, `render()`, `loadObj()`, `createCube()`, `createCustomShader()` signatures remain unchanged
5. **No breaking changes to WGSL shaders** — the 4 bind group layout IDs (`globals`, `locals`, `material`, `texture`) stay fixed; new bind groups append after existing indices
6. **Store stays internal** — the pub/sub store pattern is an implementation detail; consumers interact via the `WebGPURenderer` class
