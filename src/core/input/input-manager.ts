import KeyboardInput, {
  KeyboardInputMap,
  KeyboardMusicInputMap,
} from "./keyboard";

export default class InputManager {
  keyboard: boolean = false;
  keyboardInstance?: KeyboardInput;
  constructor() {}

  enableKeyboard(
    keyMap: KeyboardInputMap,
    musicKeyMap?: KeyboardMusicInputMap
  ) {
    this.keyboard = true;
    this.keyboardInstance = new KeyboardInput(keyMap, musicKeyMap);
  }

  removeKeyboard() {
    this.keyboard = false;
    this.keyboardInstance?.destroy();
  }
}
