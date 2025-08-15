import inputStore, { InputStoreStateKeys } from "../store/input";

export type KeyboardInputMap = Record<
  KeyboardEvent["key"],
  InputStoreStateKeys
>;

export default class KeyboardInput {
  /**
   * Keep track of keyboard pressed/released state to know when keys are held down
   */
  state: Record<KeyboardEvent["key"], boolean>;
  /**
   * Maps keyboard keys to input stores
   */
  keyMap: KeyboardInputMap;

  constructor(keyMap: KeyboardInputMap) {
    // Attach events
    this.attachEvents();
    this.state = {};
    this.keyMap = keyMap;
  }

  destroy() {
    // Remove events
    this.removeEvents();
  }

  attachEvents() {
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
  }

  removeEvents() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    console.log("key pressed", e.key, e);
    this.state[e.key] = true;
    this.handleKeyPress(e.key, true);
  };
  handleKeyUp = (e: KeyboardEvent) => {
    console.log("key released", e.key, e);
    this.state[e.key] = false;
    this.handleKeyPress(e.key, false);
  };

  handleKeyPress(key: KeyboardEvent["key"], pressed: boolean) {
    if (!(key in this.keyMap)) return;

    const inputKey = this.keyMap[key];
    inputStore.setState((prevInput) => ({
      ...prevInput,
      [inputKey]: pressed,
    }));
  }
}
