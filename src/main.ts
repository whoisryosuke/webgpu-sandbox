import "./style.css";
import WebGPURenderer, { RenderProps } from "./core/renderer";
import DebugUIInstance from "./core/debug-ui";
import InputManager from "./core/input/input-manager";
import { KeyboardInputMap } from "./core/input/keyboard";

const DEFAULT_KEYBOARD_MAP: KeyboardInputMap = {
  w: "forward",
  s: "backward",
  a: "left",
  d: "right",
};

function showError(message: string) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;top:16px;left:16px;z-index:10;max-width:480px;" +
    "background:#7f1d1d;color:#fff;padding:12px 16px;border-radius:8px;" +
    "font-family:system-ui,sans-serif;font-size:14px;";
  el.textContent = message;
  document.body.appendChild(el);
}

function createStatsOverlay(): HTMLElement {
  const el = document.createElement("div");
  el.id = "stats-overlay";
  el.style.cssText =
    "position:fixed;bottom:16px;left:16px;z-index:10;" +
    "background:rgba(0,0,0,0.6);color:#fff;padding:8px 12px;border-radius:8px;" +
    "font-family:monospace;font-size:12px;";
  el.textContent = "fps: --";
  document.body.appendChild(el);
  return el;
}

async function main() {
  // 1. Check browser support before doing anything else.
  if (!WebGPURenderer.isWebGPUSupported()) {
    showError(
      "WebGPU is not supported in this browser. Use Chrome 113+, Edge 113+, Firefox 141+, or Safari 26+.",
    );
    return;
  }

  const renderer = new WebGPURenderer();

  // 2. WASD moves the camera (the Camera subscribes to the input store).
  const input = new InputManager();
  input.enableKeyboard(DEFAULT_KEYBOARD_MAP);

  try {
    await renderer.init();
  } catch (err) {
    showError(
      `Failed to initialize WebGPU: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }

  // Camera itself handles mouse orbit/pan/zoom once created; subscribe
  // keyboard input now that the camera exists.
  renderer.camera.subscribeToInput();

  // 3. Build a small scene out of built-in primitives.
  // Each `create*` call appends a Mesh to `renderer.meshes`.
  renderer.createCube(0.5);
  renderer.createSphere(0.5, 32, 16);
  renderer.createTorus(0.5, 0.2, 16, 48);

  const [cube, sphere, torus] = renderer.meshes;
  cube.translate(-1.8, 0, 0);
  sphere.translate(0, 0, 0);
  torus.translate(1.8, 0, 0);

  // Debug UI hook: live-tweak the sphere's scale.
  const sphereControls = { scale: 1 };
  DebugUIInstance.createSection("Sphere");
  DebugUIInstance.slider("Sphere", sphereControls, "scale", {
    min: 0.1,
    max: 2,
    step: 0.05,
  });

  // 4. Animate with the per-frame callback. Mutate uniforms here;
  // the renderer draws everything after the callback returns.
  // NOTE: the default shader applies position + scale (rotation is stored
  // but not yet consumed by `default.wgsl`), so animate those two.
  const renderCallback = (props: RenderProps) => {
    const t = props.timestamp * 0.001;

    cube.translate(-1.8, Math.sin(t) * 0.5, 0);

    const s = sphereControls.scale * (1 + Math.sin(t * 2) * 0.1);
    sphere.scale(s, s, s);

    torus.translate(1.8, Math.cos(t) * 0.5, 0);
  };

  // 5. FPS overlay via the renderer's built-in stats.
  const statsEl = createStatsOverlay();
  setInterval(() => {
    const stats = renderer.getStats();
    statsEl.textContent = `fps: ${stats.fps} | frames: ${stats.frameCount}`;
  }, 500);

  // 6. Start the render loop.
  renderer.render(renderCallback);

  // 7. Clean up GPU resources when the page goes away.
  window.addEventListener("pagehide", () => renderer.dispose());
}

window.addEventListener("load", main);
