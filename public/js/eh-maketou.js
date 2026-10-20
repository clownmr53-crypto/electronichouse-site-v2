/* Electronic HOUSE x Maketou: "Acheter sur Maketou" only for mapped products.
   Click -> eh-maketou worker creates order + Maketou checkout -> redirect; fallback = plain Maketou product page. */
(function () {
  var API = "https://eh-maketou.domingohoreb.workers.dev/maketou/checkout";
  var EN = (document.documentElement.lang || "").indexOf("en") === 0;
  function ok(u) { return /^https:\/\/electronic-house\.mymaketou\.shop\//.test(u || ""); }
  function go(id, url, a) {
    a.setAttribute("aria-busy", "true"); a.textContent = EN ? "Opening payment…" : "Ouverture du paiement…";
    var done = false, t = setTimeout(function () { if (!done) { done = true; location.href = url; } }, 8000);
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ catalog_id: id }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (done) return; done = true; clearTimeout(t); location.href = d && d.ok && /^https:\/\//.test(d.url) ? d.url : url; })
      .catch(function () { if (!done) { done = true; clearTimeout(t); location.href = url; } });
  }
  var links = null;
  function scan() {
    if (!links) return;
    document.querySelectorAll("[data-add-cart][data-id]").forEach(function (b) {
      var id = b.getAttribute("data-id"), u = links[id];
      if (!ok(u) || b.parentNode.querySelector(".btn-maketou")) return;
      var a = document.createElement("a");
      a.className = "btn btn-maketou"; a.href = u; a.rel = "noopener";
      a.textContent = EN ? "Buy on Maketou" : "Acheter sur Maketou";
      a.style.cssText = "background:#ff6a00;color:#fff;margin-left:6px";
      a.addEventListener("click", function (ev) { if (ev.ctrlKey || ev.metaKey) return; ev.preventDefault(); go(id, u, a); });
      b.insertAdjacentElement("afterend", a);
    });
  }
  fetch("/maketou-links.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (m) {
    if (!m || typeof m !== "object") return;
    links = m;
    scan();
    /* Phase 2 (/produits dynamique) : la grille #eh-cat est remplie APRES un fetch API et
       re-rendue a chaque filtre/pagination -> le scan unique arrivait avant les cartes et
       elles n'avaient jamais le bouton. On observe donc le DOM et on re-scanne (debounce
       200 ms) apres chaque mutation. scan() reste idempotent grace a la garde existante
       (parent contient deja .btn-maketou) : aucun doublon possible. */
    if (window.MutationObserver && document.body) {
      var pending = null;
      var obs = new MutationObserver(function () {
        clearTimeout(pending);
        pending = setTimeout(scan, 200);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }).catch(function () {});
})();
