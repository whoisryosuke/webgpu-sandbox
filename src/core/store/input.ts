import Store from "./store";

// Music stuff
// This is technically a number that corresponds to MIDI index
// but Object keys are always string, so we explicitly define to help the confusion
type NoteState = {
  pressed: boolean;
  velocity: number;
};
type MIDINoteIndex = string;

export type UserInputMap = Record<MIDINoteIndex, NoteState>;
// Object.entries() version that's commonly used to iterate over it easily
export type UserInputMapEntries = [MIDINoteIndex, boolean][];

export const DEFAULT_USER_MAP = new Array(88)
  .fill(0)
  .reduce((merge, _, index) => {
    // MIDI keys go from 0 to 127
    // But pianos go up to 88 keys max, so we only care about those keys
    // Those 88 keys start at MIDI key 21, so we offset to that.
    const realIndex = index + 21;
    const newState = {
      pressed: false,
      velocity: 0,
    } as NoteState;
    merge[realIndex] = newState;
    return merge;
  }, {} as UserInputMap);

export type InputStoreState = UserInputMap & {
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

  ...DEFAULT_USER_MAP,
});

export default inputStore;
