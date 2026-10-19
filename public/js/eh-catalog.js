/* Catalogue : recherche, filtres, tri et pagination côté navigateur. Chaque produit garde son lien /p/ dans le HTML. */
(function () {
  "use strict";
  var root = document.getElementById("eh-cat"); if (!root) return;
  var cards = Array.prototype.slice.call(root.querySelectorAll(".card"));
  var f = document.getElementById("eh-filters");
  var pager = document.getElementById("eh-pager"), countEl = document.getElementById("eh-count");
  var PER = 24, page = 1;
  var EN = /^\/en(\/|$)/.test(location.pathname);
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  var qs = new URLSearchParams(location.search);
  ["q", "marque", "etat", "sous", "prix", "tri"].forEach(function (k) { if (qs.get(k) && f.elements[k]) f.elements[k].value = qs.get(k); });
  function run(keepPage) {
    var q = norm(f.elements.q.value), m = f.elements.marque.value, e = f.elements.etat.value, s = f.elements.sous.value, pr = f.elements.prix.value, tri = f.elements.tri.value;
    var lo = 0, hi = Infinity;
    if (pr) { var a = pr.split("-"); lo = Number(a[0]) || 0; hi = a[1] ? Number(a[1]) : Infinity; }
    var list = cards.filter(function (c) {
      var d = c.dataset;
      if (q && norm(d.name).indexOf(q) < 0) return false;
      if (m && d.brand !== m) return false;
      if (e && d.etat !== e) return false;
      if (s && d.sub !== s) return false;
      var p = Number(d.price); if (p < lo || p > hi) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (tri === "asc") return a.dataset.price - b.dataset.price;
      if (tri === "desc") return b.dataset.price - a.dataset.price;
      if (tri === "new") return Number(b.dataset.rank) - Number(a.dataset.rank);
      return Number(a.dataset.rank0) - Number(b.dataset.rank0);
    });
    if (!keepPage) page = 1;
    var pages = Math.max(1, Math.ceil(list.length / PER)); if (page > pages) page = pages;
    cards.forEach(function (c) { c.hidden = true; });
    list.forEach(function (c, i) { root.appendChild(c); c.hidden = !(i >= (page - 1) * PER && i < page * PER); });
    countEl.textContent = list.length + (EN ? " products" : " produits");
    var h = "";
    if (pages > 1) for (var i = 1; i <= pages; i++) h += '<button type="button" data-p="' + i + '"' + (i === page ? ' aria-current="true"' : "") + ">" + i + "</button>";
    pager.innerHTML = h;
    var params = new URLSearchParams();
    ["q", "marque", "etat", "sous", "prix", "tri"].forEach(function (k) { if (f.elements[k].value) params.set(k, f.elements[k].value); });
    history.replaceState(null, "", location.pathname + (params.toString() ? "?" + params : ""));
  }
  f.addEventListener("input", function () { run(false); });
  f.addEventListener("change", function () { run(false); });
  f.addEventListener("submit", function (e) { e.preventDefault(); run(false); });
  pager.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; page = Number(b.getAttribute("data-p")); run(true); root.scrollIntoView({ behavior: "smooth", block: "start" }); });
  document.querySelectorAll("[data-sous]").forEach(function (b) {
    b.addEventListener("click", function () { f.elements.sous.value = b.getAttribute("data-sous"); document.querySelectorAll("[data-sous]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); run(false); });
  });
  run(false);
})();
