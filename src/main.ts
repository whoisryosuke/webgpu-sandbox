import "./style.css";
import WebGPURenderer from "./core/renderer";
import DebugUIInstance from "./core/debug-ui";

async function main() {
  const renderer = new WebGPURenderer();

  const test = {
    x: 0,
    y: 0,
  };
  DebugUIInstance.createSection("Test");
  DebugUIInstance.addSlider("Test", test, "x", {
    min: 0,
    max: 100,
    step: 1,
  });

  await renderer.init();
}

window.addEventListener("load", main);
