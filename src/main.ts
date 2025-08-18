import "./style.css";
import WebGPURenderer from "./core/renderer";
import DebugUIInstance from "./core/debug-ui";
import InputManager from "./core/input/input-manager";
import { KeyboardInputMap, KeyboardMusicInputMap } from "./core/input/keyboard";
import musicStore from "./core/store/music";

const DEFAULT_KEYBOARD_MAP: KeyboardInputMap = {
  w: "forward",
  s: "backward",
  a: "left",
  d: "right",
};

const MUSIC_KEY_MAP: KeyboardMusicInputMap = {
  // 4th octave - bottom row of keyboard
  z: "48",
  x: "50",
  c: "52",
  v: "53",
  b: "55",
  n: "57",
  m: "59",
  s: "50",
  d: "52",
  g: "56",
  h: "58",
  j: "60",

  // 5th octave - top row of keyboard
  q: "60",
  w: "62",
  e: "64",
  r: "65",
  t: "67",
  y: "69",
  u: "71",
  2: "61",
  3: "63",
  5: "66",
  6: "68",
  7: "70",
};

async function main() {
  const renderer = new WebGPURenderer();
  const input = new InputManager();

  // Setup keyboard
  input.enableKeyboard(DEFAULT_KEYBOARD_MAP, MUSIC_KEY_MAP);

  // DEBUG: Check input
  // musicStore.subscribe((store) => console.log("music store updated", store));

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
