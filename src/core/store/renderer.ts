import Store from "./store";

export type RendererStoreState = {
  device: GPUDevice | null;
};

export type RendererStoreStateKeys = keyof RendererStoreState;

// Create an instance of the store. This is what other modules will import.
const rendererStore = new Store<RendererStoreState>({
  device: null,
});

export default rendererStore;
