/* ============================================================
   language.js · language choice, shared across pages
   Holds the mechanism only. The strings live in each page's
   own script, since they are page content.
   ============================================================ */

const Language = (() => {

  const KEY = "sequel_lang";
  const FALLBACK = "es";

  /* Stored choice, or the browser's language if it is one we
     support, or Spanish. */
  function current(supported = ["es", "en"]) {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && supported.includes(saved)) return saved;
    } catch (e) { /* private mode: carry on */ }

    const browser = (navigator.language || "").slice(0, 2).toLowerCase();
    return supported.includes(browser) ? browser : FALLBACK;
  }

  function save(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
    document.documentElement.lang = lang;
  }

  /* Writes text into an element by id, quietly skipping ids
     that are not on this page. */
  function set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  return { current, save, set };

})();
