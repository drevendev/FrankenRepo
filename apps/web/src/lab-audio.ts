// Original procedural score and sound design. No audio files or network requests.
export type LabSound =
  | 'bubble'
  | 'switch'
  | 'inspect'
  | 'ready'
  | 'spark'
  | 'lever'
  | 'reveal'
  | 'error';
const MOTIF = [
  74,
  null,
  77,
  76,
  69,
  null,
  72,
  null,
  65,
  69,
  null,
  67,
  64,
  null,
  62,
  null,
];
const noteHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class LabAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private drones: OscillatorNode[] = [];
  private voices = new Set<OscillatorNode>();
  private enabled = false;
  private music = true;
  private volume = 0.22;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNote = 0;
  private beat = 0;
  private bubble = 0;

  async enable() {
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      const master = context.createGain();
      master.gain.value = 0;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -22;
      limiter.knee.value = 18;
      limiter.ratio.value = 5;
      limiter.attack.value = 0.01;
      limiter.release.value = 0.3;
      master.connect(limiter);
      limiter.connect(context.destination);
      this.master = master;
      this.musicBus = context.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(master);
      // A quiet, imperfectly tuned organ beneath the music box.
      for (const [frequency, level] of [
        [73.416, 0.06],
        [110.12, 0.025],
        [146.71, 0.012],
      ]) {
        const drone = context.createOscillator();
        const gain = context.createGain();
        drone.type = 'sine';
        drone.frequency.value = frequency;
        gain.gain.value = level;
        drone.connect(gain);
        gain.connect(this.musicBus);
        drone.start();
        this.drones.push(drone);
      }
    }
    await this.context.resume();
    this.enabled = true;
    this.master!.gain.setTargetAtTime(
      this.volume,
      this.context.currentTime,
      0.08,
    );
    this.updateMusic();
  }
  disable() {
    this.enabled = false;
    this.stopClock();
    if (this.context && this.master) {
      const context = this.context;
      this.master.gain.setTargetAtTime(0, context.currentTime, 0.03);
      // Suspending also stops processor use while muted.
      void context.suspend().catch(() => {});
    }
  }
  setVolume(value: number) {
    this.volume = Math.min(0.5, Math.max(0, value));
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        this.enabled ? this.volume : 0,
        this.context.currentTime,
        0.06,
      );
  }
  setMusic(value: boolean) {
    this.music = value;
    this.updateMusic();
  }
  async setHidden(hidden: boolean) {
    if (!this.context || !this.enabled) return;
    if (hidden) {
      this.stopClock();
      await this.context.suspend();
    } else {
      await this.context.resume();
      this.updateMusic();
    }
  }
  private stopClock() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
  private updateMusic() {
    this.stopClock();
    if (!this.context || !this.musicBus) return;
    this.musicBus.gain.setTargetAtTime(
      this.enabled && this.music ? 0.32 : 0,
      this.context.currentTime,
      0.15,
    );
    if (!this.enabled || !this.music || this.context.state !== 'running')
      return;
    this.nextNote = this.context.currentTime + 0.12;
    const schedule = () => {
      const context = this.context;
      if (!context || context.state !== 'running') return;
      // Short lookahead keeps mute, visibility and music controls responsive.
      while (this.nextNote < context.currentTime + 0.65) {
        const note = MOTIF[this.beat % MOTIF.length];
        if (note !== null) {
          const frequency = noteHz(note);
          this.tone(
            frequency,
            frequency * 0.999,
            2.1,
            0.13,
            'sine',
            this.nextNote,
            this.musicBus!,
          );
          this.tone(
            frequency * 2.003,
            frequency * 2,
            1.1,
            0.025,
            'sine',
            this.nextNote,
            this.musicBus!,
          );
        }
        this.nextNote += 60 / 66;
        this.beat++;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 250);
  }
  private tone(
    from: number,
    to: number,
    duration: number,
    level: number,
    type: OscillatorType = 'sine',
    when?: number,
    bus?: AudioNode,
  ) {
    const context = this.context;
    if (
      !context ||
      !this.master ||
      !this.enabled ||
      context.state !== 'running'
    )
      return;
    const start = when ?? context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      level,
      start + Math.min(0.025, duration / 5),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(bus ?? this.master);
    this.voices.add(osc);
    osc.onended = () => {
      this.voices.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
  play(sound: LabSound) {
    const context = this.context;
    if (!this.enabled || !context || context.state !== 'running') return;
    const t = context.currentTime;
    if (sound === 'bubble') {
      const root = [360, 430, 310, 390][this.bubble++ % 4];
      this.tone(root, root * 0.3, 0.16, 0.22);
      this.tone(root * 0.65, root * 1.3, 0.11, 0.08, 'sine', t + 0.1);
    } else if (sound === 'switch') {
      this.tone(690, 310, 0.09, 0.09, 'triangle');
    } else if (sound === 'inspect') {
      [0, 0.14, 0.28].forEach((delay, i) =>
        this.tone(540 + i * 110, 490 + i * 110, 0.13, 0.07, 'sine', t + delay),
      );
    } else if (sound === 'ready') {
      this.tone(523.25, 523.25, 0.7, 0.1);
      this.tone(783.99, 783.99, 0.8, 0.07, 'sine', t + 0.16);
    } else if (sound === 'spark' || sound === 'lever') {
      this.tone(75, 180, sound === 'lever' ? 0.9 : 0.23, 0.1, 'triangle');
      this.tone(840, 230, 0.2, 0.055, 'sawtooth', t + 0.08);
    } else if (sound === 'reveal') {
      [62, 65, 69, 74].forEach((note, i) =>
        this.tone(noteHz(note), noteHz(note), 1.7, 0.11, 'sine', t + i * 0.18),
      );
    } else {
      this.tone(220, 146.8, 0.45, 0.09, 'triangle');
    }
  }
  async dispose() {
    this.enabled = false;
    this.stopClock();
    const context = this.context;
    this.context = null;
    this.voices.clear();
    this.drones = [];
    this.master = null;
    this.musicBus = null;
    if (context && context.state !== 'closed') await context.close();
  }
}
