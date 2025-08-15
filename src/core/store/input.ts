import Store from "./store";

export type InputStoreState = {
  // Camera Movement (WASD, gamepad, etc)
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
};

export type InputStoreStateKeys = keyof InputStoreState;

// Create an instance of the store. This is what other modules will import.
const inputStore = new Store<InputStoreState>({
  forward: false,
  backward: false,
  left: false,
  right: false,
});

export default inputStore;
