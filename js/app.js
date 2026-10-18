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

      // --- SECTION DES 6 PILIERS STRUCTURÉS PAR TYPE ---
      const pillarsWrap = h("div", { class: "hub-pillars-section" });
      const pillarsGrid = h("div", { class: "hub-pillars-grid" });

      // 1. Mode Solo
      const cardSolo = h("a", { class: "pillar-card pillar-solo", href: "games.html?cat=solo" });
      cardSolo.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Mode Solo · 9 Jeux</span>
          <div class="pillar-icon-box">👤</div>
          <h2 class="pillar-title">Jeux Solo</h2>
          <p class="pillar-desc">
            Entraînez-vous individuellement à votre rythme : Word Match, Spelling Bee, Verbes Irréguliers, Phrasal Verbs et Anagrams avec chrono, bonus et jokers.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">🧩 Word Match</span>
            <span class="pillar-tag">🐝 Spelling Bee</span>
            <span class="pillar-tag">⚡ Verbes Irréguliers</span>
            <span class="pillar-tag">🎯 Phrasal Verbs</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Ouvrir les jeux Solo</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardSolo);

      // 2. Mode Équipes & TV
      const cardGroup = h("a", { class: "pillar-card pillar-group", href: "games.html?cat=group" });
      cardGroup.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Équipes &amp; TV · 16 Jeux</span>
          <div class="pillar-icon-box">👥</div>
          <h2 class="pillar-title">Jeux d'Équipes &amp; TV</h2>
          <p class="pillar-desc">
            Animez vos séances de club sur grand écran avec The Big Challenge, duels d'équipes en direct, buzzer, vol de points, mimes, roue des défis et TV Vocab.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">🏆 The Big Challenge</span>
            <span class="pillar-tag">📺 TV Vocab</span>
            <span class="pillar-tag">🎡 Spin the Wheel</span>
            <span class="pillar-tag">🎭 Charades &amp; Mimes</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Lancer les jeux d'équipes</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardGroup);

      // 3. Mode Multijoueur
      const cardMulti = h("a", { class: "pillar-card pillar-multi", href: "games.html?cat=multi" });
      cardMulti.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Multijoueur · Live PIN</span>
          <div class="pillar-icon-box">🌐</div>
          <h2 class="pillar-title">Multijoueur &amp; Live</h2>
          <p class="pillar-desc">
            Connectez les smartphones des participants en temps réel via un code PIN de salle, lancez des duels interactifs ou pilotez la séance Meeting complète.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">📱 Code PIN Mobile</span>
            <span class="pillar-tag">⚔️ Duels Live</span>
            <span class="pillar-tag">📅 Meeting Mode</span>
            <span class="pillar-tag">🥇 Podium Instantané</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Accéder au Multijoueur</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardMulti);

      // 4. Mode Learning
      const cardLearning = h("a", { class: "pillar-card pillar-learning", href: "learning.html" });
      cardLearning.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Learning Hub · Histoires &amp; PDF</span>
          <div class="pillar-icon-box">📖</div>
          <h2 class="pillar-title">Learning Hub</h2>
          <p class="pillar-desc">
            Lisez 15 histoires bilingues interactives avec audio et infobulles, téléchargez les fiches PDF synchronisées Google Drive, et révisez grammaire et vocabulaire.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">📖 Histoires Bilingues</span>
            <span class="pillar-tag">📁 Fiches PDF Drive</span>
            <span class="pillar-tag">✍️ Règles Grammaire</span>
            <span class="pillar-tag">⭐ Carnet Personnel</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Ouvrir l'espace Learning</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardLearning);

      // 5. Mode Teaching
      const cardTeaching = h("a", { class: "pillar-card pillar-teaching", href: "teaching.html" });
      cardTeaching.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Teaching · Espace Enseignant</span>
          <div class="pillar-icon-box">🎓</div>
          <h2 class="pillar-title">Mode Teaching</h2>
          <p class="pillar-desc">
            Concevez vos formulaires d'évaluation sur mesure ou piochez dans la banque officielle. Suivez la réception des copies en temps réel et analysez les résultats.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">📝 Créateur de Formulaires</span>
            <span class="pillar-tag">⏱️ Sessions Minutées</span>
            <span class="pillar-tag">📊 Suivi Live des Copies</span>
            <span class="pillar-tag">🔍 Bilan d'Erreurs</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Accéder à l'espace Enseignant</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardTeaching);

      // 6. Mode Questionnaire
      const cardQuestionnaire = h("a", { class: "pillar-card pillar-questionnaire", href: "questionnaire.html" });
      cardQuestionnaire.innerHTML = `
        <div class="pillar-glow"></div>
        <div>
          <span class="pillar-badge">Questionnaires · Espace Élèves</span>
          <div class="pillar-icon-box">📝</div>
          <h2 class="pillar-title">Questionnaires &amp; Quiz</h2>
          <p class="pillar-desc">
            Passez une évaluation en ligne : renseignez votre identité, répondez au questionnaire interactif et recevez instantanément votre note et l'analyse de vos fautes.
          </p>
          <div class="pillar-tags-row">
            <span class="pillar-tag">✍️ Formulaire Élève</span>
            <span class="pillar-tag">🚀 Correction Instantanée</span>
            <span class="pillar-tag">💯 Calcul de Note /20</span>
            <span class="pillar-tag">💡 Explications Pédagogiques</span>
          </div>
        </div>
        <div class="pillar-footer-action">
          <span>Passer un Questionnaire</span>
          <span class="pillar-arrow">→</span>
        </div>
      `;
      pillarsGrid.appendChild(cardQuestionnaire);

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
