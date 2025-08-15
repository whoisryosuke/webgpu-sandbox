import "./style.css";
import WebGPURenderer from "./core/renderer";
import DebugUIInstance from "./core/debug-ui";
import InputManager from "./core/input/input-manager";
import { KeyboardInputMap } from "./core/input/keyboard";

const DEFAULT_KEYBOARD_MAP: KeyboardInputMap = {
  w: "forward",
  s: "backward",
  a: "left",
  d: "right",
};

async function main() {
  const renderer = new WebGPURenderer();
  const input = new InputManager();

  // Setup keyboard
  input.enableKeyboard(DEFAULT_KEYBOARD_MAP);

  const test = {
    x: 0,
    y: 0,
  };
  DebugUIInstance.createSection("Test");
  DebugUIInstance.slider("Test", test, "x", {
    min: 0,
    max: 100,
    step: 1,
  });

  await renderer.init();
}

window.addEventListener("load", main);
