/* ============================================================
   ambience.js · the start screen's room tone
   Needs audio.js. Three layers: the cabin roar, the engine, and
   a radio that opens every so often.
   ============================================================ */

const Ambience = (() => {

  /* Settings chosen on the test bench. Everything audible is in
     here: nothing below this block holds a number worth tuning. */
  const SETTINGS = {
    // "deep" is brown noise integrated harder — the same sound
    // with its weight dragged further down. "brown" is the one
    // from the bench if this turns out to be too much.
    cabin:  { colour: "deep", band: 665, q: 0.2, cutoff: 400,
              level: 0.145, drift: 10, rate: 0.02 },

    engine: { freq: 86, level: 0.040, beat: 2.5 },

    // the vents. Off: it read as hiss and hiss is what we were
    // getting away from. Raise the level to bring it back.
    air:    { cutoff: 6800, level: 0 },

    radio:  { band: 660, q: 3.9, cutoff: 2600, level: 0.100,
              syllables: 4, every: 24, first: 6 }
  };

  let cabin = null, engine = null, air = null, radio = null;
  let txTimer = null, sylTimer = null;
  let running = false;

  /* ---------- the bed ---------- */

  function start() {
    if (running) return;
    if (!Audio.init()) return;
    Audio.resume();
    running = true;

    const now = Audio.now;

    cabin = Audio.noise(SETTINGS.cabin);
    cabin.gain.setValueAtTime(0, now);
    cabin.gain.linearRampToValueAtTime(SETTINGS.cabin.level, now + 1.6);

    engine = Audio.hum(SETTINGS.engine);

    if (SETTINGS.air.level > 0) {
      air = Audio.noise({
        colour: "white",
        band: SETTINGS.air.cutoff,
        q: 0.3,
        cutoff: 14000
      });
      air.gain.setValueAtTime(0, now);
      air.gain.linearRampToValueAtTime(SETTINGS.air.level, now + 1.6);
    }

    // built silent; a transmission is the only thing that opens it
    radio = Audio.noise({
      colour: "white",
      band: SETTINGS.radio.band,
      q: SETTINGS.radio.q,
      cutoff: SETTINGS.radio.cutoff
    });

    schedule(SETTINGS.radio.first);
  }

  /* Safe to call twice, and safe to call before start(). */
  function stop() {
    running = false;
    clearTimeout(txTimer);
    clearTimeout(sylTimer);

    if (!Audio.context) { cabin = engine = air = radio = null; return; }

    const now = Audio.now;
    [cabin, engine, air, radio].forEach(layer => {
      if (!layer) return;
      try {
        layer.gain.cancelScheduledValues(now);
        layer.gain.setValueAtTime(layer.gain.value, now);
        layer.gain.linearRampToValueAtTime(0, now + 0.4);
      } catch (e) { /* node already gone */ }
      setTimeout(() => layer.stop(), 700);
    });

    cabin = engine = air = radio = null;
  }

  /* ---------- a transmission ---------- */

  /* Somebody opens a channel, says four syllables of nothing,
     and closes it. No tones: the squelch at each end is the
     whole punctuation. */
  function transmit() {
    if (!running || !radio) return;

    const t = Audio.now;
    const peak = SETTINGS.radio.level;

    // squelch opening: a hard little burst of static
    radio.gain.cancelScheduledValues(t);
    radio.gain.setValueAtTime(0, t);
    radio.gain.linearRampToValueAtTime(peak * 1.5, t + 0.02);
    radio.gain.linearRampToValueAtTime(peak * 0.22, t + 0.14);

    if (SETTINGS.radio.syllables > 0) {
      speak(SETTINGS.radio.syllables, 0.22, close);
    } else {
      radio.gain.setValueAtTime(peak * 0.22, t + 0.8);
      setTimeout(close, 900);
    }

    schedule();
  }

  /* Noise bursts with a speech envelope, and the formant moving
     each time so they read as different vowels. The ear hears
     somebody talking without a single word being said. */
  function speak(left, delay, done) {
    clearTimeout(sylTimer);

    sylTimer = setTimeout(() => {
      if (!running || !radio) return;

      const t = Audio.now;
      const peak = SETTINGS.radio.level;
      const length = 0.09 + Math.random() * 0.18;
      const loud = peak * (0.6 + Math.random() * 0.6);

      radio.bandpass.frequency.setTargetAtTime(
        SETTINGS.radio.band * (0.65 + Math.random() * 0.8), t, 0.03);

      radio.gain.cancelScheduledValues(t);
      radio.gain.setValueAtTime(radio.gain.value, t);
      radio.gain.linearRampToValueAtTime(loud, t + 0.035);
      radio.gain.linearRampToValueAtTime(peak * 0.1, t + length);

      if (left > 1) {
        // short gaps inside a word, long ones between phrases
        const gap = Math.random() < 0.18
          ? 0.42 + Math.random() * 0.55
          : 0.09 + Math.random() * 0.14;
        speak(left - 1, length + gap, done);
      } else {
        setTimeout(done, (length + 0.18) * 1000);
      }
    }, delay * 1000);
  }

  /* The channel shutting: one short click of static, the sound a
     real transmitter makes when the key is released. */
  function close() {
    if (!running || !radio) return;

    const t = Audio.now;
    const peak = SETTINGS.radio.level;

    radio.gain.cancelScheduledValues(t);
    radio.gain.setValueAtTime(radio.gain.value, t);
    radio.gain.linearRampToValueAtTime(peak * 0.85, t + 0.015);
    radio.gain.linearRampToValueAtTime(0, t + 0.085);
  }

  function schedule(seconds) {
    clearTimeout(txTimer);
    const wait = seconds !== undefined
      ? seconds
      : SETTINGS.radio.every * (0.7 + Math.random() * 0.6);
    txTimer = setTimeout(transmit, wait * 1000);
  }

  return {
    start,
    stop,
    transmit,
    get running() { return running; },
    settings: SETTINGS
  };

})();
