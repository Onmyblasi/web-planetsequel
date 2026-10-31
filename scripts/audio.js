/* ============================================================
   audio.js · shared Web Audio helpers
   Browsers block sound until the user interacts, so nothing
   here runs on its own: call init() from a click handler.
   ============================================================ */

const Audio = (() => {

  let ctx = null;
  let master = null;
  let buffers = null;

  /* Creates the context and the master gain. Returns false if
     the browser has no Web Audio at all. Safe to call twice. */
  function init() {
    if (ctx) return true;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    buildBuffers();
    return true;
  }

  /* Six seconds of noise in three colours, reused by every
     source. Six and not two because once you filter the lows
     the ear starts hearing a short loop repeat. */
  function buildBuffers() {
    const frames = ctx.sampleRate * 6;
    buffers = {};

    // white: flat. Equal energy per hertz, so most of it ends up
    // in the treble. This is the hiss.
    buffers.white = ctx.createBuffer(1, frames, ctx.sampleRate);
    let d = buffers.white.getChannelData(0);
    for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1;

    // brown: white, integrated. Falls 6 dB per octave, so the
    // energy sits at the bottom. Wind, sea, an engine.
    buffers.brown = brownBuffer(frames, 0.02, 3.5);

    // deep: the same thing integrated harder. The coefficient is
    // the corner of a one-pole filter, so a smaller number drops
    // the corner and drags everything further down. Cabin, hull,
    // the inside of something big.
    buffers.deep = brownBuffer(frames, 0.009, 5.2);

    // pink: 3 dB per octave, halfway between the two.
    // Paul Kellet's filter bank.
    buffers.pink = ctx.createBuffer(1, frames, ctx.sampleRate);
    d = buffers.pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < frames; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }

  /* White noise run through a one-pole lowpass. coeff sets how
     low the corner sits; make is the gain back, because
     integrating a signal flattens it almost to nothing. The
     clamp is there because a weak leak lets the value wander off
     centre, and a wandering value clips. */
  function brownBuffer(frames, coeff, make) {
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    let last = 0;

    for (let i = 0; i < frames; i++) {
      last = (last + coeff * (Math.random() * 2 - 1)) / (1 + coeff);
      d[i] = Math.max(-1, Math.min(1, last * make));
    }
    return buffer;
  }

  /* Looping noise through a bandpass and a lowpass.
     Returns the gain node so the caller drives the volume; the
     filters and the source hang off it so a caller that needs
     to move them can.

     colour  "white" | "pink" | "brown" | "deep"
     band    centre frequency of the bandpass
     q       how narrow that band is
     cutoff  lowpass: everything above this is dropped
     drift   how far the cutoff wanders, in hertz. 0 = still
     rate    how fast it wanders, in hertz */
  function noise({ colour = "white", band = 900, q = 0.5,
                   cutoff = 2400, drift = 0, rate = 0.05 } = {}) {
    if (!ctx) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffers[colour] || buffers.white;
    source.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = band;
    bandpass.Q.value = q;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = cutoff;

    // a very slow oscillator walking the cutoff up and down.
    // Without it the ear files the sound under "broken speaker"
    // instead of "somewhere".
    let lfo = null;
    if (drift > 0) {
      lfo = ctx.createOscillator();
      const amp = ctx.createGain();
      lfo.frequency.value = rate;
      amp.gain.value = drift;
      lfo.connect(amp);
      amp.connect(lowpass.frequency);
      lfo.start();
    }

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(master);
    source.start();

    gain.source   = source;
    gain.bandpass = bandpass;
    gain.lowpass  = lowpass;
    gain.stop = () => {
      try { source.stop(); } catch (e) { /* already stopped */ }
      try { if (lfo) lfo.stop(); } catch (e) { /* idem */ }
    };

    return gain;
  }

  /* A short tone with a quick attack and an exponential tail. */
  function beep({ freq = 600, at = 0, length = 0.1, peak = 0.04 } = {}) {
    if (!ctx) return;
    const start = ctx.currentTime + at;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  /* A continuous low tone — room hum, machinery.

     With beat > 0 it builds a turbine instead of a tone: two
     oscillators detuned by that many hertz, which pulse against
     each other the way two engines do when they aren't turning
     at quite the same speed. The octave above is there so that
     something still comes out of a laptop speaker, which can't
     reproduce the fundamental at all. */
  function hum({ freq = 52, level = 0.018, beat = 0 } = {}) {
    if (!ctx) return null;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);

    const parts = [];

    const a = ctx.createOscillator();
    a.type = "sine";
    a.frequency.value = freq;
    a.connect(gain);
    parts.push(a);

    if (beat > 0) {
      const b = ctx.createOscillator();
      b.type = "sine";
      b.frequency.value = freq + beat;
      b.connect(gain);
      parts.push(b);

      const up = ctx.createOscillator();
      const trim = ctx.createGain();
      up.type = "sine";
      up.frequency.value = freq * 2;
      trim.gain.value = 0.4;
      up.connect(trim);
      trim.connect(gain);
      parts.push(up);
    }

    parts.forEach(p => p.start());
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(level, ctx.currentTime + 1.2);

    gain.parts = parts;
    gain.stop = () => parts.forEach(p => {
      try { p.stop(); } catch (e) { /* already stopped */ }
    });

    return gain;
  }

  function fadeMaster(to, seconds = 0.2) {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(to, ctx.currentTime + seconds);
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  return {
    init,
    noise,
    beep,
    hum,
    fadeMaster,
    resume,
    get context() { return ctx; },
    get now() { return ctx ? ctx.currentTime : 0; }
  };

})();
