export default class AudioPlayer {
  context?: AudioContext;
  audio?: AudioBufferSourceNode;
  buffer?: AudioBuffer;
  analyser?: AnalyserNode;
  frequencyData?: Float32Array;
  waveformData?: Float32Array;
  loaded: boolean = false;
  playing: boolean = false;

  constructor() {
    this.handleEvents();
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
    const canvas = document.getElementById("gpu-canvas");
    if (canvas) canvas.addEventListener("click", this.play);
  }

  play = async () => {
    if (this.playing) return;
    if (!this.loaded) {
      await this.loadSample("music/ff8-magic.mp3");
      this.createAnalyser();
    }

    if (!this.buffer || !this.context || !this.analyser) return;

    // Check if context is in suspended state (autoplay policy)
    if (this.context.state === "suspended") {
      this.context.resume();
    }

    // Play audio
    console.log("playing");

    // Create the buffer node and attach our audio buffer
    this.audio = this.context.createBufferSource();
    this.audio.buffer = this.buffer;

    this.audio.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    // Play audio
    this.audio.start();
    this.playing = true;
  };

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
