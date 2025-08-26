import rendererStore from "./store/renderer";

export function getDevice() {
  const store = rendererStore.getState();

  // Check if device exists and let user know otherwise
  if (!store.device) {
    throw Error(
      "[DEVICE] Failed to get device. Has it been created and added to store?"
    );
  }

  return store.device;
}

export async function requestWebGPUDevice() {
  // Setup adapter and device
  const adapter = await window.navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error(
      "[DEVICE] Couldn't create an adapter. Please check if your browser supports WebGPU."
    );
    return;
  }
  const device = await adapter.requestDevice();

  device.lost.then(() => handleLostDevice);

  // Sync device with store
  rendererStore.setState((prev) => ({ ...prev, device }));
}

function handleLostDevice() {
  console.error("[DEVICE] Lost WebGPU device. Trying to recreate...");

  requestWebGPUDevice();
}
