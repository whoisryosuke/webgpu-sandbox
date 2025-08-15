import inputStore, { InputStoreStateKeys } from "../store/input";
import musicStore, { MusicStoreStateKeys } from "../store/music";

export type KeyboardInputMap = Record<
  KeyboardEvent["key"],
  InputStoreStateKeys
>;

export type KeyboardMusicInputMap = Record<
  KeyboardEvent["key"],
  MusicStoreStateKeys
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
  /**
   * Maps keyboard keys to input stores
   */
  musicKeyMap: KeyboardMusicInputMap;

  constructor(
    keyMap: KeyboardInputMap,
    musicKeyMap: KeyboardMusicInputMap = {}
  ) {
    // Attach events
    this.attachEvents();
    this.state = {};
    this.musicKeyMap = musicKeyMap;
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
    // Handle general keymap (like WASD nav)
    if (key in this.keyMap) {
      const inputKey = this.keyMap[key];
      inputStore.setState((prevInput) => ({
        ...prevInput,
        [inputKey]: pressed,
      }));
    }
    // Handle music keys
    if (key in this.musicKeyMap) {
      const inputKey = this.musicKeyMap[key];
      musicStore.setState((prevInput) => ({
        ...prevInput,
        [inputKey]: {
          pressed,
          // Assume keyboard keys are always max velocity
          velocity: 1,
        },
      }));
    }
  }
}
