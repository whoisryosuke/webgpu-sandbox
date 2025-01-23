# WebGPU JS Sandbox

This is a place to prototype using **[WebGPU](https://www.w3.org/TR/webgpu/)** on the web. It uses **JavaScript** (compiled from **Typescript**) to create a WebGPU context in a `<canvas>` element and `.wgsl` shaders.

## Getting Started

1. Clone repo
1. `yarn`
1. `yarn dev`
1. Open up http://localhost:5173/

## How it works

This is a standard WebGPU setup on the web, mostly inspired by tutorials and [MDN examples](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API).

The WebGPU renderer code lives in `src/main.ts` and runs when page loads. That script is imported into the `index.html`, which contains our `<canvas>`.

The renderer looks for a `<canvas>` element with the ID `#gpu-canvas` to create the context, or it creates a new canvas inside the `#app` element (usually the root `<div>` on the page).

### Shaders

We use `.wgsl` files for shaders. If you're using VSCode, you can get the WGSL extension to enable syntax highlighting.

> Keep in mind however that this extension **doesn't lint or validate** your WGSL code, so you may incorrectly format something without realizing.

## Credits

- [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [WebGPU for Metal Developers, Part One](https://metalbyexample.com/webgpu-part-one/)
- [Basic WebGPU Rendering](https://dev.to/ndesmic/basic-webgpu-rendering-2kob)
- [Online WGSL Editor](https://takahirox.github.io/online-wgsl-editor/index.html) - _[Source](https://github.com/takahirox/online-wgsl-editor/)_
