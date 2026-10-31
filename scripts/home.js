/* ============================================================
   home.js · start screen
   ============================================================ */

/* ---------- strings ---------- */

const TEXT = {
  es: {
    tagline:   "APRENDE SQL Y HAZ CRECER VIDA",
    signIn:    "INICIAR SESIÓN",
    signUp:    "CREAR CUENTA",
    guest:     "Continuar sin iniciar sesión",
    email:     "CORREO",
    password:  "CONTRASEÑA",
    name:      "NOMBRE",
    accounts:  "Las cuentas todavía no están activas. Vuelve atrás y entra sin iniciar sesión para jugar.",
    back:      "← Volver",
    guestTitle:"SIN CUENTA",
    guestText: "Tu progreso se guardará solo en este navegador. Si cambias de dispositivo o borras los datos del navegador, lo perderás. ¿Continuamos así?",
    goOn:      "CONTINUAR ASÍ",
    cancel:    "VOLVER",
    continue:  "CONTINUAR PARTIDA",
    newGame:   "NUEVA PARTIDA",
    options:   "OPCIONES",
    exit:      "← Cambiar de acceso",
    soundOn:   "SONIDO",
    soundOff:  "ACTIVAR SONIDO",
    guestName: "Invitada",
    status:    "MODO LOCAL"
  },
  en: {
    tagline:   "LEARN SQL AND GROW LIFE",
    signIn:    "SIGN IN",
    signUp:    "CREATE ACCOUNT",
    guest:     "Continue without signing in",
    email:     "EMAIL",
    password:  "PASSWORD",
    name:      "NAME",
    accounts:  "Accounts aren't active yet. Go back and continue without signing in to play.",
    back:      "← Back",
    guestTitle:"NO ACCOUNT",
    guestText: "Your progress will be saved in this browser only. If you switch devices or clear your browser data, you'll lose it. Continue anyway?",
    goOn:      "CONTINUE ANYWAY",
    cancel:    "BACK",
    continue:  "CONTINUE",
    newGame:   "NEW GAME",
    options:   "OPTIONS",
    exit:      "← Change access",
    soundOn:   "SOUND",
    soundOff:  "ENABLE SOUND",
    guestName: "Guest",
    status:    "LOCAL MODE"
  }
};

let lang = Language.current();

/* ---------- starfield ---------- */

(function seedStars() {
  const field = document.getElementById("stars");
  const frag = document.createDocumentFragment();

  for (let i = 0; i < 110; i++) {
    const star = document.createElement("div");
    star.className = "star" + (Math.random() > .72 ? " twinkle" : "");
    star.style.left = (Math.random() * 100).toFixed(2) + "%";
    // squared distribution: denser towards the top of the sky
    star.style.top = (Math.pow(Math.random(), 1.5) * 72).toFixed(2) + "%";
    const size = (Math.random() * 1.4 + .8).toFixed(2);
    star.style.width = star.style.height = size + "px";
    star.style.opacity = (Math.random() * .6 + .22).toFixed(2);
    star.style.animationDelay = (Math.random() * 5).toFixed(2) + "s";
    frag.appendChild(star);
  }
  field.appendChild(frag);
})();

/* ---------- sound ---------- */

const SOUND_KEY = "sequel_sound";

let playing = false;
let primed  = false;   // has the first interaction happened?

const soundBtn   = document.getElementById("soundBtn");
const soundLabel = document.getElementById("soundLabel");

function rememberSound(state) {
  try { localStorage.setItem(SOUND_KEY, state); } catch (e) { /* private mode */ }
}

function soundOn() {
  if (!Audio.init()) return;

  /* El estado y el botón primero. Si el audio falla, la interfaz
     sigue siendo coherente y el siguiente clic puede apagarlo. */
  playing = true;
  primed  = true;
  rememberSound("on");

  soundBtn.classList.add("active");
  soundBtn.setAttribute("aria-pressed", "true");
  soundLabel.textContent = TEXT[lang].soundOn;

  Audio.fadeMaster(1, .1);
  try { Ambience.start(); } catch (e) { console.error(e); }
}

function soundOff() {
  playing = false;
  primed  = true;
  rememberSound("off");

  soundBtn.classList.remove("active");
  soundBtn.setAttribute("aria-pressed", "false");
  soundLabel.textContent = TEXT[lang].soundOff;

  if (Audio.context) Audio.fadeMaster(0, .12);
  try { Ambience.stop(); } catch (e) { console.error(e); }
}

soundBtn.addEventListener("click", () => playing ? soundOff() : soundOn());

/* Browsers won't play anything until the user acts, so the
   ambience starts on their first click or keypress, whatever it
   is. Anyone who turned it off before stays silent. */
function primeSound() {
  if (primed || playing) return;
  primed = true;

  let wanted = true;
  try { wanted = localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) { /* ignore */ }
  if (wanted) soundOn();
}

document.addEventListener("click", primeSound);
document.addEventListener("keydown", primeSound);

/* ---------- language ---------- */

const langBtn  = document.getElementById("langBtn");
const langMenu = document.getElementById("langMenu");

function applyLanguage(next) {
  lang = next;
  const t = TEXT[next];
  const set = Language.set;

  set("tagline", t.tagline);
  set("btnSignIn", t.signIn);   set("titleSignIn", t.signIn);
  set("btnSignUp", t.signUp);   set("titleSignUp", t.signUp);
  set("btnGuest", t.guest);
  set("labelEmail", t.email);   set("labelEmail2", t.email);
  set("labelPass", t.password); set("labelPass2", t.password);
  set("labelName", t.name);
  set("noteSignIn", t.accounts);
  set("noteSignUp", t.accounts);
  set("guestTitle", t.guestTitle);
  set("guestText", t.guestText);
  set("btnGoOn", t.goOn);
  set("btnCancel", t.cancel);
  set("btnContinue", t.continue);
  set("btnNew", t.newGame);
  set("btnOptions", t.options);
  set("btnExit", t.exit);
  set("avatarStatus", t.status);

  soundLabel.textContent = playing ? t.soundOn : t.soundOff;

  document.querySelectorAll(".back[data-back]").forEach(b => b.textContent = t.back);
  document.querySelectorAll(".lang-option").forEach(op =>
    op.setAttribute("aria-checked", op.dataset.lang === next ? "true" : "false"));

  if (document.getElementById("avatar").classList.contains("on")) {
    set("avatarName", t.guestName);
  }

  Language.save(next);
}

function openMenu(open) {
  langMenu.classList.toggle("open", open);
  langBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

langBtn.addEventListener("click", e => {
  e.stopPropagation();
  openMenu(!langMenu.classList.contains("open"));
});

document.querySelectorAll(".lang-option").forEach(op =>
  op.addEventListener("click", () => {
    applyLanguage(op.dataset.lang);
    openMenu(false);
  }));

document.addEventListener("click", () => openMenu(false));
document.addEventListener("keydown", e => { if (e.key === "Escape") openMenu(false); });

/* ---------- navigation ---------- */

function show(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("on"));
  document.getElementById(id).classList.add("on");

  const first = document.querySelector("#" + id + " button:not([hidden])");
  if (first) first.focus({ preventScroll: true });
}

document.getElementById("btnSignIn").addEventListener("click", () => show("viewSignIn"));
document.getElementById("btnSignUp").addEventListener("click", () => show("viewSignUp"));
document.getElementById("btnGuest") .addEventListener("click", () => show("viewGuest"));

document.querySelectorAll(".back[data-back]").forEach(b =>
  b.addEventListener("click", () => show(b.dataset.back)));

document.getElementById("btnCancel").addEventListener("click", () => show("viewAccess"));

document.getElementById("btnGoOn").addEventListener("click", () => {
  const avatar = document.getElementById("avatar");
  avatar.classList.add("on");
  Language.set("avatarName", TEXT[lang].guestName);
  show("viewMenu");
});

document.getElementById("btnExit").addEventListener("click", () => {
  document.getElementById("avatar").classList.remove("on");
  show("viewAccess");
});

document.getElementById("formSignIn").addEventListener("submit", e => e.preventDefault());
document.getElementById("formSignUp").addEventListener("submit", e => e.preventDefault());

/* ---------- game ---------- */

let saved = null;
try { saved = localStorage.getItem("sequel_save"); } catch (e) { /* ignore */ }
if (saved) document.getElementById("btnContinue").hidden = false;

/* The intro only plays on a new game: anyone continuing has
   already seen it. */
function start(mode) {
  if (mode === "continue") {
    window.location.href = "game/";
  } else {
    window.location.href = "intro.html";
  }
}

document.getElementById("btnNew")     .addEventListener("click", () => start("new"));
document.getElementById("btnContinue").addEventListener("click", () => start("continue"));
document.getElementById("btnOptions") .addEventListener("click", () => console.log("options"));

applyLanguage(lang);