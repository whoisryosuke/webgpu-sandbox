import KeyboardInput, { KeyboardInputMap } from "./keyboard";

export default class InputManager {
  keyboard: boolean = false;
  keyboardInstance?: KeyboardInput;
  constructor() {}

  enableKeyboard(keyMap: KeyboardInputMap) {
    this.keyboard = true;
    this.keyboardInstance = new KeyboardInput(keyMap);
  }

  removeKeyboard() {
    this.keyboard = false;
    this.keyboardInstance?.destroy();
  }
}
