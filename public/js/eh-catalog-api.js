/* Electronic HOUSE — Catalogue dynamique Phase 2
 * Remplace eh-catalog.js (filtrage statique) par des appels API.
 * API: https://eh-catalog.domingohoreb.workers.dev/api/v1/products
 * Params supportés: q, sous, prix (min-max), tri, page, per
 * - marque -> mappé sur q (recherche)
 * - etat -> "Licence" => type=logiciel ; autres => recherche dans categorie
 */
(function () {
  "use strict";
  var API = "https://eh-catalog.domingohoreb.workers.dev";
  var root = document.getElementById("eh-cat");
  if (!root) return;
  var f = document.getElementById("eh-filters");
  var pager = document.getElementById("eh-pager");
  var countEl = document.getElementById("eh-count");
  var PER = 24;
  var EN = /^\/en(\/|$)/.test(location.pathname);

  // --- URL params -> form ---
  var qs = new URLSearchParams(location.search);
  ["q", "marque", "etat", "sous", "prix", "tri"].forEach(function (k) {
    if (qs.get(k) && f.elements[k]) f.elements[k].value = qs.get(k);
  });
  // chips sous-catégorie : état visuel
  function syncChips() {
    var s = f.elements.sous ? f.elements.sous.value : "";
    document.querySelectorAll("[data-sous]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-sous") === s ? "true" : "false");
    });
  }
  syncChips();

  // --- Helpers ---
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtPrice(n) {
    n = Number(n) || 0;
    var fr = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    var eur = Math.round(n / 655.957);
    var usd = Math.round(n / 600);
    return fr + " FCFA<small>≈ " + eur + " € · ≈ " + usd + " $</small>";
  }
  function driveThumb(url, w) {
    if (!url) return "";
    var m = String(url).match(/[-\w]{25,}/);
    if (!m) return url;
    return "https://drive.google.com/thumbnail?id=" + m[0] + "&sz=w" + (w || 400);
  }
  function badgeFor(p) {
    if (p.type === "logiciel") return "Licence";
    if (p.type === "telephone") return "Téléphone";
    return p.categorie || "";
  }

  // --- Construction des params API ---
  function buildApiParams(page) {
    var p = new URLSearchParams();
    var q = (f.elements.q.value || "").trim();
    var marque = f.elements.marque.value || "";
    var etat = f.elements.etat.value || "";
    var sous = f.elements.sous.value || "";
    var prix = f.elements.prix.value || "";
    var tri = f.elements.tri.value || "";

    // q + marque combinés
    var terms = [];
    if (q) terms.push(q);
    if (marque) terms.push(marque);
    if (terms.length) p.set("q", terms.join(" "));

    // sous -> l'API le mappe déjà sur q/famille/categorie
    if (sous) p.set("sous", sous);

    // etat -> mapping pragmatique
    if (etat === "Licence") {
      p.set("type", "logiciel");
    } else if (etat) {
      // "Neuf scellé", "Occasion importée", etc. -> recherche texte
      var eterms = terms.slice();
      eterms.push(etat);
      p.set("q", eterms.join(" "));
    }

    // prix "min-max" -> prix_min/prix_max
    if (prix) {
      var a = prix.split("-");
      if (a[0]) p.set("prix_min", a[0]);
      if (a[1]) p.set("prix_max", a[1]);
    }

    if (tri) p.set("tri", tri);
    p.set("page", String(page || 1));
    p.set("per", String(PER));
    return p;
  }

  // --- Rendu d'une carte (même structure que le statique) ---
  function cardHtml(p) {
    var url = "/p/" + p.slug;
    var img = driveThumb(p.image || p.logo, 400);
    var alt = esc(p.nom) + " – affiche Electronic HOUSE";
    var badge = esc(badgeFor(p));
    return '<article class="card">' +
      '<a href="' + esc(url) + '"><img src="' + esc(img) + '" alt="' + alt + '" width="400" height="400" loading="lazy"></a>' +
      '<h3><a href="' + esc(url) + '" title="' + esc(p.nom) + '">' + esc(p.nom) + '</a></h3>' +
      '<span class="badge">' + badge + '</span>' +
      '<p class="p">' + fmtPrice(p.prix) + '</p>' +
      '<button type="button" class="btn btn-cart" data-add-cart data-id="' + esc(p.slug) + '" data-nom="' + esc(p.nom) + '" data-prix="' + esc(p.prix) + '" data-etat="' + badge + '" data-url="' + esc(url) + '" aria-label="Ajouter au panier : ' + esc(p.nom) + '">+ Panier</button>' +
      '</article>';
  }

  // --- Chargement ---
  var currentPage = 1;
  var loading = false;

  function load(page, pushState) {
    if (loading) return;
    loading = true;
    currentPage = page || 1;
    root.innerHTML = '<p class="loading" style="grid-column:1/-1;text-align:center;padding:40px;opacity:.6">' +
      (EN ? "Loading products…" : "Chargement des produits…") + '</p>';
    if (pager) pager.innerHTML = "";
    if (countEl) countEl.textContent = EN ? "…" : "…";

    var apiParams = buildApiParams(currentPage);
    fetch(API + "/api/v1/products?" + apiParams.toString())
      .then(function (r) {
        if (!r.ok) throw new Error("API " + r.status);
        return r.json();
      })
      .then(function (d) {
        var items = d.items || [];
        var total = d.total || 0;
        var pages = d.pages || 1;

        if (!items.length) {
          root.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;opacity:.6">' +
            (EN ? "No products found." : "Aucun produit trouvé.") + '</p>';
        } else {
          root.innerHTML = items.map(cardHtml).join("");
        }

        if (countEl) countEl.textContent = total + (EN ? " products" : " produits");

        // pagination
        if (pager) {
          var h = "";
          if (pages > 1) {
            for (var i = 1; i <= pages; i++) {
              // Fenêtre de pagination : 1 … current-2..current+2 … last
              if (i === 1 || i === pages || Math.abs(i - currentPage) <= 2) {
                h += '<button type="button" data-p="' + i + '"' + (i === currentPage ? ' aria-current="true"' : "") + ">" + i + "</button>";
              } else if (h.slice(-3) !== "…") {
                h += '<span aria-hidden="true">…</span>';
              }
            }
          }
          pager.innerHTML = h;
        }

        // sync URL
        var up = new URLSearchParams();
        ["q", "marque", "etat", "sous", "prix", "tri"].forEach(function (k) {
          if (f.elements[k] && f.elements[k].value) up.set(k, f.elements[k].value);
        });
        if (currentPage > 1) up.set("page", currentPage);
        var newUrl = location.pathname + (up.toString() ? "?" + up : "");
        if (pushState !== false) history.replaceState(null, "", newUrl);

        root.scrollIntoView({ behavior: "smooth", block: "start" });
        loading = false;
      })
      .catch(function (err) {
        loading = false;
        root.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#c00">' +
          (EN ? "Error loading products. " : "Erreur de chargement. ") +
          '<button type="button" onclick="location.reload()" style="text-decoration:underline">' +
          (EN ? "Retry" : "Réessayer") + '</button></p>';
        if (countEl) countEl.textContent = EN ? "error" : "erreur";
      });
  }

  // --- Events ---
  var debounce = null;
  f.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () { syncChips(); load(1); }, 400);
  });
  f.addEventListener("change", function () { syncChips(); load(1); });
  f.addEventListener("submit", function (e) { e.preventDefault(); syncChips(); load(1); });
  if (pager) {
    pager.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      load(Number(b.getAttribute("data-p")));
    });
  }
  document.querySelectorAll("[data-sous]").forEach(function (b) {
    b.addEventListener("click", function () {
      f.elements.sous.value = b.getAttribute("data-sous");
      syncChips();
      load(1);
    });
  });

  // Page initiale depuis ?page=
  var initPage = parseInt(qs.get("page") || "1", 10) || 1;
  load(initPage, false);
})();
