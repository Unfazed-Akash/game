// Web Audio API Procedural Synthesizer for Neon Overdrive
class SynthAudio {
  constructor() {
    this.ctx = null;
    this.musicInterval = null;
    this.currentStep = 0;
    this.isPlaying = false;
    
    // Load persisted mute state
    this.isMuted = localStorage.getItem('neon_sound_muted') === 'true';

    // Master Gain for reliable muting
    this.masterGain = null;

    // Engine sound nodes
    this.engineOsc = null;
    this.engineGain = null;

    // Synth parameters
    this.bpm = 125;
    this.stepDuration = 60 / this.bpm / 4; // 16th notes
    this.nextNoteTime = 0.0;

    // Bass notes (frequencies in Hz)
    // E1: 41.20, G1: 49.00, A1: 55.00, D1: 36.71, C1: 32.70
    this.bassPattern = [
      41.20, 41.20, 41.20, 41.20,
      49.00, 49.00, 55.00, 55.00,
      41.20, 41.20, 41.20, 41.20,
      36.71, 36.71, 32.70, 32.70
    ];
  }

  init() {
    if (this.ctx) return;
    
    // Create AudioContext
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    
    // Create master volume node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isMuted ? 0.0 : 1.0;
    this.masterGain.connect(this.ctx.destination);

    // Start engine hum
    this.initEngine();
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initEngine() {
    if (!this.ctx || !this.masterGain) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime); // Low growl
      
      // Low pass filter to make it sound rumblier and less buzzy
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Start silent

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      
      // Connect to master gain instead of context destination
      this.engineGain.connect(this.masterGain);

      this.engineOsc.start();
    } catch (e) {
      console.warn("Failed to initialize engine sound", e);
    }
  }

  setEngineActive(active) {
    if (!this.ctx || !this.engineGain) return;
    const targetGain = active ? 0.08 : 0.0;
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  updateEnginePitch(speedRatio) {
    // speedRatio is 0 to 1
    if (!this.ctx || !this.engineOsc) return;
    // Map speed ratio to 45Hz - 110Hz range
    const freq = 45 + speedRatio * 75;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
  }

  playCoin() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // High-pitched 8-bit style double beep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.setValueAtTime(1320, t + 0.08); // E6
    
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCrash() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // White noise style explosion + low bass thud
    // 1. Bass thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.6);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.6);

    // 2. White noise explosion
    try {
      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(300, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(50, t + 0.8);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      
      noise.start(t);
      noise.stop(t + 0.8);
    } catch (e) {
      console.warn("Noise buffer crash failed", e);
    }
  }

  playBoost() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Whoosh sweeping upward
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.4);
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(1500, t + 0.4);
    filter.Q.setValueAtTime(3, t);
 
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playClick() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.05);
  }

  startMusic() {
    if (this.isPlaying) return;
    this.resume();
    this.isPlaying = true;

    if (!this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime;

    // Scheduler loop
    const scheduler = () => {
      while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        this.scheduleNote(this.currentStep, this.nextNoteTime);
        this.advanceStep();
      }
      if (this.isPlaying) {
        this.musicInterval = setTimeout(scheduler, 25);
      }
    };
    
    scheduler();
    this.setEngineActive(true);
  }

  stopMusic() {
    this.isPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
    this.setEngineActive(false);
  }

  advanceStep() {
    this.nextNoteTime += this.stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  scheduleNote(step, time) {
    if (!this.ctx || !this.masterGain) return;

    // BASSLINE
    const bassFreq = this.bassPattern[step];
    if (bassFreq) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, time);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, time);
      filter.frequency.exponentialRampToValueAtTime(80, time + this.stepDuration * 0.9);
      
      gain.gain.setValueAtTime(0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 0.9);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(time);
      osc.stop(time + this.stepDuration * 0.9);
    }

    // DRUMS: Kick drum
    if (step % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      
      kickGain.gain.setValueAtTime(0.18, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      
      kickOsc.connect(kickGain);
      kickGain.connect(this.masterGain);
      
      kickOsc.start(time);
      kickOsc.stop(time + 0.12);
    }

    // Snare drum
    if (step === 4 || step === 12) {
      const snareOsc = this.ctx.createOscillator();
      const snareGain = this.ctx.createGain();
      
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(180, time);
      
      snareGain.gain.setValueAtTime(0.08, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      
      snareOsc.connect(snareGain);
      snareGain.connect(this.masterGain);
      
      snareOsc.start(time);
      snareOsc.stop(time + 0.08);

      // Noise layer for snare
      try {
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, time);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.06, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        
        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        noiseNode.start(time);
        noiseNode.stop(time + 0.1);
      } catch (e) {}
    }

    // Hi-hat
    if (step % 4 === 2) {
      try {
        const bufferSize = this.ctx.sampleRate * 0.04;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, time);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.02, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        
        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        noiseNode.start(time);
        noiseNode.stop(time + 0.04);
      } catch (e) {}
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('neon_sound_muted', this.isMuted);

    // Initialize AudioContext on user gesture
    this.resume();

    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0.0 : 1.0;
    }
    return this.isMuted;
  }
}

export const audio = new SynthAudio();
