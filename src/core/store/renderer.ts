import Store from "./store";

export type RendererStoreState = {
  device: GPUDevice | null;
  renderPipelines: Map<string, GPURenderPipeline>;
};

export type RendererStoreStateKeys = keyof RendererStoreState;

// Create an instance of the store. This is what other modules will import.
const rendererStore = new Store<RendererStoreState>({
  device: null,
  renderPipelines: new Map(),
});

export default rendererStore;
