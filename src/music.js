  startMusic(style) {
    this.stopMusic();
    let ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    const bpm = style === 'beomil' ? 128 : 122;
    const step = 60 / bpm / 4;
    const master = ctx.createGain(); master.gain.value = 0.42;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const prog = style === 'beomil' ? [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]] : [[50, 53, 57], [55, 58, 62], [48, 52, 55], [53, 57, 60]];
    const bassRoot = style === 'beomil' ? [33, 29, 36, 31] : [38, 43, 36, 41];
    const lead = [0, 2, 1, 2, 0, 1, 2, 1];
    const kick = (t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.34);
    };
    const noise = (t, dur, freq, type, vol) => {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
    };
    const tone = (t, midi, dur, type, vol, cutoff, detune) => {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff / 4), t + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      f.connect(g); g.connect(master);
      [-(detune || 0), detune || 0].forEach((d) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(midi); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + 0.05); });
    };
    let n = 0, next = ctx.currentTime + 0.1;
    const sched = () => {
      while (next < ctx.currentTime + 0.12) {
        const s16 = n % 16, bar = Math.floor(n / 16) % 4, part = Math.floor(n / 64) % 4;
        const ch = prog[bar];
        if (s16 % 4 === 0 && !(part === 3 && bar === 3 && s16 >= 8)) kick(next);
        if (s16 % 4 === 2) noise(next, 0.06, 8000, 'highpass', 0.25);
        else if (s16 % 2 === 1) noise(next, 0.03, 9500, 'highpass', 0.08);
        if (s16 === 4 || s16 === 12) noise(next, 0.18, 1600, 'bandpass', 0.45);
        if (s16 % 4 === 2) tone(next, bassRoot[bar], step * 1.6, 'sawtooth', 0.32, 700, 4);
        if (style === 'beomil') {
          if (part >= 1 && s16 % 2 === 0) tone(next, ch[lead[(s16 / 2) % 8]] + 12, step * 1.4, 'sawtooth', 0.09, 4200, 14);
        } else {
          if (s16 === 2 || s16 === 7 || s16 === 10) ch.forEach((m) => tone(next, m + 12, step * 1.8, 'square', 0.05, 2600, 6));
          if (part >= 2 && (s16 === 0 || s16 === 8)) tone(next, ch[2] + 24, step * 3, 'triangle', 0.08, 5000, 0);
        }
        next += step; n++;
      }
    };
    sched();
    this.music = { ctx: ctx, iv: setInterval(sched, 25) };
  }

  stopMusic() {
    const m = this.music; if (!m) return;
    clearInterval(m.iv);
    try { m.ctx.close(); } catch (e) {}
    this.music = null;
  }

