/* Electronic HOUSE — panier, commande WhatsApp, inscription -10 %, cookies et mesure.
   Le site n'ouvre WhatsApp QUE quand on touche un bouton. */
(function () {
  "use strict";
  var CFG = window.EH || {};
  var WA = "https://wa.me/" + (CFG.wa || "2290159716716");
  var KEY = "eh_cart_v1", CK = "eh_consent_v2", POP = "eh_popup_v1";
  var EN = /^\/en(\/|$)/.test(location.pathname);
  var T = EN ? {
    cart: "Cart", empty: "Your cart is empty.", total: "Total", remove: "Remove", added: "Added ✓", add: "Add to cart",
    tick: "Tick the box to subscribe. Nothing is sent without it.",
    newsOk: "Thank you, you are subscribed. To get 10% off your first order, write « newsletter » in your WhatsApp message: Electronic HOUSE confirms the offer on WhatsApp. First order only, not combinable.",
    newsErr: "Saved on your side. If you do not receive our offers, write to us on WhatsApp.",
    ask: "Hello, I have a question about your products", sending: "Opening WhatsApp…",
    fallback: "If WhatsApp did not open, tap here", badEmail: "Please enter a valid email.", badTel: "Please enter your phone number.",
    unsubOk: "Done. You will no longer receive our email offers. Your orders are not deleted.",
    cookieTxt: "We use cookies needed for the cart. With your consent: audience measurement (Google Analytics) and advertising (Meta).",
    accept: "Accept", refuse: "Refuse", custom: "Customise", save: "Save my choices", needed: "Necessary (always on)", stats: "Audience measurement", ads: "Advertising (Meta)",
    more: "Cookie policy", popTitle: "-10% on your first order", popBtn: "Subscribe", close: "Close", mail: "Email",
    consent: "I agree to receive offers by email", privacy: "Privacy policy"
  } : {
    cart: "Panier", empty: "Votre panier est vide.", total: "Total", remove: "Supprimer", added: "Ajouté ✓", add: "Ajouter au panier",
    tick: "Cochez la case pour vous inscrire. Rien n'est envoyé sans elle.",
    newsOk: "Merci, votre inscription est enregistrée. Pour -10 % sur votre première commande, écrivez « inscription newsletter » dans votre message WhatsApp : Electronic HOUSE confirme l'offre sur WhatsApp. Première commande, non cumulable.",
    newsErr: "Demande notée. Si vous ne recevez pas nos offres, écrivez-nous sur WhatsApp.",
    ask: "Bonjour, j’ai une question sur vos produits", sending: "Ouverture de WhatsApp…",
    fallback: "Si WhatsApp ne s'est pas ouvert, touchez ici", badEmail: "Indiquez un email valide.", badTel: "Indiquez votre numéro de téléphone.",
    unsubOk: "C'est fait : vous ne recevrez plus nos offres par email. Vos commandes ne sont pas effacées.",
    cookieTxt: "Nous utilisons les cookies nécessaires au panier. Avec votre accord : mesure d'audience (Google Analytics) et publicité (Meta).",
    accept: "Accepter", refuse: "Refuser", custom: "Personnaliser", save: "Enregistrer mes choix", needed: "Nécessaires (toujours actifs)", stats: "Mesure d'audience", ads: "Publicité (Meta)",
    more: "Politique des cookies", popTitle: "-10 % sur votre première commande", popBtn: "M'inscrire", close: "Fermer", mail: "Email",
    consent: "J’accepte de recevoir des offres par email", privacy: "Politique de confidentialité"
  };
  var P = EN ? "/en" : "";
  function num(n) { return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  function money(n) { return num(n) + " FCFA"; }
  function money3(n) { return num(n) + " FCFA · ≈ " + num(n / 655.957) + " € · ≈ " + num(n / 600) + " $"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return null; }

  /* ---------- panier ---------- */
  var memCart = [];
  function load() { try { var c = JSON.parse(ls(KEY) || "[]"); return Array.isArray(c) ? c.filter(function (x) { return x && x.id && x.q > 0; }) : []; } catch (e) { return memCart; } }
  function save(c) { memCart = c; try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} paint(); }
  function count(c) { return c.reduce(function (s, x) { return s + (x.q || 0); }, 0); }
  function total(c) { return c.reduce(function (s, x) { return s + x.prix * x.q; }, 0); }
  function add(b) {
    var it = { id: b.getAttribute("data-id"), nom: b.getAttribute("data-nom"), prix: Number(b.getAttribute("data-prix")) || 0, etat: b.getAttribute("data-etat") || "", url: b.getAttribute("data-url") || "", q: 1 };
    if (!it.id) return;
    var c = load(), i = -1;
    for (var k = 0; k < c.length; k++) if (c[k].id === it.id) i = k;
    if (i >= 0) c[i].q = Math.min(99, c[i].q + 1); else c.push(it);
    save(c);
    var old = b.textContent; b.textContent = T.added; setTimeout(function () { b.textContent = old; }, 1100);
    toast(it.nom, count(load()));
    track("AddToCart", it.prix, it);
  }
  var toastT = 0;
  function toast(nom, n) {
    var t = document.getElementById("eh-toast");
    if (!t) { t = document.createElement("div"); t.id = "eh-toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.innerHTML = "<span>✓ " + esc(nom) + (EN ? " added to cart" : " ajouté au panier") + " (" + n + ")</span><a href=\"" + P + "/panier\">" + (EN ? "View cart" : "Voir le panier") + "</a>";
    t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }
  function setQ(id, q) { save(load().map(function (x) { if (x.id === id) x.q = Math.max(0, Math.min(99, q)); return x; }).filter(function (x) { return x.q > 0; })); }

  function paint() {
    var c = load(), n = count(c);
    var els = document.querySelectorAll("[data-cart-count]");
    for (var i = 0; i < els.length; i++) els[i].textContent = String(n);
    var view = document.getElementById("eh-cart-view");
    if (!view) return;
    if (!c.length) { view.innerHTML = "<p>" + T.empty + ' <a href="' + P + '/produits">' + (EN ? "See the catalogue" : "Voir le catalogue") + "</a></p>"; toggleCheckout(false); return; }
    var rows = c.map(function (x) {
      return '<tr data-id="' + esc(x.id) + '"><td><a href="' + esc(x.url || ("/p/" + x.id)) + '">' + esc(x.nom) + "</a><br><small>" + esc(x.etat) + " · " + money(x.prix) + '</small></td><td><span class="qty"><button type="button" data-q="-1" aria-label="−1">−</button><b>' + x.q + '</b><button type="button" data-q="1" aria-label="+1">+</button></span><br><button type="button" class="rm" data-rm>' + T.remove + "</button></td><td><b>" + money(x.prix * x.q) + "</b></td></tr>";
    }).join("");
    view.innerHTML = '<table class="cart"><tbody>' + rows + '</tbody><tfoot><tr><td colspan="2"><b>' + T.total + '</b></td><td><b>' + money(total(c)) + '</b><br><small>≈ ' + num(total(c) / 655.957) + " € · ≈ " + num(total(c) / 600) + " $</small></td></tr></tfoot></table>";
    toggleCheckout(true);
  }
  function toggleCheckout(on) { var f = document.getElementById("eh-checkout"); if (f) f.hidden = !on; }

  /* ---------- envoi au serveur (Google Sheet via /api/submit) ---------- */
  function post(data, ms) {
    return new Promise(function (resolve) {
      var done = false, ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (!done) { done = true; if (ctl) ctl.abort(); resolve(null); } }, ms || 3500);
      try {
        fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined, credentials: "same-origin" })
          .then(function (r) { return r.json(); }).then(function (j) { if (!done) { done = true; clearTimeout(t); resolve(j); } })
          .catch(function () { if (!done) { done = true; clearTimeout(t); resolve(null); } });
      } catch (e) { done = true; clearTimeout(t); resolve(null); }
    });
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function waOrderText(c, nom, email, tel, ville) {
    var lines = c.map(function (x) { return "- " + x.q + " x " + x.nom + " (" + x.etat + ", " + num(x.prix) + " FCFA)"; });
    if (EN) return "Hello, I would like to order:\n" + lines.join("\n") + "\nTotal: " + num(total(c)) + " FCFA\nName: " + nom + "\nEmail: " + email + "\nPhone: " + tel + "\nDelivery: " + (ville || "not specified") + "\nThis is a request. It becomes an order when Electronic HOUSE confirms on WhatsApp.";
    return "Bonjour, je souhaite commander :\n" + lines.join("\n") + "\nTotal : " + num(total(c)) + " FCFA\nNom : " + nom + "\nEmail : " + email + "\nTéléphone : " + tel + "\nLivraison : " + (ville || "non précisée") + "\nCeci est une demande. Elle devient une commande quand Electronic HOUSE confirme sur WhatsApp.";
  }
  var sending = false;
  function checkout(f) {
    var c = load(); if (!c.length || sending) return;
    var msg = f.querySelector(".msg");
    if (f.website && f.website.value) return;            // pot de miel rempli : robot
    var nom = f.nom.value.trim(), email = f.email.value.trim(), telRaw = f.tel.value.trim(), ville = f.ville.value.trim();
    if (!nom) { f.nom.focus(); return; }
    if (!EMAIL_RE.test(email)) { if (msg) msg.textContent = T.badEmail; f.email.focus(); return; }
    if (!/\d{6,}/.test(telRaw.replace(/\D/g, ""))) { if (msg) msg.textContent = T.badTel; f.tel.focus(); return; }
    var tel = f.code.value + " " + telRaw;
    var marketing = !!(f.offre && f.offre.checked);
    var text = waOrderText(c, nom, email, tel, ville);
    var url = WA + "?text=" + encodeURIComponent(text);
    sending = true;
    if (msg) msg.innerHTML = T.sending + ' <a href="' + esc(url) + '">' + T.fallback + "</a>";
    track("InitiateCheckout", total(c));
    var payload = { action: "order", name: nom, email: email, phone: tel, city: ville, marketing: marketing, website: "", page: location.href,
      total: total(c), items: c.map(function (x) { return { qty: x.q, name: x.nom, state: x.etat, price: x.prix }; }) };
    post(payload, 3500).then(function (j) {
      track("Purchase", total(c), null, j && j.number);
      save([]);                                          // panier vidé au moment où WhatsApp s'ouvre
      sending = false;
      location.href = url;                               // ouverture déclenchée par le bouton « Valider ma commande »
    });
  }

  /* ---------- inscription -10 % / désinscription ---------- */
  function news(f) {
    var msg = f.querySelector(".msg");
    if (f.website && f.website.value) return;
    var box = f.querySelector("[name=offre]");
    if (!box || !box.checked) { if (msg) msg.textContent = T.tick; return; }   // sans la case : rien n'est envoyé
    var email = (f.email.value || "").trim();
    if (!EMAIL_RE.test(email)) { if (msg) msg.textContent = T.badEmail; return; }
    var btn = f.querySelector("button[type=submit]"); if (btn) btn.disabled = true;
    post({ action: "newsletter", email: email, marketing: true, website: "", page: location.href }, 6000).then(function (j) {
      if (msg) msg.textContent = (j && j.ok) ? T.newsOk : T.newsErr;
      if (btn) btn.disabled = false;
      if (j && j.ok) { track("Lead", 0); ls(POP, "1"); }
    });
  }
  function unsub(f) {
    var msg = f.querySelector(".msg");
    if (f.website && f.website.value) return;
    var email = (f.email.value || "").trim();
    if (!EMAIL_RE.test(email)) { if (msg) msg.textContent = T.badEmail; return; }
    post({ action: "unsubscribe", email: email, website: "" }, 6000).then(function (j) {
      if (msg) msg.textContent = (j && j.ok) ? T.unsubOk : (EN ? "The request could not be sent. Write « STOP email » to us on WhatsApp." : "La demande n'a pas pu partir. Écrivez « STOP email » sur WhatsApp, nous le faisons pour vous.");
    });
  }
  function contactForm(f) {
    var t = (EN ? "Hello, " : "Bonjour, ") + (f.nom.value.trim() ? (EN ? "this is " : "je suis ") + f.nom.value.trim() + ". " : "") + f.message.value.trim();
    location.href = WA + "?text=" + encodeURIComponent(t);
  }

  /* ---------- cookies et mesure ---------- */
  function consent() { try { return JSON.parse(ls(CK) || "null"); } catch (e) { return null; } }
  function setConsent(c) { ls(CK, JSON.stringify(c)); var b = document.getElementById("eh-cookie"); if (b) b.remove(); applyConsent(c); setTimeout(popup, 12000); }
  function applyConsent(c) {
    if (!c) return;
    if (c.a && CFG.ga4 && !window.__ehGa) {
      window.__ehGa = 1;
      var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.ga4); document.head.appendChild(s);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date()); window.gtag("config", CFG.ga4, { anonymize_ip: true });
    }
    if (c.m && CFG.pixel && !window.__ehFb) {
      window.__ehFb = 1;
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", CFG.pixel); window.fbq("track", "PageView");
    }
    var pv = document.body && document.body.getAttribute("data-product");
    if (pv) { try { var d = JSON.parse(pv); track("ViewContent", d.price, d); } catch (e) {} }
  }
  function track(name, value, item, id) {
    var c = consent(); if (!c) return;
    var v = Number(value) || 0;
    if (c.a && window.gtag) {
      var map = { ViewContent: "view_item", AddToCart: "add_to_cart", InitiateCheckout: "begin_checkout", Lead: "generate_lead", Purchase: "purchase" };
      var p = { currency: "XOF", value: v };
      if (item) p.items = [{ item_id: item.id, item_name: item.nom || item.name, price: v }];
      if (id) p.transaction_id = id;
      window.gtag("event", map[name] || name, p);
    }
    if (c.m && window.fbq) window.fbq("track", name, { currency: "XOF", value: v, content_ids: item ? [item.id] : undefined, content_type: item ? "product" : undefined });
  }
  function cookieBar() {
    if (consent() || document.getElementById("eh-cookie")) return;
    var bar = document.createElement("div");
    bar.id = "eh-cookie"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Cookies");
    bar.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:90;background:#0d2137;color:#fff;padding:14px;border-radius:14px;box-shadow:0 6px 24px #0006;font:15px/1.45 system-ui,sans-serif;max-width:720px;margin:0 auto";
    var bs = "flex:1 1 30%;min-height:46px;border:2px solid #fff;background:#fff;color:#0d2137;border-radius:10px;font:700 15px system-ui,sans-serif;cursor:pointer";
    bar.innerHTML = '<p style="margin:0 0 10px">' + T.cookieTxt + ' <a style="color:#fff" href="' + P + '/politique-des-cookies">' + T.more + '</a></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-c="all" style="' + bs + '">' + T.accept + '</button><button type="button" data-c="none" style="' + bs + '">' + T.refuse + '</button><button type="button" data-c="custom" style="' + bs + '">' + T.custom + '</button></div><div id="eh-custom" hidden style="margin-top:10px"><label style="display:block;min-height:36px"><input type="checkbox" checked disabled> ' + T.needed + '</label><label style="display:block;min-height:36px"><input type="checkbox" id="eh-c-a"> ' + T.stats + '</label><label style="display:block;min-height:36px"><input type="checkbox" id="eh-c-m"> ' + T.ads + '</label><button type="button" data-c="save" style="' + bs + ';width:100%">' + T.save + "</button></div>";
    document.body.appendChild(bar);
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var k = b.getAttribute("data-c");
      if (k === "all") setConsent({ a: 1, m: 1, t: Date.now() });
      else if (k === "none") setConsent({ a: 0, m: 0, t: Date.now() });
      else if (k === "custom") document.getElementById("eh-custom").hidden = false;
      else if (k === "save") setConsent({ a: document.getElementById("eh-c-a").checked ? 1 : 0, m: document.getElementById("eh-c-m").checked ? 1 : 0, t: Date.now() });
    });
  }

  /* ---------- pop-up -10 % : une seule fois par navigateur, après 12 s ou en quittant ---------- */
  function popup() {
    if (ls(POP) || !consent() || document.getElementById("eh-pop") || document.getElementById("eh-checkout")) return;
    ls(POP, "1");
    var pop = document.createElement("div");
    pop.id = "eh-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "true"); pop.setAttribute("aria-label", T.popTitle);
    pop.style.cssText = "position:fixed;inset:0;z-index:95;background:rgba(5,15,30,.55);display:flex;align-items:flex-end;justify-content:center;font:15px/1.45 system-ui,sans-serif";
    pop.innerHTML = '<div style="background:#fff;color:#0d2137;padding:20px 18px 18px;border-radius:18px 18px 0 0;width:min(480px,100%);position:relative"><button type="button" data-x aria-label="' + T.close + '" style="position:absolute;top:6px;right:6px;width:48px;height:48px;font-size:26px;border:0;background:none;cursor:pointer">×</button><h2 style="font-size:20px;margin:0 0 10px">' + T.popTitle + '</h2><form class="eh-news" novalidate><input name="email" type="email" required autocomplete="email" placeholder="' + T.mail + '" style="width:100%;min-height:48px;font-size:16px;border:1px solid #b8c6d8;border-radius:10px;padding:10px"><label style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><input type="checkbox" name="offre" style="width:22px;height:22px;flex:0 0 22px"> <span>' + T.consent + ' — <a href="' + P + '/politique-de-confidentialite">' + T.privacy + '</a></span></label><input name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" style="position:absolute;left:-9999px"><button type="submit" style="width:100%;min-height:48px;border:0;border-radius:10px;background:#0d2137;color:#fff;font:700 16px system-ui,sans-serif">' + T.popBtn + '</button><p class="msg" aria-live="polite"></p></form></div>';
    document.body.appendChild(pop);
    function close() { pop.remove(); document.removeEventListener("keydown", esc1); }
    function esc1(e) { if (e.key === "Escape") close(); }
    pop.querySelector("[data-x]").onclick = close;
    pop.addEventListener("click", function (e) { if (e.target === pop) close(); });
    document.addEventListener("keydown", esc1);
  }

  /* ---------- montage ---------- */
  function mount() {
    if (!document.getElementById("eh-wa-float")) {
      var a = document.createElement("a");
      a.id = "eh-wa-float"; a.href = WA + "?text=" + encodeURIComponent(T.ask); a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", "WhatsApp +229 01 59 71 67 16");
      // accueil 3D : la bulle du chat IA occupe le coin droit -> bouton WhatsApp à gauche
      var side = document.querySelector(".eh3d") ? "left" : "right";
      a.style.cssText = "position:fixed;" + side + ":14px;bottom:14px;z-index:80;background:#1fae54;color:#fff;border-radius:999px;padding:13px 18px;font:700 16px system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 16px #0004;min-height:48px";
      a.textContent = "WhatsApp";
      document.body.appendChild(a);
    }
    if (!document.querySelector("[data-cart-count]")) {
      var cb = document.createElement("a");
      cb.id = "eh-cart-float"; cb.href = P + "/panier";
      cb.style.cssText = "position:fixed;right:14px;bottom:74px;z-index:80;background:#0d2137;color:#fff;border-radius:999px;padding:12px 16px;font:700 15px system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 16px #0004;min-height:46px";
      cb.innerHTML = T.cart + ' <span data-cart-count style="background:#fff;color:#0d2137;border-radius:999px;padding:0 7px">0</span>';
      document.body.appendChild(cb);
    }
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-add-cart]");
      if (b) { e.preventDefault(); if (!b.disabled) add(b); return; }
      var v = document.getElementById("eh-cart-view");
      if (v && v.contains(e.target)) {
        var row = e.target.closest("tr[data-id]"); if (!row) return;
        var id = row.getAttribute("data-id"), cur = load().filter(function (x) { return x.id === id; })[0];
        if (!cur) return;
        if (e.target.closest("[data-rm]")) setQ(id, 0);
        var q = e.target.closest("[data-q]"); if (q) setQ(id, cur.q + Number(q.getAttribute("data-q")));
      }
      var wb = e.target.closest && e.target.closest(".eh-wa-buy");
      if (wb) track("InitiateCheckout", Number(wb.getAttribute("data-prix")) || 0);
      if (e.target.closest && e.target.closest("[data-eh-cookies]")) { ls(CK, null); cookieBar(); }
    });
    document.addEventListener("submit", function (e) {
      var f = e.target;
      if (f.id === "eh-checkout") { e.preventDefault(); checkout(f); }
      else if (f.classList.contains("eh-news")) { e.preventDefault(); news(f); }
      else if (f.classList.contains("eh-unsub")) { e.preventDefault(); unsub(f); }
      else if (f.classList.contains("eh-contact")) { e.preventDefault(); contactForm(f); }
    });
    document.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY < 6) popup(); });
    var c = consent();
    if (c) { applyConsent(c); setTimeout(popup, 12000); } else cookieBar();
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
