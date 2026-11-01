/*
 * Pont BRSN OPS pour les anciens outils (artefacts Claude).
 * Chargé avant le code de chaque outil, il remplace :
 *   - window.claude.use("db")     → Supabase (table outils_donnees, via /api/outils/db)
 *   - localStorage                → copié dans Supabase (te suit d'un appareil à l'autre)
 *   - window.claude.use("assets") → Supabase Storage (via /api/outils/fichiers)
 *   - window.claude.use("sample") → Claude, côté serveur (via /api/claude)
 *   - window.claude.use("user")   → ton compte BRSN OPS
 * Rien n'est envoyé vers Shopify, QuickBooks, Outlook, Meta ou autre.
 */
(function () {
  "use strict";
  var OUTIL = location.pathname.split("/").pop().replace(/\.html$/, "");
  var API = "/api/outils";
  var enc = encodeURIComponent;
  var UTILISATEUR = null;

  function erreur(message, code) {
    var e = new Error(message || "Erreur");
    e.code = code || "erreur";
    e.text = message || "";
    return e;
  }

  function req(methode, url, corps) {
    return fetch(url, {
      method: methode,
      credentials: "same-origin",
      headers: corps ? { "content-type": "application/json" } : {},
      body: corps ? JSON.stringify(corps) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw erreur(j.erreur || "Erreur " + r.status, j.code || (r.status === 401 ? "not_granted" : "erreur"));
        return j;
      });
    });
  }

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function autoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

  /* ---------- localStorage → Supabase ---------- */
  var origSet = Storage.prototype.setItem;
  var origRemove = Storage.prototype.removeItem;
  var LOCAL = "_local";
  try {
    var x = new XMLHttpRequest();
    x.open("GET", API + "/db?outil=" + enc(OUTIL) + "&collection=" + LOCAL, false);
    x.send();
    if (x.status === 200) {
      var j = JSON.parse(x.responseText);
      UTILISATEUR = j.utilisateur || null;
      (j.docs || []).forEach(function (d) {
        try { origSet.call(window.localStorage, decodeURIComponent(d.id), d.data && d.data.v); } catch (e) {}
      });
    }
  } catch (e) {}

  var enAttente = {};
  var minuteur = null;
  function planifier() { clearTimeout(minuteur); minuteur = setTimeout(vider, 700); }
  function vider(parBalise) {
    var a = enAttente;
    enAttente = {};
    Object.keys(a).forEach(function (k) {
      var chemin = LOCAL + "/" + enc(k);
      if (a[k] === null) {
        req("DELETE", API + "/db?outil=" + enc(OUTIL) + "&chemin=" + enc(chemin)).catch(function () {});
      } else {
        var corps = { outil: OUTIL, chemin: chemin, data: { v: a[k] } };
        if (parBalise && navigator.sendBeacon) {
          navigator.sendBeacon(API + "/db", new Blob([JSON.stringify(corps)], { type: "application/json" }));
        } else {
          req("PUT", API + "/db", corps).catch(function () {});
        }
      }
    });
  }
  Storage.prototype.setItem = function (k, v) {
    origSet.call(this, k, v);
    if (this === window.localStorage) { enAttente[k] = String(v); planifier(); }
  };
  Storage.prototype.removeItem = function (k) {
    origRemove.call(this, k);
    if (this === window.localStorage) { enAttente[k] = null; planifier(); }
  };
  window.addEventListener("pagehide", function () { if (Object.keys(enAttente).length) vider(true); });

  /* ---------- db (style Firestore) ---------- */
  var ecouteurs = [];
  function signaler() { ecouteurs.forEach(function (f) { f(); }); }

  function snapDoc(id, data) {
    return { id: id, exists: data != null, data: function () { return data == null ? undefined : clone(data); }, ref: { id: id } };
  }

  function sonder(lire, cb, err) {
    var actif = true;
    function tirer() {
      if (!actif) return;
      lire().then(function (s) { if (actif) cb(s); }).catch(function (e) { if (actif && err) err(e); });
    }
    tirer();
    var t = setInterval(tirer, 10000);
    ecouteurs.push(tirer);
    return function () {
      actif = false;
      clearInterval(t);
      ecouteurs = ecouteurs.filter(function (f) { return f !== tirer; });
    };
  }

  function docRef(chemin) {
    var id = chemin.split("/").pop();
    var ref = {
      id: id,
      path: chemin,
      get: function () {
        return req("GET", API + "/db?outil=" + enc(OUTIL) + "&chemin=" + enc(chemin)).then(function (r) { return snapDoc(id, r.data); });
      },
      set: function (data, opts) {
        return req("PUT", API + "/db", { outil: OUTIL, chemin: chemin, data: clone(data), merge: !!(opts && opts.merge) }).then(signaler);
      },
      update: function (data) {
        return req("PUT", API + "/db", { outil: OUTIL, chemin: chemin, data: clone(data), merge: true }).then(signaler);
      },
      delete: function () {
        return req("DELETE", API + "/db?outil=" + enc(OUTIL) + "&chemin=" + enc(chemin)).then(signaler);
      },
      onSnapshot: function (cb, err) { return sonder(ref.get, cb, err); },
      collection: function (sous) { return collRef(chemin + "/" + sous); },
    };
    return ref;
  }

  function comparer(a, op, b) {
    switch (op) {
      case "==": return a === b;
      case "!=": return a !== b;
      case "<": return a < b;
      case "<=": return a <= b;
      case ">": return a > b;
      case ">=": return a >= b;
      case "in": return Array.isArray(b) && b.indexOf(a) >= 0;
      case "not-in": return Array.isArray(b) && b.indexOf(a) < 0;
      case "array-contains": return Array.isArray(a) && a.indexOf(b) >= 0;
      case "array-contains-any": return Array.isArray(a) && Array.isArray(b) && b.some(function (v) { return a.indexOf(v) >= 0; });
      default: return true;
    }
  }

  function collRef(chemin, filtres, tri, max) {
    filtres = filtres || [];
    var ref = {
      id: chemin.split("/").pop(),
      path: chemin,
      doc: function (id) { return docRef(chemin + "/" + (id || autoId())); },
      add: function (data) {
        var d = docRef(chemin + "/" + autoId());
        return d.set(data).then(function () { return d; });
      },
      where: function (champ, op, val) { return collRef(chemin, filtres.concat([[champ, op, val]]), tri, max); },
      orderBy: function (champ, sens) { return collRef(chemin, filtres, [champ, sens === "desc" ? -1 : 1], max); },
      limit: function (n) { return collRef(chemin, filtres, tri, n); },
      get: function () {
        return req("GET", API + "/db?outil=" + enc(OUTIL) + "&collection=" + enc(chemin)).then(function (r) {
          var docs = (r.docs || []).filter(function (d) {
            return filtres.every(function (f) { return comparer(d.data ? d.data[f[0]] : undefined, f[1], f[2]); });
          });
          if (tri) {
            docs.sort(function (a, b) {
              var x = a.data && a.data[tri[0]], y = b.data && b.data[tri[0]];
              return (x > y ? 1 : x < y ? -1 : 0) * tri[1];
            });
          }
          if (max) docs = docs.slice(0, max);
          var snaps = docs.map(function (d) { return snapDoc(d.id, d.data); });
          return { docs: snaps, empty: !snaps.length, size: snaps.length, forEach: function (f) { snaps.forEach(f); } };
        });
      },
      onSnapshot: function (cb, err) { return sonder(ref.get, cb, err); },
    };
    return ref;
  }

  var db = { doc: docRef, collection: function (c) { return collRef(c); } };

  /* ---------- assets (fichiers) ---------- */
  var assets = {
    upload: function (fichier, opts) {
      var type = (opts && opts.type) || fichier.type || "application/octet-stream";
      return req("POST", API + "/fichiers", { outil: OUTIL, nom: fichier.name || "fichier" }).then(function (r) {
        return fetch(r.envoi, { method: "PUT", headers: { "content-type": type }, body: fichier }).then(function (e) {
          if (!e.ok) throw erreur("Envoi impossible", e.status === 413 ? "too_large" : "erreur");
          return { id: r.id, url: r.url, sizeBytes: fichier.size, type: type };
        });
      });
    },
    delete: function (id) { return req("DELETE", API + "/fichiers?id=" + enc(id)); },
    url: function (id) { return API + "/fichiers?id=" + enc(id); },
    get: function (id) { return Promise.resolve({ id: id, url: API + "/fichiers?id=" + enc(id) }); },
  };

  /* ---------- sample (Claude) ---------- */
  function lireFichier(blob) {
    return new Promise(function (ok, ko) {
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = ko;
      r.readAsDataURL(blob);
    });
  }

  // Réduit les images (max 1568 px) pour rester sous la limite d'envoi.
  function versBlocImage(img) {
    var prendre = typeof img === "string" ? Promise.resolve(img) : lireFichier(img);
    return prendre.then(function (url) {
      return new Promise(function (ok) {
        var i = new Image();
        i.onload = function () {
          var k = Math.min(1, 1568 / Math.max(i.width, i.height));
          var c = document.createElement("canvas");
          c.width = Math.round(i.width * k);
          c.height = Math.round(i.height * k);
          c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
          var data = c.toDataURL("image/jpeg", 0.85);
          ok({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.split(",")[1] } });
        };
        i.onerror = function () {
          var m = /^data:([^;]+);base64,(.*)$/.exec(url) || [];
          ok({ type: "image", source: { type: "base64", media_type: m[1] || "image/jpeg", data: m[2] || "" } });
        };
        i.src = url;
      });
    });
  }

  function texteDe(content) {
    return (content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
  }

  async function sample(entree, opts) {
    opts = opts || {};
    var messages = typeof entree === "string"
      ? [{ role: "user", content: entree }]
      : (entree || []).map(function (t) { return { role: t.role, content: t.content }; });
    if (opts.images && opts.images.length) {
      var blocs = await Promise.all(opts.images.map(versBlocImage));
      var dernier = messages[messages.length - 1];
      var contenu = typeof dernier.content === "string" ? [{ type: "text", text: dernier.content }] : dernier.content;
      dernier.content = blocs.concat(contenu);
    }
    var outils = opts.tools || [];
    var defs = outils.map(function (t) {
      return { name: t.name, description: t.description || "", input_schema: t.inputSchema || t.input_schema || { type: "object", properties: {} } };
    });
    var niveau = opts.modelTier === "quick" ? "rapide" : "complet";

    for (var tour = 0; tour < 6; tour++) {
      var r = await req("POST", "/api/claude", { outil: OUTIL, niveau: niveau, system: opts.system, messages: messages, tools: defs });
      if (r.stop_reason !== "tool_use") {
        var texte = texteDe(r.content);
        if (opts.onText) { try { opts.onText({ text: texte }); } catch (e) {} }
        return { text: texte, content: r.content };
      }
      messages.push({ role: "assistant", content: r.content });
      var resultats = [];
      for (var i = 0; i < r.content.length; i++) {
        var b = r.content[i];
        if (b.type !== "tool_use") continue;
        var t = outils.find(function (o) { return o.name === b.name; });
        try {
          var sortie = t && t.execute ? await t.execute(b.input || {}) : { erreur: "À brancher : cet outil n'est pas encore relié." };
          resultats.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(sortie === undefined ? { ok: true } : sortie) });
        } catch (e) {
          resultats.push({ type: "tool_result", tool_use_id: b.id, content: String((e && e.message) || e), is_error: true });
        }
      }
      messages.push({ role: "user", content: resultats });
    }
    throw erreur("Trop d'étapes. Réessaie.");
  }
  sample.json = async function (entree, opts) {
    var demande = typeof entree === "string" ? entree + "\n\nRéponds seulement avec du JSON valide, sans texte autour." : entree;
    var r = await sample(demande, opts);
    var m = /[[{][\s\S]*[\]}]/.exec(r.text);
    if (!m) throw erreur("Réponse illisible", "json");
    return JSON.parse(m[0]);
  };
  sample.limits = function () { return Promise.resolve({ images: { maxCount: 8 }, maxImages: 8 }); };

  /* ---------- user ---------- */
  var user = {
    id: function () { return Promise.resolve(UTILISATEUR && UTILISATEUR.id); },
    name: function () { return Promise.resolve("Julien"); },
    email: function () { return Promise.resolve(UTILISATEUR && UTILISATEUR.email); },
  };

  var CAPACITES = { db: db, assets: assets, sample: sample, user: user };
  window.claude = {
    use: function (nom) { return Promise.resolve(CAPACITES[nom] || null); },
  };
})();
