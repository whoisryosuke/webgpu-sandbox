import "./style.css";
import WebGPURenderer from "./core/renderer";

async function main() {
  const renderer = new WebGPURenderer();

  await renderer.init();
}

window.addEventListener("load", main);
