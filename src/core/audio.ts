import { BaseNote, NOTES_ALL_IN_ORDER } from "./constants/audio";
import DebugUIInstance from "./debug-ui";
import { Midi } from "tonal";
import musicStore, { DEFAULT_USER_MAP, UserInputMap } from "./store/music";

export default class AudioPlayer {
  context?: AudioContext;
  audio?: AudioBufferSourceNode;
  buffer?: AudioBuffer;
  analyser?: AnalyserNode;
  frequencyData?: Float32Array<ArrayBuffer>;
  waveformData?: Float32Array<ArrayBuffer>;
  loaded: boolean = false;
  playing: boolean = false;

  /**
   * Local MIDI State
   * Used to check if a new key is pressed or held
   */
  input: UserInputMap = DEFAULT_USER_MAP;

  constructor() {
    this.handleEvents();
    this.debugUI();
    this.subscribeToMusic();
  }

  createAnalyser() {
    if (!this.context) return;
    this.analyser = this.context.createAnalyser();

    // Configure analyser
    this.analyser.fftSize = 1024;
    this.frequencyData = new Float32Array(this.analyser.fftSize);
    this.waveformData = new Float32Array(this.analyser.frequencyBinCount);

    console.log("data array", this.waveformData, this.waveformData.byteLength);
  }

  async loadSample(file: string) {
    if (!this.context) {
      this.context = new window.AudioContext();
    }

    // Load data into a generic buffer
    const response = await fetch(file);
    const arrayBuffer = await response.arrayBuffer();

    console.log("sample loaded", file, response.status, this.context);

    // Use context to decode into an audio buffer
    const newAudioBuffer = await this.context.decodeAudioData(arrayBuffer);
    console.log("newAudioBuffer", newAudioBuffer);

    this.buffer = newAudioBuffer;
    this.loaded = true;
  }

  handleEvents() {
    // const canvas = document.getElementById("gpu-canvas");
    // if (canvas) canvas.addEventListener("click", this.play);
  }

  /**
   * Subscribes this class to music input store
   * Enables MIDI device playback
   */
  subscribeToMusic() {
    musicStore.subscribe(this.handleMidiInput);
  }

  /**
   * Handle the MIDI input from store and play new notes
   */
  handleMidiInput = (state: UserInputMap) => {
    // console.log("[AUDIO] Handle MIDI input");

    // We filter by only pressed keys so we don't loop over 88+ keys each press
    const pressedKeys = Object.entries(state).filter(
      ([_, keyState]) => keyState.pressed
    );
    pressedKeys.forEach(([key, keyState]) => {
      // console.log("[AUDIO] key pressed", key, keyState, this.input[key]);
      // Doesn't exist? Just add it
      if (!(key in this.input)) {
        this.input[key] = keyState;
      }
      // Play when key is pressed initially
      if (this.input[key].pressed !== keyState.pressed && keyState.pressed) {
        // console.log("[AUDIO] playing", key, keyState);

        this.play(parseInt(key));
      }
    });

    // Sync up to input store to get released keys
    this.input = { ...state };
  };

  debugUI() {
    DebugUIInstance.button("Audio", {
      title: "Play Audio",
      onClick: () => this.play(Math.round(Math.random() * 88)),
    });
  }

  load = async (file: string = "music/ff8-magic.mp3") => {
    await this.loadSample(file);
    this.createAnalyser();
  };

  play = async (midiNote: number = 69) => {
    if (!this.buffer || !this.context || !this.analyser) return;

    // Check if context is in suspended state (autoplay policy)
    if (this.context.state === "suspended") {
      this.context.resume();
    }

    // Play audio
    // console.log("playing");

    // Create the buffer node and attach our audio buffer
    this.audio = this.context.createBufferSource();
    this.audio.buffer = this.buffer;

    // Calculate detune (resample pitch) of the audio
    // Lets you simulate different piano keys and octavees
    const parsedNote = Midi.midiToNoteName(midiNote, {
      sharps: true,
    }); // => "C#4"
    const noteLetter = parsedNote.slice(0, -1);
    const octave = parseInt(parsedNote.slice(-1));
    console.log("playing note", midiNote, parsedNote, noteLetter, octave);
    this.audio.detune.value = this.calculateDetune(noteLetter, octave);

    this.audio.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    // Play audio
    this.audio.start();
  };

  calculateDetune(note: string, octave: number = 4) {
    const noteIndex = NOTES_ALL_IN_ORDER.findIndex(
      (searchNote) => searchNote == note
    );
    const octaveOffset = (octave - 4) * 1200;
    return noteIndex * 100 + octaveOffset;
  }

  frequency() {
    if (!this.analyser || !this.frequencyData) return;
    this.analyser.getFloatFrequencyData(this.frequencyData);

    return this.frequencyData;
  }

  waveform() {
    if (!this.analyser || !this.waveformData) return;
    this.analyser.getFloatTimeDomainData(this.waveformData);

    return this.waveformData;
  }
}
