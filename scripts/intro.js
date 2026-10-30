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
      { text: "…confirmado esta mañana por la Agencia Espacial Europea.", hold: 4200, cut: true },
      { text: "El planeta está a cuarenta años luz. Tiene agua líquida\ny un campo magnético estable.", hold: 5400, cut: true },
      { text: "No es habitable. Pero, según sus cálculos, podría llegar a serlo.", hold: 5000, cut: false },
      { text: "…lo que ya todo el mundo llama el proyecto Sequel.", hold: 4400, cut: true },
      { text: "Doce investigadores. Una generación entera de trabajo\nantes de ver el primer resultado.", hold: 5600, cut: false },
      { text: "La misión despega mañana.", hold: 4000, cut: true },
      { text: "", hold: 2600, cut: false, lightsOut: true }
    ]
  },
  en: {
    prompt: "PRESS TO BEGIN",
    skip: "SKIP",
    lines: [
      { text: "…confirmed this morning by the European Space Agency.", hold: 4200, cut: true },
      { text: "The planet is forty light-years away. It has liquid water\nand a stable magnetic field.", hold: 5400, cut: true },
      { text: "It isn't habitable. But by their calculations, it could become so.", hold: 5000, cut: false },
      { text: "…what everyone is already calling the Sequel project.", hold: 4400, cut: true },
      { text: "Twelve researchers. A whole generation of work\nbefore the first result.", hold: 5600, cut: false },
      { text: "The mission launches tomorrow.", hold: 4000, cut: true },
      { text: "", hold: 2600, cut: false, lightsOut: true }
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
    await wait(600);
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
