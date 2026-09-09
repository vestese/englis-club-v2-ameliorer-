/* =====================================================================
   util.js — outils partagés : navigation, audio, stockage, confettis
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.util = (function () {

  /* ---------- Petit sélecteur / création d'éléments ---------- */
  const el = (sel) => document.querySelector(sel);
  const root = () => document.getElementById("screen");

  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    (children || []).forEach((c) => {
      if (c === null || c === undefined) return;
      if (typeof c === "string") {
        node.appendChild(document.createTextNode(c));
      } else if (c.nodeType === 1 || c.nodeType === 3) {
        node.appendChild(c);
      } else {
        node.appendChild(document.createTextNode(String(c)));
      }
    });
    return node;
  }

  /* ---------- Rendu d'un écran + bouton retour ---------- */
  const history = [];
  function show(builderFn, opts) {
    opts = opts || {};
    if (!opts.replace) history.push(builderFn);
    const container = root();
    container.innerHTML = "";
    const scr = h("div", { class: "screen" });
    builderFn(scr);
    container.appendChild(scr);
    // gérer le bouton retour de la barre
    const back = document.getElementById("backBtn");
    back.style.visibility = history.length > 1 || opts.showBack ? "visible" : "hidden";
    window.scrollTo(0, 0);
  }
  function goHome() {
    history.length = 0;
    if (typeof window.returnToArcade === "function") {
      window.returnToArcade();
      return;
    }
    if (window.CAA && window.CAA.app && typeof window.CAA.app.home === "function" && document.getElementById("screen")) {
      CAA.app.home();
    } else {
      window.location.href = "index.html";
    }
  }
  function back() {
    if (history.length > 1) {
      history.pop();
      const prev = history[history.length - 1];
      show(prev, { replace: true });
    } else {
      goHome();
    }
  }

  /* ---------- Mélange (Fisher–Yates) ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- Tirage anti-répétition récente ---------- */
  function getItemId(item) {
    if (item === null || item === undefined) return "";
    if (typeof item === "string" || typeof item === "number") return String(item).trim().toLowerCase();
    if (item.id !== null && item.id !== undefined && String(item.id).trim() !== "") {
      return String(item.id).trim().toLowerCase();
    }
    let raw = "";
    // Wheel challenges: title alone can collide — include task
    if (item.title && item.task) raw = item.title + "::" + item.task;
    else if (item.en) raw = item.en;
    else if (item.verb) raw = item.verb;
    else if (item.word) raw = item.word;
    else if (item.q) raw = item.q;
    else if (item.sentence) raw = item.sentence;
    else if (item.prompt) raw = item.prompt;
    else if (item.task) raw = item.task;
    else if (item.title) raw = item.title;
    else {
      try { raw = JSON.stringify(item); } catch (e) { raw = String(item); }
    }
    return String(raw).trim().toLowerCase();
  }

  /** Déduplique un pool par ID (insensible à la casse). */
  function uniqueById(pool) {
    const seen = new Set();
    const out = [];
    (Array.isArray(pool) ? pool : []).forEach((item) => {
      const id = getItemId(item);
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(item);
    });
    return out;
  }

  /**
   * Registre des questions déjà posées (par ID) pour une partie.
   * Empêche les répétitions tant que le pool n'est pas épuisé.
   */
  function createAskedTracker(sessionKey, opts) {
    opts = opts || {};
    const persist = opts.persist !== false;
    const storeKey = "asked_" + (sessionKey || "default");
    let asked = new Set();

    if (persist) {
      const saved = store.get(storeKey, []);
      if (Array.isArray(saved)) {
        saved.forEach((id) => {
          const n = String(id).trim().toLowerCase();
          if (n) asked.add(n);
        });
      }
    }

    function save() {
      if (persist) store.set(storeKey, Array.from(asked));
    }

    function normalize(itemOrId) {
      if (itemOrId === null || itemOrId === undefined) return "";
      if (typeof itemOrId === "string" || typeof itemOrId === "number") {
        return String(itemOrId).trim().toLowerCase();
      }
      return getItemId(itemOrId);
    }

    return {
      has(itemOrId) {
        const id = normalize(itemOrId);
        return !!id && asked.has(id);
      },
      mark(itemOrId) {
        const id = normalize(itemOrId);
        if (!id) return false;
        asked.add(id);
        save();
        return true;
      },
      markMany(items) {
        (items || []).forEach((it) => this.mark(it));
      },
      pick(pool, count) {
        count = (typeof count === "number" && count > 0) ? count : 1;
        const uniq = uniqueById(pool);
        if (!uniq.length) return count === 1 ? null : [];

        const available = uniq.filter((item) => !asked.has(getItemId(item)));
        if (!available.length) {
          // Pool épuisé : ne recycle pas pendant la session.
          return count === 1 ? null : [];
        }

        const picked = sample(available, Math.min(count, available.length));
        return count === 1 ? (picked[0] || null) : picked;
      },
      take(pool, count) {
        count = (typeof count === "number" && count > 0) ? count : 1;
        if (count === 1) {
          const item = this.pick(pool, 1);
          if (item) this.mark(item);
          return item;
        }
        const items = this.pick(pool, count);
        this.markMany(items);
        return items;
      },
      size() { return asked.size; },
      clear() { asked.clear(); save(); },
      ids() { return Array.from(asked); }
    };
  }

  function pickFresh(pool, key, count) {
    if (!pool || !pool.length) return count === 1 ? null : [];
    count = count || 1;
    pool = uniqueById(pool);

    const historyKey = "fresh_" + (key || "default");
    let history = store.get(historyKey, []);
    if (!Array.isArray(history)) history = [];
    // Normalize stored history for case-insensitive matching
    history = history.map((id) => String(id).trim().toLowerCase());

    // Max history memory: cap at 60% of pool size
    const maxHistoryLen = Math.max(1, Math.floor(pool.length * 0.6));

    // Filter available items that are NOT in history
    let available = pool.filter((item) => !history.includes(getItemId(item)));

    // If available items are fewer than count, trim oldest history entries
    if (available.length < count) {
      const allowedHistoryLen = Math.max(0, pool.length - count);
      history = history.slice(-allowedHistoryLen);
      store.set(historyKey, history);
      available = pool.filter((item) => !history.includes(getItemId(item)));
    }

    // Fallback if pool size itself is smaller than count
    if (available.length < count) {
      available = pool.slice();
    }

    // Pick random items using Fisher-Yates sample
    const picked = sample(available, Math.min(count, available.length));

    // Update history with newly picked item IDs
    picked.forEach((item) => {
      const id = getItemId(item);
      if (id && !history.includes(id)) {
        history.push(id);
      }
    });

    // Enforce max history length cap
    if (history.length > maxHistoryLen) {
      history = history.slice(-maxHistoryLen);
    }

    store.set(historyKey, history);

    return count === 1 ? picked[0] : picked;
  }

  /* ---------- Deck de session sans répétition ---------- */
  function newSessionDeck(pool, sessionKey) {
    const origPool = uniqueById(Array.isArray(pool) ? pool : []);
    let lastUsed = [];
    if (sessionKey) {
      lastUsed = store.get("deck_last_" + sessionKey, []);
      if (!Array.isArray(lastUsed)) lastUsed = [];
      lastUsed = lastUsed.map((id) => String(id).trim().toLowerCase());
    }

    const fresh = [];
    const recent = [];
    const seenInDeck = new Set();
    origPool.forEach((item) => {
      const id = getItemId(item);
      if (!id || seenInDeck.has(id)) return;
      seenInDeck.add(id);
      if (lastUsed.includes(id)) recent.push(item);
      else fresh.push(item);
    });

    let deckItems = shuffle(fresh).concat(shuffle(recent));
    const drawnIds = [];
    let cycle = 0;

    function refill() {
      // Prefer items not yet drawn in this party
      const unused = origPool.filter((item) => !drawnIds.includes(getItemId(item)));
      if (unused.length > 0) {
        deckItems = shuffle(unused);
        return true;
      }
      // Full unique pool exhausted: stop here to avoid duplicates in this session.
      return false;
    }

    return {
      draw(count) {
        if (typeof count === "number" && count > 1) {
          const res = [];
          for (let i = 0; i < count; i++) {
            const item = this.draw();
            if (item !== null) res.push(item);
          }
          return res;
        }

        if (deckItems.length === 0) {
          if (!refill()) return null;
        }

        // Skip any accidental duplicate still in the queue (same party cycle)
        let item = null;
        while (deckItems.length > 0) {
          const candidate = deckItems.shift();
          const id = getItemId(candidate);
          if (id && drawnIds.includes(id)) continue;
          item = candidate;
          break;
        }
        if (!item) {
          if (!refill()) return null;
          item = deckItems.shift();
          // After refill, still guard against edge cases
          while (item && getItemId(item) && drawnIds.includes(getItemId(item)) && deckItems.length > 0) {
            item = deckItems.shift();
          }
        }
        if (!item) return null;

        const id = getItemId(item);
        if (id) {
          drawnIds.push(id);
          if (sessionKey) {
            store.set("deck_last_" + sessionKey, drawnIds.slice());
          }
        }
        return item;
      },
      // Infinite draw: cycles through the pool endlessly (reshuffles when exhausted)
      drawInfinite() {
        if (deckItems.length === 0) {
          // Reset and reshuffle the full pool for a new cycle
          drawnIds.length = 0;
          deckItems = shuffle(origPool.slice());
          cycle++;
        }
        let item = deckItems.shift();
        if (!item && origPool.length > 0) {
          deckItems = shuffle(origPool.slice());
          item = deckItems.shift();
        }
        return item || null;
      },
      remaining() {
        return deckItems.length;
      },
      isEmpty() {
        return deckItems.length === 0 && origPool.every((item) => drawnIds.includes(getItemId(item)));
      },
      size() {
        return origPool.length;
      }
    };
  }

  /* ---------- Prononciation (voix du navigateur) ---------- */
  function speak(text, opts) {
    opts = opts || {};
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang || "en-US";
      u.rate = opts.slow ? 0.55 : (opts.rate || 0.85);
      u.pitch = 1.0;
      u.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const en = voices.find((v) => /en[-_](us|gb|ca|au)/i.test(v.lang)) || voices.find((v) => /en[-_]/i.test(v.lang));
      if (en) u.voice = en;
      window.speechSynthesis.speak(u);
    } catch (e) { /* silencieux */ }
  }

  /**
   * Écoute courte via Web Speech API (Chrome/Edge).
   * Retourne une Promise: { ok, transcript, reason }
   */
  function listenOnce(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        resolve({ ok: false, reason: "unsupported", transcript: "" });
        return;
      }
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        try { rec.stop(); } catch (e) { /* ignore */ }
        resolve(result);
      };
      const rec = new SR();
      rec.lang = opts.lang || "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 3;
      rec.continuous = false;
      const timer = setTimeout(() => finish({ ok: false, reason: "timeout", transcript: "" }), opts.ms || 5000);
      rec.onresult = (ev) => {
        clearTimeout(timer);
        const alts = [];
        try {
          const res = ev.results[0];
          for (let i = 0; i < res.length; i++) alts.push((res[i].transcript || "").trim());
        } catch (e) { /* ignore */ }
        const transcript = alts[0] || "";
        finish({ ok: !!transcript, transcript: transcript, alternatives: alts, reason: transcript ? "ok" : "empty" });
      };
      rec.onerror = (ev) => {
        clearTimeout(timer);
        finish({ ok: false, reason: (ev && ev.error) || "error", transcript: "" });
      };
      rec.onend = () => {
        clearTimeout(timer);
        if (!done) finish({ ok: false, reason: "ended", transcript: "" });
      };
      try { rec.start(); } catch (e) {
        clearTimeout(timer);
        finish({ ok: false, reason: "start_failed", transcript: "" });
      }
    });
  }

  /** Compare une tentative orale au mot cible (tolérant). */
  function pronunciationMatch(heard, target) {
    const norm = (s) => String(s || "")
      .toLowerCase()
      .replace(/[^a-z']/g, " ")
      .trim()
      .replace(/\s+/g, " ");
    const a = norm(heard);
    const b = norm(target);
    if (!a || !b) return false;
    if (a === b) return true;
    // accepter si le premier mot reconnu correspond
    if (a.split(" ")[0] === b) return true;
    // tolérance légère (1 lettre) pour mots courts/longs
    if (Math.abs(a.length - b.length) > 2) return false;
    let diff = 0;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) diff++;
      if (diff > 1) return false;
    }
    return true;
  }

  /* ---------- Effets sonores (WebAudio, sans fichiers) ---------- */
  let actx = null;
  function tone(freq, dur, type, when, gain) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const t0 = actx.currentTime + (when || 0);
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.2, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(actx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* silencieux */ }
  }
  const sfx = {
    correct() { tone(660, 0.12, "sine", 0); tone(880, 0.18, "sine", 0.1); },
    wrong()   { tone(180, 0.28, "sawtooth", 0, 0.15); },
    tick()    { tone(440, 0.05, "square", 0, 0.06); },
    win()     { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "sine", i * 0.12)); },
    gift()    { [392, 523, 659].forEach((f, i) => tone(f, 0.15, "triangle", i * 0.09)); }
  };

  /* ---------- Stockage local (sûr même en file://) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem("caa_" + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, val) {
      try { window.localStorage.setItem("caa_" + key, JSON.stringify(val)); }
      catch (e) { /* stockage indisponible (ex. fichier local) */ }
    }
  };

  /* ---------- Confettis ---------- */
  function confetti(duration) {
    const canvas = h("canvas", { class: "confetti" });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const colors = ["#ffd23f", "#34d399", "#60a5fa", "#c084fc", "#fb7185", "#fb923c"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * W,
      y: Math.random() * -H,
      r: 4 + Math.random() * 6,
      c: colors[(Math.random() * colors.length) | 0],
      vy: 2 + Math.random() * 3.5,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.1 + Math.random() * 0.2
    }));
    const end = Date.now() + (duration || 2600);
    (function frame() {
      ctx.clearRect(0, 0, W, H);
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > H) { p.y = -10; p.x = Math.random() * W; }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx.restore();
      });
      if (Date.now() < end) requestAnimationFrame(frame);
      else canvas.remove();
    })();
  }

  /* ---------- Fenêtres de confirmation / alerte (remplacent confirm/alert) ---------- */
  function confirmBox(message, onYes) {
    const overlay = h("div", { class: "modal-back" });
    const modal = h("div", { class: "modal" });
    modal.appendChild(h("p", { class: "section-sub", style: "font-size:1.1rem;margin-bottom:20px;" }, [message]));
    modal.appendChild(h("div", { class: "row center mt" }, [
      h("button", { class: "btn btn-primary", onclick: () => { overlay.remove(); if (onYes) onYes(); } }, ["Yes"]),
      h("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, ["Cancel"])
    ]));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
  function alertBox(message) {
    const overlay = h("div", { class: "modal-back" });
    const modal = h("div", { class: "modal" });
    modal.appendChild(h("p", { class: "section-sub", style: "font-size:1.1rem" }, [message]));
    modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => overlay.remove() }, ["OK"]));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /* ---------- Copie profonde ---------- */
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  /* ---------- Téléchargement d'un fichier ---------- */
  function downloadFile(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = h("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
  }

  /** Selectionne `count` distracteurs uniques du pool qui diffèrent de `targetItem`. */
  function pickDistractors(pool, targetItem, count, extractVal) {
    count = count || 3;
    extractVal = extractVal || ((x) => (typeof x === 'string' ? x : (x.en || x.word || x.answer || getItemId(x))));
    const targetVal = String(extractVal(targetItem) || "").trim().toLowerCase();
    const uniquePool = uniqueById(pool);
    const valid = uniquePool.filter((item) => {
      const v = String(extractVal(item) || "").trim().toLowerCase();
      return v && v !== targetVal;
    });
    return sample(valid, Math.min(count, valid.length));
  }

  /* ---------- Verification de mots anglais (Local + API vocabulaire_anglais.db) ---------- */
  const wordValidationCache = new Map();

  async function validateEnglishWord(word) {
    if (!word || typeof word !== "string") return false;
    const clean = word.trim().toLowerCase();
    if (!clean || !/^[a-z]+$/.test(clean)) return false;

    if (wordValidationCache.has(clean)) {
      return wordValidationCache.get(clean);
    }

    // 1. Verification rapide locale contre le contenu JavaScript (content.js)
    const C = window.CAA && window.CAA.content ? window.CAA.content : {};
    const vocab = C.vocabulary || [];
    if (vocab.some((v) => v && v.en && v.en.toLowerCase() === clean)) {
      wordValidationCache.set(clean, true);
      return true;
    }
    const anagrams = C.anagramWords || [];
    if (anagrams.some((w) => typeof w === "string" && w.toLowerCase() === clean)) {
      wordValidationCache.set(clean, true);
      return true;
    }

    // 2. Verification via le serveur qserver (vocabulaire_anglais.db)
    try {
      const res = await fetch("/api/validate-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: clean })
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.valid === "boolean") {
          wordValidationCache.set(clean, data.valid);
          return data.valid;
        }
      }
    } catch (err) {
      // qserver non joignable (mode 100% hors-ligne/fichier local)
    }

    // 3. Fallback heuristique hors-ligne: voyelle obligatoire (A, E, I, O, U, Y)
    const isValidHeuristic = /[aeiouy]/.test(clean);
    wordValidationCache.set(clean, isValidHeuristic);
    return isValidHeuristic;
  }

  return { el, h, show, back, goHome, shuffle, sample, rand, pickFresh, newSessionDeck, uniqueById, getItemId, createAskedTracker, pickDistractors, speak, listenOnce, pronunciationMatch, sfx, store, confetti, confirmBox, alertBox, clone, downloadFile, history, validateEnglishWord };
})();
