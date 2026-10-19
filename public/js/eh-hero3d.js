/* Catalogue : iPhone 3D en rotation (même modèle que l'accueil), jamais bloquant.
   Appareil modeste (≤ 4 cœurs, ≤ 3 Go, économie de données, processeur lent, ou 3D sous 30 i/s) : image fixe du même iPhone + cube CSS.
   ?lite=1 force l'image fixe, ?lite=0 force la 3D (tests). */
(function () {
  var box = document.querySelector(".bg3d .mvw");
  var el = box && box.querySelector("model-viewer");
  if (!el) return;
  var q = location.search.match(/[?&]lite=([01])/), forced = q ? q[1] === "1" : null, swapped = false;
  function remember() { try { sessionStorage.setItem("eh-lite", "1"); } catch (e) {} }
  function lowEnd() {
    if (forced !== null) return forced;
    try { if (sessionStorage.getItem("eh-lite") === "1") return true; } catch (e) {}
    var n = navigator, c = n.connection || {};
    if (c.saveData || /2g$/.test(c.effectiveType || "")) return true;
    if (n.hardwareConcurrency && n.hardwareConcurrency <= 4) return true;
    if (n.deviceMemory && n.deviceMemory <= 3) return true;
    try { var cv = document.createElement("canvas"); if (!(cv.getContext("webgl2") || cv.getContext("webgl"))) return true; } catch (e) { return true; }
    return false;
  }
  function toStatic() {
    if (swapped) return; swapped = true;
    var img = new Image(); img.alt = ""; img.decoding = "async"; img.src = "/models/static/hero_iphone13.webp";
    box.replaceChild(img, el); el = null; // model-viewer retiré du DOM : plus aucun rendu WebGL
  }
  function fps(ms, cb) {
    var n = 0, t0 = 0;
    function f(t) { if (!t0) t0 = t; n++; if (t - t0 < ms) requestAnimationFrame(f); else cb((n - 1) * 1000 / Math.max(t - t0, 1)); }
    requestAnimationFrame(f);
  }
  // mini-test processeur (~4 ms sur PC récent) : au-delà de 8 ms, appareil trop lent pour la 3D
  function slowCpu() {
    var best = 1e9;
    for (var r = 0; r < 3; r++) { var t = performance.now(), x = 0; for (var i = 0; i < 1e5; i++) x += Math.sqrt(i) * Math.sin(i); best = Math.min(best, performance.now() - t); if (x === 1) best = 0; }
    return best > 8;
  }
  function idle(cb) { if ("requestIdleCallback" in window) requestIdleCallback(cb, { timeout: 2500 }); else setTimeout(cb, 1200); }
  // suit le défilement (transform seulement, une fois par image)
  var tick = false;
  window.addEventListener("scroll", function () {
    if (tick) return; tick = true;
    requestAnimationFrame(function () { tick = false; box.style.transform = "translate3d(0," + (Math.sin(window.scrollY / 600) * 12).toFixed(1) + "px,0)"; });
  }, { passive: true });
  if (lowEnd()) { toStatic(); return; }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.removeAttribute("auto-rotate");
  // onglet caché : plus de rotation (aucun rendu) ; reprise au retour
  document.addEventListener("visibilitychange", function () {
    if (!el || !el.hasAttribute) return;
    if (document.hidden) { el.dataset.rot = el.hasAttribute("auto-rotate") ? "1" : ""; el.removeAttribute("auto-rotate"); }
    else if (el.dataset.rot) el.setAttribute("auto-rotate", "");
  });
  function load() {
    self.ModelViewerElement = self.ModelViewerElement || {};
    self.ModelViewerElement.meshoptDecoderLocation = "/js/meshopt_decoder.js";
    var s = document.createElement("script"); s.type = "module"; s.src = "/js/model-viewer.min.js"; document.head.appendChild(s);
    // garde-fou : si la 3D fait tomber sous 30 i/s, image fixe
    if (forced === null) el.addEventListener("load", function () {
      var n = 0, bad = 0;
      function check() {
        fps(2000, function (f) {
          if (swapped) return;
          bad = !document.hidden && f < 30 ? bad + 1 : 0;
          if (!document.hidden && (f < 20 || bad >= 2)) { remember(); toStatic(); }
          else if (++n < 6) setTimeout(check, 500);
        });
      }
      setTimeout(check, 1000);
    }, { once: true });
  }
  function start() {
    idle(function () {
      if (forced !== null) return load();
      if (slowCpu()) { remember(); toStatic(); } else load();
    });
  }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
})();
