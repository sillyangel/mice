declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface AudioEffectPreset {
  name: string;
  gains: number[];  // Gains for different frequency bands
  frequencies: number[];  // Center frequencies for each band
}

export const presets: { [key: string]: AudioEffectPreset } = {
  normal: {
    name: "Normal",
    gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    frequencies: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
  },
  bassBoost: {
    name: "Bass Boost",
    gains: [7, 5, 3, 2, 0, 0, 0, 0, 0, 0],
    frequencies: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
  },
  trebleBoost: {
    name: "Treble Boost",
    gains: [0, 0, 0, 0, 0, 0, 2, 3, 5, 7],
    frequencies: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
  },
  vocalBoost: {
    name: "Vocal Boost",
    gains: [0, 0, 0, 2, 4, 4, 2, 0, 0, 0],
    frequencies: [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
  }
};

export class AudioEffects {
  private context: AudioContext;
  private source: MediaElementAudioSourceNode | null = null;
  private destination: AudioDestinationNode;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode;
  private crossfadeGainNode: GainNode;
  private analyser: AnalyserNode;
  private replayGainNode: GainNode;
  private currentPreset: string = 'normal';
  
  constructor(audioElement: HTMLAudioElement) {
    // Properly type the AudioContext initialization
    this.context = new (window.AudioContext || window.webkitAudioContext || AudioContext)();
    this.destination = this.context.destination;
    this.gainNode = this.context.createGain();
    this.crossfadeGainNode = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.replayGainNode = this.context.createGain();
    
    // Initialize ReplayGain node
    this.replayGainNode.gain.value = 1.0;
    
    // Create the audio processing chain
    this.setupAudioChain(audioElement);
    
    // Initialize EQ filters
    this.setupEqualizer();
  }

  private setupAudioChain(audioElement: HTMLAudioElement) {
    // Disconnect any existing source
    if (this.source) {
      this.source.disconnect();
    }
    
    // Create new source from audio element
    this.source = this.context.createMediaElementSource(audioElement);
    
    // Connect the audio processing chain
    this.source
      .connect(this.replayGainNode)
      .connect(this.gainNode)
      .connect(this.crossfadeGainNode);
      
    // Connect filters in series
    let lastNode: AudioNode = this.crossfadeGainNode;
    this.filters.forEach(filter => {
      lastNode.connect(filter);
      lastNode = filter;
    });
    
    // Connect to analyser and destination
    lastNode.connect(this.analyser);
    this.analyser.connect(this.destination);
  }

  private setupEqualizer() {
    // Create 10-band EQ
    presets.normal.frequencies.forEach((freq, index) => {
      const filter = this.context.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      this.filters.push(filter);
    });
  }

  public setPreset(presetName: string) {
    if (presets[presetName]) {
      this.currentPreset = presetName;
      presets[presetName].gains.forEach((gain, index) => {
        if (this.filters[index]) {
          this.filters[index].gain.setValueAtTime(gain, this.context.currentTime);
        }
      });
    }
  }

  public getCurrentPreset(): string {
    return this.currentPreset;
  }

  public setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    }
  }

  public setCrossfadeTime(seconds: number) {
    if (this.crossfadeGainNode) {
      const now = this.context.currentTime;
      this.crossfadeGainNode.gain.setValueAtTime(1, now);
      this.crossfadeGainNode.gain.linearRampToValueAtTime(0, now + seconds);
    }
  }

  public startCrossfade() {
    if (this.crossfadeGainNode) {
      this.crossfadeGainNode.gain.value = 1;
    }
  }

  public setReplayGain(gain: number) {
    if (this.replayGainNode) {
      // Clamp gain between -12dB and +12dB for safety
      const clampedGain = Math.max(-12, Math.min(12, gain));
      const gainValue = Math.pow(10, clampedGain / 20); // Convert dB to linear gain
      this.replayGainNode.gain.setValueAtTime(gainValue, this.context.currentTime);
    }
  }

  public getAnalyserNode(): AnalyserNode {
    return this.analyser;
  }

  public async resume() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  public disconnect() {
    if (this.source) {
      this.source.disconnect();
    }
    this.filters.forEach(filter => filter.disconnect());
    this.gainNode.disconnect();
    this.crossfadeGainNode.disconnect();
    this.analyser.disconnect();
    this.replayGainNode.disconnect();
  }
}
