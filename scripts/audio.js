/* ============================================================
   audio.js · shared Web Audio helpers
   Browsers block sound until the user interacts, so nothing
   here runs on its own: call init() from a click handler.
   ============================================================ */

const Audio = (() => {

  let ctx = null;
  let master = null;
  let noiseBuffer = null;

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

    // two seconds of white noise, reused by every source
    const frames = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    return true;
  }

  /* Looping white noise through a bandpass and a lowpass.
     Returns the gain node so the caller drives the volume.

     band   centre frequency of the bandpass
     q      how narrow that band is
     cutoff lowpass: everything above this is dropped */
  function noise({ band = 900, q = 0.5, cutoff = 2400 } = {}) {
    if (!ctx) return null;

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = band;
    bandpass.Q.value = q;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = cutoff;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(master);
    source.start();

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

  /* A continuous low tone — room hum, machinery. */
  function hum({ freq = 52, level = 0.018 } = {}) {
    if (!ctx) return null;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = level;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
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
