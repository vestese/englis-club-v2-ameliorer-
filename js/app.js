/* =====================================================================
   app.js — entry point: home screen + navigation
   (loaded last)
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.app = (function () {
  const U = () => CAA.util;

  function home() {
    U().history.length = 0;
    U().show((scr) => {
      const h = U().h;

      // Mot du jour interactif
      const vocab = (CAA.content && Array.isArray(CAA.content.vocabulary) && CAA.content.vocabulary.length)
        ? CAA.content.vocabulary
        : [{ en: "Welcome", fr: "Bienvenue" }];
      const wod = vocab[new Date().getDate() % vocab.length] || { en: "Welcome", fr: "Bienvenue" };

      // Hero Header
      scr.appendChild(h("div", { class: "hero" }, [
        h("h1", {}, ["Accra English Club"]),
        h("p", { class: "sub" }, ["Améliorez votre anglais avec nos histoires interactives, jeux d'arcade captivants et défis en équipe."]),
        h("p", { class: "sub" }, ["Pratiquez à votre rythme ou animez vos séances de club sur grand écran."]),
        h("button", { class: "wod", title: "Écouter la prononciation", onclick: () => U().speak(wod.en) }, [
          "Mot du jour : ", h("b", {}, [wod.en]),
          wod.fr ? h("span", { style: "font-weight:normal;opacity:0.85;margin-left:6px;" }, [`(${wod.fr})`]) : null,
          h("span", { class: "wod-listen" }, [
            h("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
              h("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
              h("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
              h("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" })
            ])
          ])
        ])
      ]));

      // --- SECTION DES 3 GRANDS PILIERS ---
      const pillarsWrap = h("div", { class: "hub-pillars-section" });
      const pillarsGrid = h("div", { class: "hub-pillars-grid" });

      // Pilier 1 : Arcade & Jeux
      const cardGames = h("a", { class: "pillar-card pillar-games", href: "games.html" });
      cardGames.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Arcade · 27 Jeux Inclus</span>
          <div class="pillar-icon-box">🎮</div>
          <h2 class="pillar-title">Jeux &amp; Arcade du Club</h2>
          <p class="pillar-desc">
            Tous les jeux réunis dans un espace dédié : entraînement solo minuté (Word Match, Spelling Bee...), défis de groupe sur grand écran TV (The Big Challenge, TV Vocab...) et parties multijoueurs connectées.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">👤 9 Jeux Solo</span>
            <span class="pillar-tag">👥 16 Jeux Groupe TV</span>
            <span class="pillar-tag">🌐 Multijoueur Live</span>
            <span class="pillar-tag">🏆 Meeting Mode</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Accéder à l'Arcade complète</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardGames);

      // Pilier 2 : Learning Hub & Histoires
      const cardLearning = h("a", { class: "pillar-card pillar-learning", href: "learning.html" });
      cardLearning.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Nouveau · Coin Histoires</span>
          <div class="pillar-icon-box">📖</div>
          <h2 class="pillar-title">Learning Hub &amp; Histoires</h2>
          <p class="pillar-desc">
            Découvrez notre nouveau coin d'histoires en anglais avec définitions et prononciation au survol de chaque mot, cours PDF synchronisés Google Drive, entraînement de grammaire et carnet de vocabulaire.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">📖 Histoires Interactives</span>
            <span class="pillar-tag">📁 Fiches PDF Drive</span>
            <span class="pillar-tag">✍️ Grammaire &amp; Quiz</span>
            <span class="pillar-tag">⭐ Carnet Personnel</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Ouvrir les histoires &amp; cours</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardLearning);

      // Pilier 3 : Teaching & Évaluations Live
      const cardTeaching = h("a", { class: "pillar-card pillar-teaching", href: "teaching.html" });
      cardTeaching.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Espace Enseignant &amp; Élèves</span>
          <div class="pillar-icon-box">🎓</div>
          <h2 class="pillar-title">Teaching &amp; Quiz en Direct</h2>
          <p class="pillar-desc">
            Créez vos questionnaires personnalisés ou choisissez parmi la banque officielle. Lancez des évaluations en temps réel, suivez les réponses des élèves et générez des bilans d'erreurs pédagogiques.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">📝 Créateur de Formulaires</span>
            <span class="pillar-tag">⏱️ Sessions Minutées</span>
            <span class="pillar-tag">📊 Correction Automatique</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Accéder à l'espace Teaching</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardTeaching);

      pillarsWrap.appendChild(pillarsGrid);
      scr.appendChild(pillarsWrap);

      // --- RACCOURCIS RAPIDES "LANCER DIRECT" ---
      const shortcutsBox = h("div", {
        style: "background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);padding:22px;margin-top:28px;box-shadow:var(--shadow-sm);"
      });
      shortcutsBox.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <h3 style="font-size:1.15rem;font-weight:800;margin:0 0 4px;">⚡ Parties Rapides &amp; Accès Directs</h3>
            <p style="color:var(--muted);font-size:0.88rem;margin:0;">Lancez directement les activités préférées du club en 1 clic.</p>
          </div>
          <a href="games.html" class="btn btn-ghost btn-sm">Voir les 27 jeux →</a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">
          <button class="btn btn-outline btn-sm" onclick="CAA.group.setup()" style="justify-content:flex-start;">
            🏆 The Big Challenge
          </button>
          <button class="btn btn-outline btn-sm" onclick="location.href='learning.html?tab=stories'" style="justify-content:flex-start;">
            📖 Histoires en Anglais
          </button>
          <button class="btn btn-outline btn-sm" onclick="CAA.solo.start('match')" style="justify-content:flex-start;">
            🧩 Word Match Solo
          </button>
          <button class="btn btn-outline btn-sm" onclick="CAA.meeting.setup()" style="justify-content:flex-start;">
            📅 Séance Meeting Mode
          </button>
          <button class="btn btn-outline btn-sm" onclick="CAA.app.season()" style="justify-content:flex-start;">
            🎖️ Classement Saison
          </button>
          <button class="btn btn-outline btn-sm" onclick="CAA.editor.menu()" style="justify-content:flex-start;">
            ✏️ Éditeur de Contenu
          </button>
        </div>
      `;
      scr.appendChild(shortcutsBox);
    }, { replace: true });
  }

  /* ---------- Season leaderboard ---------- */
  function season() {
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["Season Leaderboard"]));
      const data = U().store.get("season", {});
      const rows = Object.keys(data).map((name) => Object.assign({ name }, data[name]));
      rows.sort((a, b) => b.wins - a.wins || b.points - a.points);

      if (!rows.length) {
        scr.appendChild(h("p", { class: "section-sub" }, [
          "No games recorded yet. Play \"The Big Challenge\" in a group to fill the leaderboard!"
        ]));
      } else {
        const sb = h("div", { class: "scoreboard" });
        rows.forEach((t, i) => {
          sb.appendChild(h("div", { class: "score-chip" + (i === 0 ? " active" : "") }, [
            h("div", { class: "name" }, [`${i + 1}. ${t.name}`]),
            h("div", { class: "pts" }, [`${t.wins} win${t.wins !== 1 ? "s" : ""}`]),
            h("small", { class: "section-sub" }, [`${t.points} pts · ${t.games} game(s)`])
          ]));
        });
        scr.appendChild(sb);
        scr.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => {
            U().confirmBox("Clear the whole season leaderboard?", () => { U().store.set("season", {}); season(); });
          } }, ["Reset the season"])
        ]));
      }
    });
  }

  return { home, season };
})();

/* ---------- Startup ---------- */
window.addEventListener("DOMContentLoaded", function () {
  try {
    // top-bar back button
    const back = document.getElementById("backBtn");
    if (back) back.addEventListener("click", () => CAA.util.back());
    // logo -> home
    const logo = document.getElementById("logo");
    if (logo) logo.addEventListener("click", () => CAA.util.goHome());
    // warm up the speech-synthesis voices
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
    // Initialize default content reference without blocking deep clone
    CAA.defaultContent = CAA.content || {};
    var saved = CAA.util.store.get("content", null);
    if (saved && typeof saved === "object") {
      for (var k in saved) {
        if (Array.isArray(saved[k]) && saved[k].length > 0) {
          CAA.content[k] = saved[k];
        }
      }
    }
  } catch (e) {
    console.error("Initialization warning:", e);
  }
  CAA.app.home();
});
