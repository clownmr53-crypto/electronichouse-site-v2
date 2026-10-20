// Electronic HOUSE — Cloudflare Pages (_worker.js), version du 04/10/2026 ; restauré le 20/10/2026 (perdu lors du passage au dépôt GitHub).
// Fichiers de vérification (Google, Bing, Yandex, Naver) -> contenu exact
// Google Merchant Center / Search Console (06/10/2026) : sans redéployer, poser le jeton en KV (EH_KV) :
//   site:google_verif_meta  = valeur(s) content="..." de la balise <meta name="google-site-verification"> (séparées par espace) -> injectée dans <head> de l'accueil
//   site:google_verif_files = nom(s) de fichier googleXXXXXXXXXXXXXXXX.html (séparés par espace) -> servi(s) à la racine
// /api/chat, /inbox*  -> worker eh-whatsapp (liaison BOT)
// /img/*, /feeds/*    -> worker eh-catalog (liaison CATALOG)
// /tt/m/<id>.<ext>   -> médias du miroir TikTok (KV tt:m:<id>, écrits par eh-facebook, TTL 2 j) ; préfixe vérifié chez TikTok, jamais de redirection
// /ig/k/<c>/<id>.jpg -> robot Instagram (06/10/2026) : affiches/photos déjà en KV (liste blanche de préfixes, lecture seule)
// /api/submit         -> Google Apps Script (Sheet "Commandes"/"Newsletter"), URL dans APPS_SCRIPT_URL ou KV site:apps_script_url
// /studio*           -> worker eh-facebook (Electronic HOUSE Studio TikTok + OAuth TikTok), liaison FB ; jeton/KV restent dans eh-facebook
// le reste            -> fichiers statiques (pages /p/<id> générées, sitemap, robots), 404 propre sinon.
// Ce worker ne redirige JAMAIS vers WhatsApp : seuls les boutons du site le font.
const BOT_ORIGIN = "https://eh-whatsapp.domingohoreb.workers.dev";
const VERIF = {"/naverb15fec6eddf6694517699616b9c7efdc.html": ["naver-site-verification: naverb15fec6eddf6694517699616b9c7efdc.html", "text/html; charset=utf-8"], "/yandex_c99a6aa691b85dea.html": ["<html>\n    <head>\n        <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">\n    </head>\n    <body>Verification: c99a6aa691b85dea</body>\n</html>", "text/html; charset=utf-8"], "/BingSiteAuth.xml": ["<?xml version=\"1.0\"?>\n<users>\n\t<user>33090AE020D2FAD88864055BC2F7EEB5</user>\n</users>", "application/xml; charset=utf-8"]};
VERIF["/google90da190dccd423ca.html"] = ["google-site-verification: google90da190dccd423ca.html", "text/html; charset=utf-8"];
const MOVED = {
  "/retours": "/retours-garantie",
  "/mentions": "/mentions-legales",
  "/conditions": "/conditions-de-vente",
  "/confidentialite": "/politique-de-confidentialite",
  "/cookies": "/politique-des-cookies",
  "/p/tel-iphone-14-pro-256go-venu-haut": "/p/tel-iphone-14-pro-256go-venu-bas", // ancienne ligne du catalogue Meta
  "/en/retours": "/en/retours-garantie",
  "/en/mentions": "/en/mentions-legales",
  "/en/conditions": "/en/conditions-de-vente",
  "/en/confidentialite": "/en/politique-de-confidentialite",
  "/en/cookies": "/en/politique-des-cookies",
};
const FB_ORIGIN = "https://eh-facebook.domingohoreb.workers.dev";
// /studio -> /tiktok/compose · /studio/<x> -> /tiktok/compose/<x> · /studio/tiktok/{start,callback,media/<id>} -> /tiktok/... (06/10/2026)
async function studio(req, env, url, p) {
  let t = null;
  if (p === "/studio" || p === "/studio/") t = "/tiktok/compose";
  else if (p.startsWith("/studio/tiktok/")) { t = p.slice(7); if (!/^\/tiktok\/(start|callback|media\/[A-Za-z0-9]{8,40})$/.test(t)) t = null; }
  else if (/^\/studio\/[A-Za-z0-9/_-]{1,80}$/.test(p)) t = "/tiktok/compose" + p.slice(7);
  if (!t) return notFound(env, url);
  const o = req.headers.get("Origin"), sfs = req.headers.get("Sec-Fetch-Site");
  if (req.method === "POST" && (sfs === "cross-site" || (o && o !== "null" && o !== url.origin))) return new Response("Forbidden", { status: 403 });
  const h = new Headers(req.headers);
  h.set("x-eh-studio-base", "/studio"); h.delete("x-eh-internal"); h.delete("Referer");
  if (o) h.set("Origin", FB_ORIGIN);
  const init = { method: req.method, headers: h, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual" };
  const target = FB_ORIGIN + t + url.search;
  const r = env.FB ? await env.FB.fetch(new Request(target, init)) : await fetch(target, init);
  const out = new Response(r.body, r);
  const loc = out.headers.get("Location");
  if (loc && loc.startsWith(FB_ORIGIN)) out.headers.set("Location", loc.slice(FB_ORIGIN.length) || "/");
  out.headers.set("X-Robots-Tag", "noindex");
  return out;
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

function sameOrigin(req, url) {
  const o = req.headers.get("Origin");
  const sfs = req.headers.get("Sec-Fetch-Site");
  if (sfs && sfs !== "same-origin" && sfs !== "none") return false;
  if (o && o !== url.origin) return false;
  return true;
}

async function submit(req, env, url) {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  if (!sameOrigin(req, url)) return json({ ok: false, error: "forbidden" }, 403);
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > 8192) return json({ ok: false, error: "too_large" }, 413);
  const raw = await req.text();
  if (raw.length > 8192) return json({ ok: false, error: "too_large" }, 413);
  let data;
  try { data = JSON.parse(raw); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return json({ ok: false, error: "bad_json" }, 400);
  if (data.website) return json({ ok: true, number: null }); // pot de miel : on fait semblant
  let target = env.APPS_SCRIPT_URL || "";
  if (!target && env.EH_KV) { try { target = (await env.EH_KV.get("site:apps_script_url")) || ""; } catch {} }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(target.trim())) return json({ ok: false, error: "not_configured" }, 503);
  data.ip = req.headers.get("CF-Connecting-IP") || "";
  data.token = env.EH_SUBMIT_SECRET || "";
  try {
    const r = await fetch(target.trim(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data), redirect: "follow" });
    const t = await r.text();
    let o;
    try { o = JSON.parse(t); } catch { return json({ ok: false, error: "upstream" }, 502); }
    return json({ ok: !!o.ok, number: o.number || null, error: o.ok ? undefined : String(o.error || "refused").slice(0, 40) }, o.ok ? 200 : 400);
  } catch {
    return json({ ok: false, error: "upstream" }, 502);
  }
}

async function notFound(env, url) {
  const r = await env.ASSETS.fetch(new Request(new URL(url.pathname.startsWith("/en/") ? "/404" : "/404", url)));
  return new Response(r.ok ? r.body : "404", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// Miroir TikTok (06/10/2026) : TikTok télécharge ici (PULL_FROM_URL) les images/vidéos des posts. Lecture seule du KV.
async function ttMedia(req, env, p) {
  const id = p.slice(6).replace(/\.(jpe?g|webp|mp4|mov)$/i, "");
  if (!/^[a-z0-9]{8,40}$/i.test(id) || !env.EH_KV) return new Response("not found", { status: 404 });
  const { value, metadata } = await env.EH_KV.getWithMetadata("tt:m:" + id, { type: "arrayBuffer" });
  if (!value) return new Response("not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const type = (metadata && metadata.mime) || "image/jpeg";
  const size = value.byteLength;
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("Range") || "");
  if (m && (m[1] || m[2])) {
    let a = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])), b = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (a >= size || a > b) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(req.method === "HEAD" ? null : value.slice(a, b + 1), { status: 206, headers: { ...base, "Content-Range": `bytes ${a}-${b}/${size}`, "Content-Length": String(b - a + 1) } });
  }
  return new Response(req.method === "HEAD" ? null : value, { headers: { ...base, "Content-Length": String(size) } });
}

// Robot Instagram (06/10/2026) : Meta télécharge ici (image_url) les affiches déjà rendues en KV — aucune copie.
// Seuls ces préfixes sont lisibles : b=fb:poster:bcol: o=fb:poster:own: m=fb:poster:brand: s=fb:poster:safe: p=fb:phone_img:
const IG_KEYS = { b: "fb:poster:bcol:", o: "fb:poster:own:", m: "fb:poster:brand:", s: "fb:poster:safe:", p: "fb:phone_img:" };
async function igMedia(req, env, p) {
  const m = /^\/ig\/k\/([bomsp])\/([^/]{1,120})\.jpg$/.exec(p);
  let id = null; try { id = m && decodeURIComponent(m[2]); } catch {}
  if (!m || !id || !/^[a-z0-9:._-]{1,100}$/i.test(id) || !env.EH_KV) return new Response("not found", { status: 404 });
  const value = await env.EH_KV.get(IG_KEYS[m[1]] + id, { type: "arrayBuffer" });
  if (!value) return new Response("not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(req.method === "HEAD" ? null : value, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(value.byteLength), "Cache-Control": "public, max-age=3600", "X-Robots-Tag": "noindex" } });
}


// Vérification Google pilotée par KV (06/10/2026) — voir en-tête. Lecture seule, valeurs filtrées.
async function kvList(env, key, re) {
  try { const v = env.EH_KV ? await env.EH_KV.get(key) : null; return String(v || "").split(/[\s,]+/).filter((x) => re.test(x)).slice(0, 5); } catch { return []; }
}
async function googleVerifFile(env, p) {
  const name = p.slice(1);
  const files = await kvList(env, "site:google_verif_files", /^google[0-9a-f]{8,32}\.html$/);
  if (!files.includes(name)) return null;
  return new Response("google-site-verification: " + name, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });
}
async function withGoogleMeta(env, res) {
  if (res.status !== 200) return res;
  const tags = await kvList(env, "site:google_verif_meta", /^[A-Za-z0-9_-]{20,100}$/);
  if (!tags.length) return res;
  const html = tags.map((t) => `<meta name="google-site-verification" content="${t}">`).join("");
  return new HTMLRewriter().on("head", { element(e) { e.prepend(html, { html: true }); } }).transform(res);
}

// ---- V7 Centre de contrôle (14/10/2026) : réglages du site en KV (site:cfg:live, écrits par eh-relay depuis le tableau de bord)
// + compteur de visites / clics WhatsApp -> eh-relay /site/hit (liaison RELAY). Sans clé KV : site inchangé.
const ORIG = { wa_main: "2290159716716", wa_second: "2290153632000", phone: "+2290153632000", delivery_text: "Livraison partout au Bénin et dans le monde" };
let CFG = null, CFG_AT = 0, HITK = null;
async function siteCfg(env) {
  if (CFG_AT > Date.now() - 30000) return CFG;
  try { CFG = env.EH_KV ? await env.EH_KV.get("site:cfg:live", "json") : null; HITK = env.EH_KV ? await env.EH_KV.get("site:hit_key") : null; } catch { }
  CFG_AT = Date.now(); return CFG;
}
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|curl|wget|python|headless|lighthouse|monitor/i;
function logHit(req, env, ctx, kind, path) {
  try {
    if (!env.RELAY || !HITK || BOTS.test(req.headers.get("user-agent") || "")) return;
    const ua = req.headers.get("user-agent") || "", ref = (() => { try { return new URL(req.headers.get("referer") || "").hostname; } catch { return ""; } })();
    const body = JSON.stringify({ kind, path, country: (req.cf && req.cf.country) || "", ref, device: /mobi|android|iphone/i.test(ua) ? "mobile" : "ordinateur" });
    const pr = env.RELAY.fetch("https://eh-relay.internal/site/hit", { method: "POST", headers: { "content-type": "application/json", "x-eh-hit": HITK }, body }).catch(() => { });
    if (ctx && ctx.waitUntil) ctx.waitUntil(pr);
  } catch { }
}
const TRACK = `<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest('a[href*="wa.me"],a[href*="whatsapp.com"],a[href*="api.whatsapp"]');if(!a)return;try{navigator.sendBeacon("/api/hit",new Blob([JSON.stringify({kind:"wa",path:location.pathname})],{type:"application/json"}))}catch(x){}},true)</script>`;
function applyCfg(html, c) {
  const esc = (t) => String(t || "").replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x]);
  let css = "";
  if (c) {
    for (const r of c.replacements || []) if (r.from && r.from.length >= 3) html = html.split(r.from).join(r.to || "");
    if (c.delivery_text && c.delivery_text !== ORIG.delivery_text) html = html.split(ORIG.delivery_text).join(esc(c.delivery_text));
    if (c.phone && c.phone !== ORIG.phone) html = html.split("tel:" + ORIG.phone).join("tel:" + c.phone);
    if (c.wa_main && c.wa_main !== ORIG.wa_main) html = html.split("wa.me/" + ORIG.wa_main).join("wa.me/" + c.wa_main);
    if (c.wa_second && c.wa_second !== ORIG.wa_second) html = html.split("wa.me/" + ORIG.wa_second).join("wa.me/" + c.wa_second);
    if (c.show_prices === false) css += ".p,.price,p.price,.eh-price{display:none!important}";
    for (const id of c.hidden_products || []) if (/^[a-z0-9-]+$/.test(id)) css += `article.card:has(a[href="/p/${id}"]),article:has(a[href="/p/${id}"]){display:none!important}`;
    if (c.banner_on && c.banner_text) { css += "header.fixed,header[class*=fixed]{top:34px!important}body{padding-top:34px}"; html = html.replace(/<body([^>]*)>/i, (m) => m + `<div id="eh-banner" style="position:fixed;top:0;left:0;right:0;z-index:9999;height:34px;line-height:34px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-align:center;font:600 14px system-ui,sans-serif;color:#fff;background:${/^#[0-9a-f]{3,8}$/i.test(c.banner_color) ? c.banner_color : "#2f7bff"};padding:0 10px">${esc(c.banner_text)}</div>`); }
  }
  const inj = (css ? `<style id="eh-cfg">${css}</style>` : "") + TRACK;
  return html.replace(/<\/head>/i, inj + "</head>");
}
async function withCfg(req, env, ctx, res, p) {
  const ct = res.headers.get("content-type") || "";
  if (req.method !== "GET" || res.status !== 200) return res;
  if (p === "/js/eh-config.js") { const c = await siteCfg(env); if (!c) return res; let t = await res.text(); if (c.wa_main) t = t.split('"' + ORIG.wa_main + '"').join('"' + c.wa_main + '"'); if (c.wa_second) t = t.split('"' + ORIG.wa_second + '"').join('"' + c.wa_second + '"'); const h = new Headers(res.headers); h.delete("content-length"); h.set("cache-control", "no-cache"); return new Response(t, { status: 200, headers: h }); }
  if (!ct.includes("text/html")) return res;
  const c = await siteCfg(env); logHit(req, env, ctx, "view", p.replace(/\.html$/, "") || "/");
  const raw = await res.text(); const t = raw.includes("navigator.sendBeacon(\"/api/hit\"") ? raw : applyCfg(raw, c); /* pages du dépôt déjà rendues (bannière + suivi) : pas de double injection */ const h = new Headers(res.headers); h.delete("content-length"); h.delete("etag"); h.set("cache-control", "no-cache");
  return new Response(t, { status: 200, headers: h });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (p === "/api/hit" && req.method === "POST") { await siteCfg(env); const b = await req.json().catch(() => ({})); logHit(req, env, ctx, "wa", String(b.path || "/").slice(0, 200)); return new Response(null, { status: 204 }); }
    if (p.startsWith("/p/")) { const c = await siteCfg(env); const id = p.slice(3).replace(/\.html$/, "").replace(/\/$/, ""); if (c && (c.hidden_products || []).includes(id)) return notFound(env, url); }
    if (VERIF[p]) return new Response(VERIF[p][0], { headers: { "Content-Type": VERIF[p][1] } });
    if (/^\/google[0-9a-f]{8,32}\.html$/.test(p)) { const r = await googleVerifFile(env, p); if (r) return r; }
    if (MOVED[p]) return Response.redirect(new URL(MOVED[p] + url.search, url).toString(), 301);
    if (p === "/api/submit") return submit(req, env, url);
    if (p === "/inbox" || p.startsWith("/inbox/")) {
      const target = new URL(p + url.search, BOT_ORIGIN);
      const h = new Headers(req.headers);
      const o = req.headers.get("Origin");
      const sfs = req.headers.get("Sec-Fetch-Site");
      if (req.method === "POST" && (sfs === "cross-site" || (o && o !== "null" && o !== url.origin))) return new Response("Forbidden", { status: 403 });
      if (o) h.set("Origin", BOT_ORIGIN);
      h.delete("Referer");
      const r = await env.BOT.fetch(new Request(target, { method: req.method, headers: h, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual" }));
      const out = new Response(r.body, r);
      const loc = out.headers.get("Location");
      if (loc && loc.startsWith(BOT_ORIGIN)) out.headers.set("Location", loc.slice(BOT_ORIGIN.length) || "/");
      return out;
    }
    if (p === "/api/chat") {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      const o = req.headers.get("Origin");
      if (o && o !== url.origin) return new Response("Forbidden", { status: 403 });
      const body = await req.text();
      if (body.length > 12000) return new Response("Too Large", { status: 413 });
      const h = new Headers({ "Content-Type": "application/json", Origin: url.origin, "CF-Connecting-IP": req.headers.get("CF-Connecting-IP") || "" });
      const r = await env.BOT.fetch(new Request(BOT_ORIGIN + "/site-chat", { method: "POST", headers: h, body }));
      return new Response(r.body, { status: r.status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (p === "/studio" || p.startsWith("/studio/")) return studio(req, env, url, p);
    if (p.startsWith("/tt/m/") && (req.method === "GET" || req.method === "HEAD")) return ttMedia(req, env, p);
    if (p.startsWith("/ig/k/") && (req.method === "GET" || req.method === "HEAD")) return igMedia(req, env, p);
    if (p.startsWith("/img/") || p.startsWith("/feeds/")) return env.CATALOG.fetch(req);
    if (p.startsWith("/api/")) return json({ ok: false, error: "not_found" }, 404);
    const res = await env.ASSETS.fetch(req);
    if (res.status === 404) return notFound(env, url);
    if (p === "/" || p === "/index.html") return withCfg(req, env, ctx, await withGoogleMeta(env, res), p);
    return withCfg(req, env, ctx, res, p);
  },
};
