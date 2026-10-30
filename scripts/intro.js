/* ============================================================
   intro.js · opening sequence
   The TV is never on screen. All we see is its light on the
   wall, and all we hear is the broadcast through a wall.
   ============================================================ */

const SCRIPT = {
  es: {
    prompt: "PULSA PARA EMPEZAR",
    skip: "SALTAR",
    lines: [
      { text: "Y ahora les traemos una noticia de última hora:", hold: 2400, cut: true },
      { text: "la Agencia Espacial Europea acaba de comunicar\nque han hallado un planeta", hold: 3200, cut: true },
      { text: "con unas características similares a las que tenía la Tierra\nhace 3.800 millones de años.", hold: 3800, cut: false },
      { text: "La agencia planea ahora mandar\nun equipo de investigación", hold: 2600, cut: true },
      { text: "para introducir progresivamente las especies\nque poblaron nuestro planeta", hold: 3200, cut: false },
      { text: "y se encargaron de construir una atmósfera habitable\npara los seres humanos.", hold: 3200, cut: true },
      { text: "La hipótesis plantea que, con el tiempo,", hold: 2000, cut: false },
      { text: "podría llegar a ser como una secuela\nde nuestro planeta.", hold: 3000, cut: true },
      { text: "Esperamos que nuestros investigadores lo consigan.", hold: 2800, cut: false },
      { text: "", hold: 2200, cut: false, lightsOut: true }
    ]
  },
    en: {
    prompt: "PRESS TO BEGIN",
    skip: "SKIP",
    lines: [
      { text: "We turn now to some breaking news:", hold: 2400, cut: true },
      { text: "the European Space Agency has just announced\nthat a planet has been found", hold: 3200, cut: true },
      { text: "with conditions similar to those on Earth\n3.8 billion years ago.", hold: 3800, cut: false },
      { text: "The agency now plans to send\na research team", hold: 2600, cut: true },
      { text: "to gradually introduce the species\nthat once populated our planet", hold: 3200, cut: false },
      { text: "and built the atmosphere\nthat made it habitable for humans.", hold: 3200, cut: true },
      { text: "The hypothesis is that, in time,", hold: 2000, cut: false },
      { text: "it could become a sequel\nto our own planet.", hold: 3000, cut: true },
      { text: "We hope our researchers make it.", hold: 2800, cut: false },
      { text: "", hold: 2200, cut: false, lightsOut: true }
    ]
  }
};

const lang = Language.current();
const S = SCRIPT[lang];

Language.save(lang);
Language.set("gatePrompt", S.prompt);
Language.set("skipBtn", S.skip);

/* ============ TV LIGHT ============ */

const tvLight = document.getElementById("tvLight");

/* each cut changes the tint: cold blue, grey, a warm flash */
const TINTS = [
  [120, 160, 205],
  [150, 165, 180],
  [185, 170, 140],
  [110, 150, 200],
  [160, 175, 195]
];

let tint = TINTS[0];
let target = 0;      // where the brightness is heading
let level = 0;       // smoothed brightness
let lit = false;

function paintLight(v) {
  const [r, g, b] = tint;
  tvLight.style.opacity = "1";
  tvLight.style.background =
    `radial-gradient(ellipse 85% 60% at 50% 96%,
        rgba(${r},${g},${b},${(v * .38).toFixed(3)}) 0%,
        rgba(${r},${g},${b},${(v * .16).toFixed(3)}) 32%,
        rgba(${Math.round(r * .6)},${Math.round(g * .6)},${Math.round(b * .7)},${(v * .05).toFixed(3)}) 62%,
        rgba(0,0,0,0) 86%)`;
}

function changeTint() {
  tint = TINTS[Math.floor(Math.random() * TINTS.length)];
  target = .55 + Math.random() * .4;
}

/* Flicker is fine noise plus occasional jumps, not a loop —
   a looping animation reads as decoration, this reads as a
   picture changing. */
let lastJump = 0;

function flicker(ts) {
  if (lit) {
    if (ts - lastJump > 90 + Math.random() * 260) {
      target = .45 + Math.random() * .5;
      lastJump = ts;
    }
    const noise = (Math.random() - .5) * .12;
    level += ((target + noise) - level) * .22;
    paintLight(Math.max(0, level));
  }
  requestAnimationFrame(flicker);
}
requestAnimationFrame(flicker);

/* ============ MUFFLED SOUND ============ */

let voiceGain = null;
let syllableTimer = null;

function startSound() {
  if (!Audio.init()) return false;
  Audio.resume();

  // a wall eats the high frequencies: nothing above ~520 Hz
  voiceGain = Audio.noise({ band: 320, q: 1.6, cutoff: 520 });
  Audio.hum({ freq: 52, level: .018 });

  Audio.fadeMaster(0, 0);
  Audio.fadeMaster(1, 2);
  return true;
}

/* Short bumps in volume, with long gaps now and then. The ear
   reads that rhythm as someone speaking. */
function speak() {
  if (!voiceGain) return;

  const t = Audio.now;
  const length = .08 + Math.random() * .17;
  const peak = .05 + Math.random() * .07;

  voiceGain.gain.cancelScheduledValues(t);
  voiceGain.gain.setValueAtTime(voiceGain.gain.value, t);
  voiceGain.gain.linearRampToValueAtTime(peak, t + .035);
  voiceGain.gain.linearRampToValueAtTime(.008, t + length);

  const next = Math.random() < .14
    ? 420 + Math.random() * 700     // pause between sentences
    : 90 + Math.random() * 190;     // next syllable

  syllableTimer = setTimeout(speak, next);
}

/* ============ SEQUENCE ============ */

const subtitle = document.getElementById("subtitle");
const fade     = document.getElementById("fade");
const gate     = document.getElementById("gate");
const skipBtn  = document.getElementById("skipBtn");

let timers = [];
let done = false;

function wait(ms) {
  return new Promise(resolve => timers.push(setTimeout(resolve, ms)));
}

async function play() {
  lit = true;
  changeTint();

  if (startSound()) speak();

  await wait(1400);
  skipBtn.classList.add("on");

  for (const line of S.lines) {
    if (done) return;
    if (line.cut) changeTint();

    if (line.lightsOut) {
      // someone switches the television off
      subtitle.classList.remove("on");
      lit = false;
      tvLight.style.transition = "opacity 1.1s ease";
      tvLight.style.opacity = "0";
      Audio.fadeMaster(0, 1.4);
      clearTimeout(syllableTimer);
      await wait(line.hold);
      break;
    }

    subtitle.textContent = line.text;
    subtitle.classList.add("on");
    await wait(line.hold);
    subtitle.classList.remove("on");
    await wait(400);
  }

  finish();
}

function finish() {
  if (done) return;
  done = true;

  timers.forEach(clearTimeout);
  clearTimeout(syllableTimer);
  lit = false;
  subtitle.classList.remove("on");
  skipBtn.classList.remove("on");
  Audio.fadeMaster(0, 1);
  fade.classList.add("on");

  setTimeout(() => {
    // the planet comes next:
    // window.location.href = "game/";
    console.log("intro finished");
  }, 2800);
}

function begin() {
  gate.classList.add("out");
  setTimeout(play, 900);
}

gate.addEventListener("click", begin, { once: true });

document.addEventListener("keydown", function onKey(e) {
  if (e.key === "Enter" || e.key === " ") {
    document.removeEventListener("keydown", onKey);
    begin();
  }
});

skipBtn.addEventListener("click", finish);
document.addEventListener("keydown", e => { if (e.key === "Escape") finish(); });
