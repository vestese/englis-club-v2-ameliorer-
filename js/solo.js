/* =====================================================================
   solo.js — "Play solo" mode: Fully configurable games with Timers,
   Streak Multipliers, Speed Bonuses, Lifelines & SQLite Dictionary validation.
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.solo = (function () {
  const U = () => CAA.util;
  const C = () => CAA.content;

  /* ---------- Default Configuration State ---------- */
  const DEFAULT_CONFIG = {
    tier: "all",           // "easy", "medium", "hard", "all"
    timerMode: "none",     // "none", "question", "session"
    questionSec: 15,       // seconds per question if timerMode === "question"
    sessionSec: 90,        // total seconds if timerMode === "session"
    enableStreak: true,    // streak bonus multiplier
    enableSpeed: true,     // speed bonus for quick answers
    enableLifelines: true  // 50/50, Hint, Skip jokers
  };

  /* ---------- Unified Game Configuration Screen ---------- */
  function renderGameConfig(gameTitle, gameIcon, subtitle, gameKey, onStart) {
    const savedConfigKey = "solo_cfg_" + gameKey;
    const saved = U().store.get(savedConfigKey, {}) || {};
    const cfg = Object.assign({}, DEFAULT_CONFIG, saved);

    U().show((scr) => {
      const h = U().h;

      scr.appendChild(h("h2", { class: "section-title" }, [gameTitle]));
      scr.appendChild(h("p", { class: "section-sub" }, [subtitle || "Customize your game options: Timer, Difficulty & Bonuses."]));

      const card = h("div", { class: "solo-config-card mt" });

      // 1. Difficulty Tier
      const tierSec = h("div", { class: "config-section" });
      tierSec.appendChild(h("div", { class: "config-label" }, [
        "Difficulty Tier ", h("small", {}, ["(vocabulary difficulty)"])
      ]));
      const tierPills = h("div", { class: "config-pills" });
      const tiers = [
        { id: "all", label: "All Levels", sub: "Mixed balanced" },
        { id: "easy", label: "Easy", sub: "Beginner words" },
        { id: "medium", label: "Medium", sub: "Intermediate" },
        { id: "hard", label: "Hard", sub: "Advanced mastery" }
      ];
      tiers.forEach((t) => {
        const pill = h("div", {
          class: "config-pill" + (cfg.tier === t.id ? " active" : ""),
          onclick: () => {
            cfg.tier = t.id;
            updatePills(tierPills, cfg.tier);
          }
        }, [
          h("span", {}, [t.label]),
          h("span", { class: "pill-sub" }, [t.sub])
        ]);
        tierPills.appendChild(pill);
      });
      tierSec.appendChild(tierPills);
      card.appendChild(tierSec);

      // 2. Timer Mode
      const timerSec = h("div", { class: "config-section" });
      timerSec.appendChild(h("div", { class: "config-label" }, [
        "Time Mode ", h("small", {}, ["(play relaxed or against the clock)"])
      ]));
      const timerModePills = h("div", { class: "config-pills" });
      const timerSubSec = h("div", { class: "mt", style: "display:none;" });

      const timerModes = [
        { id: "none", label: "No Timer (Relaxed)", sub: "Infinite relaxed play" },
        { id: "question", label: "Per Question", sub: "Count down each item" },
        { id: "session", label: "Time Attack", sub: "Total session timer" }
      ];

      function renderTimerSub() {
        timerSubSec.innerHTML = "";
        if (cfg.timerMode === "question") {
          timerSubSec.style.display = "block";
          timerSubSec.appendChild(h("div", { class: "config-label", style: "font-size:0.95rem;" }, ["Duration per question:"]));
          const subPills = h("div", { class: "config-pills" });
          [10, 15, 20, 30].forEach((sec) => {
            subPills.appendChild(h("div", {
              class: "config-pill" + (cfg.questionSec === sec ? " active" : ""),
              onclick: () => {
                cfg.questionSec = sec;
                renderTimerSub();
              }
            }, [h("span", {}, [sec + "s"])]));
          });
          timerSubSec.appendChild(subPills);
        } else if (cfg.timerMode === "session") {
          timerSubSec.style.display = "block";
          timerSubSec.appendChild(h("div", { class: "config-label", style: "font-size:0.95rem;" }, ["Total session duration:"]));
          const subPills = h("div", { class: "config-pills" });
          [60, 90, 120, 180].forEach((sec) => {
            subPills.appendChild(h("div", {
              class: "config-pill" + (cfg.sessionSec === sec ? " active" : ""),
              onclick: () => {
                cfg.sessionSec = sec;
                renderTimerSub();
              }
            }, [h("span", {}, [sec + "s"])]));
          });
          timerSubSec.appendChild(subPills);
        } else {
          timerSubSec.style.display = "none";
        }
      }

      timerModes.forEach((tm) => {
        const pill = h("div", {
          class: "config-pill" + (cfg.timerMode === tm.id ? " active" : ""),
          onclick: () => {
            cfg.timerMode = tm.id;
            updatePills(timerModePills, cfg.timerMode);
            renderTimerSub();
          }
        }, [
          h("span", {}, [tm.label]),
          h("span", { class: "pill-sub" }, [tm.sub])
        ]);
        timerModePills.appendChild(pill);
      });
      timerSec.appendChild(timerModePills);
      timerSec.appendChild(timerSubSec);
      renderTimerSub();
      card.appendChild(timerSec);

      // 3. Bonuses & Lifelines (Toggles)
      const bonusSec = h("div", { class: "config-section" });
      bonusSec.appendChild(h("div", { class: "config-label" }, [
        "Bonuses & Lifelines ", h("small", {}, ["(multipliers & gameplay aids)"])
      ]));

      // Streak Toggle
      const streakRow = h("div", { class: "config-toggle-row" }, [
        h("div", { class: "config-toggle-text" }, [
          h("strong", {}, ["Streak Multiplier"]),
          h("span", {}, ["+1.5x at 3 in a row, +2x at 5, +3x at 10!"])
        ]),
        createSwitch(cfg.enableStreak, (val) => { cfg.enableStreak = val; })
      ]);
      bonusSec.appendChild(streakRow);

      // Speed Bonus Toggle
      const speedRow = h("div", { class: "config-toggle-row mt-sm" }, [
        h("div", { class: "config-toggle-text" }, [
          h("strong", {}, ["Speed Bonus"]),
          h("span", {}, ["Extra points when answering in less than 3s / 6s."])
        ]),
        createSwitch(cfg.enableSpeed, (val) => { cfg.enableSpeed = val; })
      ]);
      bonusSec.appendChild(speedRow);

      // Lifelines Toggle
      const lifelineRow = h("div", { class: "config-toggle-row mt-sm" }, [
        h("div", { class: "config-toggle-text" }, [
          h("strong", {}, ["Lifelines (Jokers)"]),
          h("span", {}, ["2x 50/50, 2x Hint, 2x Skip available per run."])
        ]),
        createSwitch(cfg.enableLifelines, (val) => { cfg.enableLifelines = val; })
      ]);
      bonusSec.appendChild(lifelineRow);
      card.appendChild(bonusSec);

      scr.appendChild(card);

      // Action Buttons
      scr.appendChild(h("div", { class: "row center mt-lg", style: "gap:16px;" }, [
        h("button", {
          class: "btn btn-primary",
          style: "font-size:1.15rem;padding:12px 32px;",
          onclick: () => {
            U().store.set(savedConfigKey, cfg);
            onStart(cfg);
          }
        }, ["Start Playing"]),
        h("button", { class: "btn btn-ghost", onclick: menu }, ["Back"])
      ]));

      function updatePills(container, activeVal) {
        const pills = container.querySelectorAll(".config-pill");
        pills.forEach((p, idx) => {
          const tId = tiers[idx] ? tiers[idx].id : (timerModes[idx] ? timerModes[idx].id : "");
          p.classList.toggle("active", tId === activeVal);
        });
      }

      function createSwitch(initialVal, onChange) {
        const label = h("label", { class: "toggle-switch" });
        const input = h("input", {
          type: "checkbox",
          onchange: (e) => onChange(e.target.checked)
        });
        if (initialVal) input.checked = true;
        const slider = h("span", { class: "toggle-slider" });
        label.appendChild(input);
        label.appendChild(slider);
        return label;
      }
    });
  }

  /* ---------- Enhanced In-Game Header HUD ---------- */
  function renderHUD(scr, title, qIdx, score, cfg, sessionState) {
    const h = U().h;
    const tierObj = {
      easy: { label: "Easy", cls: "easy" },
      medium: { label: "Medium", cls: "medium" },
      hard: { label: "Hard", cls: "hard" },
      all: { label: "All Levels", cls: "all" }
    }[cfg.tier || "all"] || { label: "All Levels", cls: "all" };

    const streakCount = sessionState.streak || 0;
    let multiplierText = "";
    if (cfg.enableStreak && streakCount >= 3) {
      const mult = streakCount >= 10 ? 3.0 : (streakCount >= 5 ? 2.0 : 1.5);
      multiplierText = `x${mult.toFixed(1)} (${streakCount} streak)`;
    }

    const hud = h("div", { class: "solo-score-hud" }, [
      h("div", { class: "row", style: "gap:10px;align-items:center;" }, [
        h("span", { style: "font-weight:900;" }, [title]),
        h("span", { class: "level-badge " + tierObj.cls }, [tierObj.label]),
        multiplierText ? h("span", { class: "solo-streak-badge" }, [multiplierText]) : null
      ]),
      h("div", { class: "row", style: "gap:14px;align-items:center;" }, [
        h("span", {}, ["Q: ", h("b", {}, [String(qIdx + 1)])]),
        h("span", {}, ["Score: ", h("b", { class: "pts" }, [String(score), " pts"])])
      ])
    ]);
    scr.appendChild(hud);
  }

  /* ---------- Timer Component for HUD ---------- */
  function createTimerComponent(cfg, onExpire, sessionState) {
    const h = U().h;
    let timerInterval = null;
    let timeLeft = 0;
    let totalTime = 0;

    if (cfg.timerMode === "question") {
      totalTime = cfg.questionSec || 15;
      timeLeft = totalTime;
    } else if (cfg.timerMode === "session") {
      totalTime = cfg.sessionSec || 90;
      timeLeft = sessionState.sessionTimeRemaining !== undefined ? sessionState.sessionTimeRemaining : totalTime;
    } else {
      return { el: null, start: () => {}, stop: () => {}, getTimeSpent: () => 0 };
    }

    const fill = h("div", { class: "solo-timer-fill", style: "width:100%;" });
    const bar = h("div", { class: "solo-timer-bar" }, [fill]);
    const label = h("span", {}, [Math.ceil(timeLeft) + "s left"]);
    const modeLabel = h("span", {}, [cfg.timerMode === "question" ? "Question Timer" : "Session Timer"]);
    const hudRow = h("div", { class: "solo-timer-hud" }, [modeLabel, label]);

    const container = h("div", {}, [bar, hudRow]);

    const startTime = Date.now();

    function tick() {
      timeLeft -= 0.1;
      if (cfg.timerMode === "session") {
        sessionState.sessionTimeRemaining = timeLeft;
      }
      const pct = Math.max(0, (timeLeft / totalTime) * 100);
      fill.style.width = pct + "%";
      label.textContent = Math.max(0, Math.ceil(timeLeft)) + "s left";

      if (pct <= 25) fill.classList.add("warning");
      else fill.classList.remove("warning");

      if (timeLeft <= 3.5 && timeLeft > 0) {
        U().sfx.tick();
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        onExpire();
      }
    }

    return {
      el: container,
      start: () => {
        clearInterval(timerInterval);
        timerInterval = setInterval(tick, 100);
      },
      stop: () => {
        clearInterval(timerInterval);
      },
      getTimeSpent: () => {
        return Math.max(0.1, (Date.now() - startTime) / 1000);
      }
    };
  }

  /* ---------- Lifelines Component (50/50, Hint, Pass) ---------- */
  function renderLifelines(card, cfg, lifelinesState, handlers) {
    if (!cfg.enableLifelines) return null;
    const h = U().h;

    const row = h("div", { class: "solo-lifelines-bar" });

    // 50/50 Button
    if (handlers.onFiftyFifty) {
      const btn50 = h("button", {
        class: "lifeline-btn",
        disabled: lifelinesState.fiftyFifty <= 0,
        onclick: () => {
          if (lifelinesState.fiftyFifty <= 0) return;
          lifelinesState.fiftyFifty--;
          btn50.disabled = true;
          btn50.querySelector(".lifeline-count").textContent = lifelinesState.fiftyFifty;
          U().sfx.gift();
          handlers.onFiftyFifty();
        }
      }, [
        h("span", {}, ["50/50"]),
        h("span", { class: "lifeline-count" }, [String(lifelinesState.fiftyFifty)])
      ]);
      row.appendChild(btn50);
    }

    // Hint Button
    if (handlers.onHint) {
      const btnHint = h("button", {
        class: "lifeline-btn",
        disabled: lifelinesState.hint <= 0,
        onclick: () => {
          if (lifelinesState.hint <= 0) return;
          lifelinesState.hint--;
          btnHint.disabled = true;
          btnHint.querySelector(".lifeline-count").textContent = lifelinesState.hint;
          U().sfx.gift();
          handlers.onHint();
        }
      }, [
        h("span", {}, ["Hint"]),
        h("span", { class: "lifeline-count" }, [String(lifelinesState.hint)])
      ]);
      row.appendChild(btnHint);
    }

    // Skip / Pass Button
    if (handlers.onSkip) {
      const btnSkip = h("button", {
        class: "lifeline-btn",
        disabled: lifelinesState.skip <= 0,
        onclick: () => {
          if (lifelinesState.skip <= 0) return;
          lifelinesState.skip--;
          btnSkip.disabled = true;
          btnSkip.querySelector(".lifeline-count").textContent = lifelinesState.skip;
          U().sfx.tick();
          handlers.onSkip();
        }
      }, [
        h("span", {}, ["Skip"]),
        h("span", { class: "lifeline-count" }, [String(lifelinesState.skip)])
      ]);
      row.appendChild(btnSkip);
    }

    card.appendChild(row);
  }

  /* ---------- Score Calculation with Bonuses ---------- */
  function computePoints(basePts, timeSpentSec, cfg, sessionState) {
    let pts = basePts || 10;
    let speedBonus = 0;

    // Speed bonus
    if (cfg.enableSpeed && timeSpentSec > 0) {
      if (timeSpentSec <= 3.0) speedBonus = 5;
      else if (timeSpentSec <= 6.0) speedBonus = 3;
    }

    pts += speedBonus;

    // Streak multiplier
    if (cfg.enableStreak) {
      const s = sessionState.streak || 0;
      const mult = s >= 10 ? 3.0 : (s >= 5 ? 2.0 : (s >= 3 ? 1.5 : 1.0));
      pts = Math.round(pts * mult);
    }

    return { total: pts, speedBonus };
  }

  /* ---------- Solo Menu ---------- */
  function menu() {
    U().show((scr) => {
      const h = U().h;
      const streak = U().store.get("streak", 0);
      const learned = U().store.get("learned", 0);

      scr.appendChild(h("h2", { class: "section-title" }, ["Play solo"]));
      scr.appendChild(h("p", { class: "section-sub" }, [
        "Practise with customizable timers, streak multipliers, lifelines & SQLite validation."
      ]));

      scr.appendChild(h("div", { class: "hud" }, [
        h("span", {}, ["Daily Streak: ", h("b", { class: "badge-streak" }, [String(streak), " day(s)"])]),
        h("span", {}, ["Words seen: ", h("b", {}, [String(learned)])])
      ]));

      const games = [
        { id: "match", t: "Word Match", s: "Match picture to word with customizable timer" },
        { id: "spelling", t: "Spelling Bee", s: "Listen & type spelling (sqlite checked)" },
        { id: "alphabet", t: "Alphabet Race", s: "Race A to Z against customizable clock" },
        { id: "pronounce", t: "Pronunciation Drill", s: "Tricky words, IPA, model speech & mic" },
        { id: "fill",  t: "Fill in the Blank", s: "Interactive grammar with speed bonuses" },
        { id: "irregular", t: "Irregular Verbs", s: "Past, participle & definitions with streak" },
        { id: "phrasal", t: "Phrasal Verbs", s: "Verb meanings in FR or EN with lifelines" },
        { id: "anagram", t: "Anagram", s: "Unscramble letters with configurable time" },
        { id: "mystery", t: "Mystery Object", s: "Guess mystery items with clues & audio" }
      ];

      const grid = h("div", { class: "choice-grid mt" });
      games.forEach((g) => {
        grid.appendChild(h("div", { class: "choice", onclick: () => start(g.id) }, [
          h("h4", {}, [g.t]),
          h("small", {}, [g.s])
        ]));
      });
      scr.appendChild(grid);
    });
  }

  function start(id) {
    if (id === "match") wordMatch();
    else if (id === "spelling") spellingBee();
    else if (id === "alphabet") alphabetRace();
    else if (id === "pronounce") pronunciationDrill();
    else if (id === "fill") fillBlank();
    else if (id === "irregular") irregularVerbs();
    else if (id === "phrasal") phrasalVerbs();
    else if (id === "anagram") anagram();
    else if (id === "mystery") mysteryObject();
  }

  /* ---------- Progress (daily streak + counter) ---------- */
  function markProgress(correctCount) {
    const learned = U().store.get("learned", 0) + correctCount;
    U().store.set("learned", learned);
    const today = new Date().toISOString().slice(0, 10);
    const last = U().store.get("lastPlay", null);
    let streak = U().store.get("streak", 0);
    if (last !== today) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      streak = last === yesterday ? streak + 1 : 1;
      U().store.set("streak", streak);
      U().store.set("lastPlay", today);
    }
  }

  /* ---------- Comprehensive End-of-Round Screen ---------- */
  function roundEnd(title, score, totalAnswered, maxStreak, again) {
    markProgress(score);
    U().sfx.win();
    U().confetti(1800);
    U().show((scr) => {
      const h = U().h;
      const summary = totalAnswered > 0
        ? `${score} pts · ${totalAnswered} questions played`
        : `${score} pts`;

      const card = h("div", { class: "play-card solo-play-card" });
      card.appendChild(h("h2", { class: "section-title" }, ["Session complete!"]));
      card.appendChild(h("p", { class: "section-sub" }, [title]));
      card.appendChild(h("div", { class: "prompt-word" }, [summary]));

      if (maxStreak >= 3) {
        card.appendChild(h("div", { class: "row center mt mb" }, [
          h("span", { class: "solo-streak-badge" }, [`Best Streak: ${maxStreak} in a row!`])
        ]));
      }

      card.appendChild(h("div", { class: "row center mt-lg", style: "gap:16px;" }, [
        h("button", { class: "btn btn-primary", onclick: again }, ["Play again"]),
        h("button", { class: "btn btn-ghost", onclick: menu }, ["Other games"])
      ]));

      scr.appendChild(card);
    }, { replace: true });
  }

  /* =================================================================
     GAME 1 — Word Match
     ================================================================= */
  function wordMatch() {
    renderGameConfig("Word Match", "🧩", "Match the image to the correct English word.", "wordMatch", startWordMatch);
  }

  function startWordMatch(cfg) {
    let vocab = C().vocabulary || [];
    if (cfg.tier && cfg.tier !== "all") {
      const filtered = vocab.filter((v) => {
        const len = (v.en || "").length;
        if (cfg.tier === "easy") return len <= 5 || (v.level || "easy") === "easy";
        if (cfg.tier === "medium") return (len > 5 && len <= 7) || (v.level || "medium") === "medium";
        if (cfg.tier === "hard") return len >= 7 || (v.level || "hard") === "hard";
        return true;
      });
      if (filtered.length >= 4) vocab = filtered;
    }
    if (!vocab.length) { U().alertBox("No vocabulary words available for this tier!"); return; }

    const deck = U().newSessionDeck(vocab, "solo_wordMatch_" + cfg.tier);
    let i = 0, score = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const lifelines = { fiftyFifty: 2, hint: 2, skip: 2 };

    function question() {
      const item = deck.drawInfinite();
      if (!item) { roundEnd("Word Match", score, i, maxStreak, () => startWordMatch(cfg)); return; }
      const distractors = U().pickDistractors(vocab, item, 3, (w) => w.en);
      const options = U().shuffle([item].concat(distractors));

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "🧩 Word Match", i, score, cfg, sessionState);

        const card = h("div", { class: "play-card solo-play-card" });
        card.appendChild(h("div", { class: "prompt-emoji" }, [item.emoji || "❓"]));
        card.appendChild(h("p", { class: "section-sub" }, ["Which English word matches this image?"]));

        // Timer
        const timer = createTimerComponent(cfg, () => onTimeUp(), sessionState);
        if (timer.el) card.appendChild(timer.el);

        const optWrap = h("div", { class: "options mt" });
        const buttons = [];
        options.forEach((o) => {
          const b = h("button", { class: "opt", onclick: () => choose(o, b) }, [o.en]);
          buttons.push(b);
          optWrap.appendChild(b);
        });
        card.appendChild(optWrap);

        const fb = h("div", { class: "feedback" });
        card.appendChild(fb);

        // Lifelines
        renderLifelines(card, cfg, lifelines, {
          onFiftyFifty: () => {
            let removed = 0;
            buttons.forEach((b) => {
              if (b.textContent !== item.en && removed < 2) {
                b.style.visibility = "hidden";
                b.disabled = true;
                removed++;
              }
            });
          },
          onHint: () => {
            if (item.fr) fb.innerHTML = `<span class="fr">💡 Indice français : <b>${item.fr}</b></span>`;
          },
          onSkip: () => {
            timer.stop();
            fb.className = "feedback";
            fb.textContent = `⏭️ Skipped. Answer was: ${item.en}`;
            setTimeout(next, 1000);
          }
        });

        // Stop button
        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => { timer.stop(); roundEnd("Word Match", score, i, maxStreak, () => startWordMatch(cfg)); } }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);
        timer.start();

        let answered = false;
        function choose(chosen, btn) {
          if (answered) return;
          answered = true;
          timer.stop();
          const timeSpent = timer.getTimeSpent();
          buttons.forEach((b) => (b.disabled = true));

          if (chosen.en === item.en) {
            btn.classList.add("correct");
            U().sfx.correct();
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;

            const ptsData = computePoints(10, timeSpent, cfg, sessionState);
            score += ptsData.total;

            fb.className = "feedback ok";
            fb.innerHTML = `Well done! ✅ +${ptsData.total} pts ${ptsData.speedBonus ? '<span class="solo-bonus-tag">⚡ Speed +' + ptsData.speedBonus + '</span>' : ''} (${item.en} = ${item.fr || ""})`;
          } else {
            btn.classList.add("wrong");
            U().sfx.wrong();
            sessionState.streak = 0;
            const correctBtn = buttons.find((b) => b.textContent === item.en);
            if (correctBtn) correctBtn.classList.add("correct");
            fb.className = "feedback no";
            fb.textContent = `The answer: ${item.emoji || ""} ${item.en} (${item.fr || ""})`;
          }
          U().speak(item.en);
          setTimeout(next, 1500);
        }

        function onTimeUp() {
          if (answered) return;
          answered = true;
          sessionState.streak = 0;
          buttons.forEach((b) => (b.disabled = true));
          const correctBtn = buttons.find((b) => b.textContent === item.en);
          if (correctBtn) correctBtn.classList.add("correct");
          fb.className = "feedback no";
          fb.textContent = `⏰ Time's up! Answer was: ${item.en}`;
          U().sfx.wrong();
          U().speak(item.en);
          if (cfg.timerMode === "session") {
            setTimeout(() => roundEnd("Word Match", score, i, maxStreak, () => startWordMatch(cfg)), 1600);
          } else {
            setTimeout(next, 1600);
          }
        }
      }, { replace: i > 0 });
    }

    function next() { i++; question(); }
    question();
  }

  /* =================================================================
     GAME 2 — Spelling Bee
     ================================================================= */
  function spellingBee() {
    renderGameConfig("Spelling Bee", "🐝", "Listen carefully & type the correct English spelling.", "spellingBee", startSpellingBee);
  }

  function startSpellingBee(cfg) {
    const vocabPool = (C().vocabulary || []).map(v => ({ word: v.en, tier: v.level || ((v.en || "").length <= 5 ? "easy" : (v.en || "").length <= 7 ? "medium" : "hard") }));
    const spellingPool = (C().spellingWords || []).map(w => typeof w === 'string' ? { word: w, tier: w.length <= 5 ? "easy" : w.length <= 7 ? "medium" : "hard" } : w);
    let fullPool = U().uniqueById(vocabPool.concat(spellingPool));

    if (cfg.tier && cfg.tier !== "all") {
      const filtered = fullPool.filter((w) => (w.tier || "medium") === cfg.tier);
      if (filtered.length >= 4) fullPool = filtered;
    }
    if (!fullPool.length) { U().alertBox("No spelling words available for this tier!"); return; }

    const deck = U().newSessionDeck(fullPool, "solo_spelling_" + cfg.tier);
    let i = 0, score = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const lifelines = { hint: 2, skip: 2 };

    function question() {
      const item = deck.drawInfinite();
      if (!item) { roundEnd("Spelling Bee", score, i, maxStreak, () => startSpellingBee(cfg)); return; }
      const target = (typeof item === 'string' ? item : (item.word || item.en || "")).trim();

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "🐝 Spelling Bee", i, score, cfg, sessionState);

        const card = h("div", { class: "play-card solo-play-card" });
        const audioHeader = h("div", { class: "center mb" }, [
          h("div", { class: "prompt-emoji" }, ["🎧"]),
          h("p", { class: "section-sub" }, ["Listen carefully and spell the word!"])
        ]);
        card.appendChild(audioHeader);

        // Timer
        const timer = createTimerComponent(cfg, () => onTimeUp(), sessionState);
        if (timer.el) card.appendChild(timer.el);

        const soundWrap = h("div", { class: "row center mt mb", style: "gap:12px;" }, [
          h("button", { class: "btn btn-primary", onclick: () => U().speak(target) }, ["🔊 Listen"]),
          h("button", { class: "btn btn-ghost", onclick: () => U().speak(target, { slow: true }) }, ["🐢 Listen slowly"])
        ]);
        card.appendChild(soundWrap);

        const input = h("input", {
          type: "text",
          class: "input-text mt",
          placeholder: "Type what you hear...",
          autocomplete: "off",
          style: "font-size:1.25rem;text-align:center;max-width:340px;margin:14px auto;display:block;"
        });
        const checkBtn = h("button", { class: "btn btn-green mt", onclick: () => submit() }, ["Check spelling ✓"]);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

        card.appendChild(input);
        card.appendChild(checkBtn);

        const fb = h("div", { class: "feedback mt" });
        card.appendChild(fb);

        // Lifelines
        renderLifelines(card, cfg, lifelines, {
          onHint: () => {
            const firstLetter = target.charAt(0).toUpperCase();
            const stars = "_ ".repeat(target.length - 1);
            fb.innerHTML = `<span class="fr">💡 Indice : Commence par <b>${firstLetter}</b> (${target.length} lettres : ${firstLetter} ${stars})</span>`;
          },
          onSkip: () => {
            timer.stop();
            fb.textContent = `⏭️ Skipped. The spelling was: "${target}"`;
            setTimeout(next, 1200);
          }
        });

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => { timer.stop(); roundEnd("Spelling Bee", score, i, maxStreak, () => startSpellingBee(cfg)); } }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);
        timer.start();
        setTimeout(() => U().speak(target), 300);
        setTimeout(() => { try { input.focus(); } catch (e) {} }, 100);

        let answered = false;
        async function submit() {
          if (answered) return;
          const userVal = (input.value || "").trim();
          if (!userVal) return;
          answered = true;
          timer.stop();
          input.disabled = true;
          checkBtn.disabled = true;
          const timeSpent = timer.getTimeSpent();

          const isMatch = userVal.toLowerCase() === target.toLowerCase();
          const isValidSqlite = await U().validateEnglishWord(userVal);

          if (isMatch) {
            U().sfx.correct();
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;

            const ptsData = computePoints(12, timeSpent, cfg, sessionState);
            score += ptsData.total;

            fb.className = "feedback ok";
            fb.innerHTML = `Correct! ✅ +${ptsData.total} pts ${ptsData.speedBonus ? '<span class="solo-bonus-tag">⚡ Speed +' + ptsData.speedBonus + '</span>' : ''} (${target})`;
          } else {
            U().sfx.wrong();
            sessionState.streak = 0;
            fb.className = "feedback no";
            fb.textContent = `❌ You wrote "${userVal}" ${isValidSqlite ? '(valid word)' : ''} — correct spelling: "${target}"`;
          }
          U().speak(target);
          setTimeout(next, 1800);
        }

        function onTimeUp() {
          if (answered) return;
          answered = true;
          sessionState.streak = 0;
          input.disabled = true;
          checkBtn.disabled = true;
          fb.className = "feedback no";
          fb.textContent = `⏰ Time's up! Correct spelling was: "${target}"`;
          U().sfx.wrong();
          U().speak(target);
          if (cfg.timerMode === "session") {
            setTimeout(() => roundEnd("Spelling Bee", score, i, maxStreak, () => startSpellingBee(cfg)), 1800);
          } else {
            setTimeout(next, 1800);
          }
        }
      }, { replace: i > 0 });
    }

    function next() { i++; question(); }
    question();
  }

  /* =================================================================
     GAME 3 — Fill in the Blank (Grammar)
     ================================================================= */
  function fillBlank() {
    renderGameConfig("Fill in the Blank", "✍️", "Grammar challenges: choose the missing word with speed bonuses.", "fillBlank", startFillBlank);
  }

  function startFillBlank(cfg) {
    const grammar = C().grammar || [];
    if (!grammar.length) { U().alertBox("No grammar sentences available!"); return; }
    const deck = U().newSessionDeck(grammar, "solo_fillBlank");
    let i = 0, score = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const lifelines = { fiftyFifty: 2, hint: 2, skip: 2 };

    function question() {
      const item = deck.drawInfinite();
      if (!item) { roundEnd("Fill in the Blank", score, i, maxStreak, () => startFillBlank(cfg)); return; }
      const options = U().shuffle(item.options || []);

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "✍️ Fill in the Blank", i, score, cfg, sessionState);

        const card = h("div", { class: "play-card solo-play-card" });
        card.appendChild(h("small", { class: "section-sub" }, [item.cat || "Grammar"]));
        card.appendChild(h("div", { class: "prompt-word", style: "font-size: clamp(1.4rem,4vw,2.2rem)" }, [
          (item.sentence || "").replace("___", "____")
        ]));

        // Timer
        const timer = createTimerComponent(cfg, () => onTimeUp(), sessionState);
        if (timer.el) card.appendChild(timer.el);

        const optWrap = h("div", { class: "options mt" });
        const buttons = [];
        options.forEach((o) => {
          const b = h("button", { class: "opt", onclick: () => choose(o, b) }, [o]);
          buttons.push(b);
          optWrap.appendChild(b);
        });
        card.appendChild(optWrap);

        const fb = h("div", { class: "feedback mt" });
        card.appendChild(fb);

        // Lifelines
        renderLifelines(card, cfg, lifelines, {
          onFiftyFifty: () => {
            let removed = 0;
            buttons.forEach((b) => {
              if (b.textContent !== item.answer && removed < 2) {
                b.style.visibility = "hidden";
                b.disabled = true;
                removed++;
              }
            });
          },
          onHint: () => {
            if (item.meaning || item.fr) {
              fb.innerHTML = `<span class="fr">💡 Indice : ${item.meaning ? '🇬🇧 ' + item.meaning : ''} ${item.fr ? '🇫🇷 ' + item.fr : ''}</span>`;
            }
          },
          onSkip: () => {
            timer.stop();
            fb.textContent = `⏭️ Skipped. Answer was: ${item.answer}`;
            setTimeout(next, 1200);
          }
        });

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => { timer.stop(); roundEnd("Fill in the Blank", score, i, maxStreak, () => startFillBlank(cfg)); } }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);
        timer.start();

        let answered = false;
        function choose(chosen, btn) {
          if (answered) return;
          answered = true;
          timer.stop();
          const timeSpent = timer.getTimeSpent();
          buttons.forEach((b) => (b.disabled = true));
          const full = (item.sentence || "").replace("___", item.answer);

          if (chosen === item.answer) {
            btn.classList.add("correct");
            U().sfx.correct();
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;

            const ptsData = computePoints(10, timeSpent, cfg, sessionState);
            score += ptsData.total;

            fb.className = "feedback ok";
            fb.innerHTML = `Correct! ✅ +${ptsData.total} pts ${ptsData.speedBonus ? '<span class="solo-bonus-tag">⚡ Speed +' + ptsData.speedBonus + '</span>' : ''}`;
          } else {
            btn.classList.add("wrong");
            U().sfx.wrong();
            sessionState.streak = 0;
            const correctBtn = buttons.find((b) => b.textContent === item.answer);
            if (correctBtn) correctBtn.classList.add("correct");
            fb.className = "feedback no";
            fb.textContent = "Answer: " + full;
          }
          fb.appendChild(U().h("span", { class: "fr" }, [" 🔊 " + full]));
          U().speak(full);
          setTimeout(next, 1700);
        }

        function onTimeUp() {
          if (answered) return;
          answered = true;
          sessionState.streak = 0;
          buttons.forEach((b) => (b.disabled = true));
          const full = (item.sentence || "").replace("___", item.answer);
          const correctBtn = buttons.find((b) => b.textContent === item.answer);
          if (correctBtn) correctBtn.classList.add("correct");
          fb.className = "feedback no";
          fb.textContent = `⏰ Time's up! Answer: ${full}`;
          U().sfx.wrong();
          U().speak(full);
          if (cfg.timerMode === "session") {
            setTimeout(() => roundEnd("Fill in the Blank", score, i, maxStreak, () => startFillBlank(cfg)), 1800);
          } else {
            setTimeout(next, 1800);
          }
        }
      }, { replace: i > 0 });
    }

    function next() { i++; question(); }
    question();
  }

  /* =================================================================
     GAME 4 — Irregular Verbs
     ================================================================= */
  function irregularVerbs() {
    renderGameConfig("Irregular Verbs", "🔁", "Test your knowledge of past forms, participles & meanings.", "irregularVerbs", startIrregularVerbs);
  }

  function startIrregularVerbs(cfg) {
    const pool = (C().irregularVerbs || []).filter((v) => v && v.verb && v.past && v.participle);
    if (pool.length < 4) { U().alertBox("Not enough irregular verbs available!"); return; }

    const deck = U().newSessionDeck(pool, "solo_irregular");
    let i = 0, score = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const lifelines = { hint: 2, skip: 2 };

    function normalize(text) { return String(text || "").trim().toLowerCase(); }
    function pickQuestionType() {
      const roll = Math.random();
      if (roll < 0.55) return "participle";
      if (roll < 0.85) return "past";
      return "meaning";
    }

    function pickDistractors(item, field, count) {
      const correct = normalize(item[field] || "");
      const others = U().shuffle(pool.filter((v) => v.verb !== item.verb))
        .map((v) => (field === "meaning" ? (v.meaning || v.fr) : (field === "past" ? v.past : v.participle)))
        .filter((m) => m && normalize(m) !== correct);
      const unique = [];
      others.forEach((m) => {
        const norm = normalize(m);
        if (!unique.some((x) => normalize(x) === norm)) unique.push(m);
      });
      return unique.slice(0, count);
    }

    function question() {
      const item = deck.drawInfinite();
      if (!item) { roundEnd("Irregular Verbs", score, i, maxStreak, () => startIrregularVerbs(cfg)); return; }

      const type = pickQuestionType();
      let prompt = "", correct = "", options = [];

      if (type === "past") {
        prompt = `What is the past simple of "${item.verb}"?`;
        correct = item.past;
      } else if (type === "participle") {
        prompt = `What is the past participle of "${item.verb}"?`;
        correct = item.participle;
      } else {
        const field = Math.random() > 0.5 ? "meaning" : "fr";
        const correctValue = item[field] || item.meaning || item.fr;
        prompt = `Which definition matches "${item.verb}"?`;
        correct = correctValue;
        options = U().shuffle([correctValue].concat(pickDistractors(item, field, 3)));
      }

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "🔁 Irregular Verbs", i, score, cfg, sessionState);

        const card = h("div", { class: "play-card solo-play-card" });
        card.appendChild(h("small", { class: "section-sub" }, [type === "past" ? "Past simple" : type === "participle" ? "Past participle" : "Definition"]));
        card.appendChild(h("div", { class: "prompt-word", style: "font-size:clamp(1.6rem,5vw,2.6rem)" }, [item.verb]));
        card.appendChild(h("p", { class: "section-sub" }, [prompt]));

        // Timer
        const timer = createTimerComponent(cfg, () => onTimeUp(), sessionState);
        if (timer.el) card.appendChild(timer.el);

        const fb = h("div", { class: "feedback mt" });
        let buttons = [];

        if (type === "meaning") {
          const optWrap = h("div", { class: "options mt" });
          options.forEach((o) => {
            const b = h("button", { class: "opt", onclick: () => choose(o, b) }, [o]);
            buttons.push(b);
            optWrap.appendChild(b);
          });
          card.appendChild(optWrap);
        } else {
          const input = h("input", {
            type: "text",
            placeholder: type === "past" ? "Write the past simple..." : "Write the past participle...",
            style: "width:100%;max-width:340px;padding:12px;border-radius:10px;border:1px solid var(--line);margin:12px auto;display:block;text-align:center;font-size:1.15rem;"
          });
          const checkBtn = h("button", { class: "btn btn-primary mt", onclick: () => choose(input.value) }, ["Check"]);
          input.addEventListener("keydown", (e) => { if (e.key === "Enter") choose(input.value); });
          card.appendChild(input);
          card.appendChild(checkBtn);
          setTimeout(() => { try { input.focus(); } catch (e) {} }, 100);
        }

        card.appendChild(fb);

        // Lifelines
        renderLifelines(card, cfg, lifelines, {
          onHint: () => {
            const hintText = type === "meaning" ? `💡 Français : ${item.fr || item.meaning}` : `💡 Commence par "${correct.charAt(0).toUpperCase()}" (${correct.length} lettres)`;
            fb.innerHTML = `<span class="fr">${hintText}</span>`;
          },
          onSkip: () => {
            timer.stop();
            fb.textContent = `⏭️ Skipped. Correct answer was: ${correct}`;
            setTimeout(next, 1200);
          }
        });

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => { timer.stop(); roundEnd("Irregular Verbs", score, i, maxStreak, () => startIrregularVerbs(cfg)); } }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);
        timer.start();

        let answered = false;
        function choose(answer, btn) {
          if (answered) return;
          answered = true;
          timer.stop();
          const timeSpent = timer.getTimeSpent();
          const isCorrect = normalize(answer) === normalize(correct);

          if (isCorrect) {
            if (btn) btn.classList.add("correct");
            U().sfx.correct();
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;

            const ptsData = computePoints(12, timeSpent, cfg, sessionState);
            score += ptsData.total;

            fb.className = "feedback ok";
            fb.innerHTML = `Correct! ✅ +${ptsData.total} pts ${ptsData.speedBonus ? '<span class="solo-bonus-tag">⚡ Speed +' + ptsData.speedBonus + '</span>' : ''}`;
          } else {
            if (btn) btn.classList.add("wrong");
            U().sfx.wrong();
            sessionState.streak = 0;
            if (type === "meaning" && buttons.length) {
              const correctBtn = buttons.find((b) => normalize(b.textContent) === normalize(correct));
              if (correctBtn) correctBtn.classList.add("correct");
            }
            fb.className = "feedback no";
            fb.textContent = `Answer: ${correct} (Verb: ${item.verb} · Past: ${item.past} · Participle: ${item.participle})`;
          }
          setTimeout(next, 1600);
        }

        function onTimeUp() {
          if (answered) return;
          answered = true;
          sessionState.streak = 0;
          fb.className = "feedback no";
          fb.textContent = `⏰ Time's up! Answer was: ${correct}`;
          U().sfx.wrong();
          if (cfg.timerMode === "session") {
            setTimeout(() => roundEnd("Irregular Verbs", score, i, maxStreak, () => startIrregularVerbs(cfg)), 1800);
          } else {
            setTimeout(next, 1800);
          }
        }
      }, { replace: i > 0 });
    }

    function next() { i++; question(); }
    question();
  }

  /* =================================================================
     GAME 5 — Phrasal Verbs
     ================================================================= */
  function phrasalVerbs() {
    renderGameConfig("Phrasal Verbs", "🔗", "Master common English phrasal verbs & their meanings.", "phrasalVerbs", startPhrasalVerbs);
  }

  function startPhrasalVerbs(cfg) {
    const pool = (C().phrasalVerbs || []).filter((v) => v && v.verb && (v.meaning || v.fr));
    if (pool.length < 4) { U().alertBox("Not enough phrasal verbs available!"); return; }

    const deck = U().newSessionDeck(pool, "solo_phrasal");
    let i = 0, score = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const lifelines = { fiftyFifty: 2, hint: 2, skip: 2 };
    const lang = "fr"; // Default to French explanations

    function pickDistractors(item, count) {
      const correct = item.fr || item.meaning;
      const others = U().shuffle(pool.filter((v) => v.verb !== item.verb))
        .map((v) => v.fr || v.meaning)
        .filter((m) => m && m !== correct);
      const unique = [];
      others.forEach((m) => { if (!unique.includes(m)) unique.push(m); });
      return unique.slice(0, count);
    }

    function question() {
      const item = deck.drawInfinite();
      if (!item) { roundEnd("Phrasal Verbs", score, i, maxStreak, () => startPhrasalVerbs(cfg)); return; }
      const correct = item.fr || item.meaning;
      const distractors = pickDistractors(item, 3);
      const options = U().shuffle([correct].concat(distractors));

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "🔗 Phrasal Verbs", i, score, cfg, sessionState);

        const card = h("div", { class: "play-card solo-play-card" });
        card.appendChild(h("small", { class: "section-sub" }, ["What does this phrasal verb mean?"]));
        card.appendChild(h("div", { class: "prompt-word", style: "font-size:clamp(1.6rem,5vw,2.6rem)" }, [item.verb]));

        card.appendChild(h("button", {
          class: "speaker mt", style: "margin:8px auto;display:block",
          onclick: () => U().speak(item.verb)
        }, ["🔊 Listen"]));

        // Timer
        const timer = createTimerComponent(cfg, () => onTimeUp(), sessionState);
        if (timer.el) card.appendChild(timer.el);

        const optWrap = h("div", { class: "options mt" });
        const buttons = [];
        options.forEach((o) => {
          const b = h("button", { class: "opt", onclick: () => choose(o, b) }, [o]);
          buttons.push(b);
          optWrap.appendChild(b);
        });
        card.appendChild(optWrap);

        const fb = h("div", { class: "feedback mt" });
        card.appendChild(fb);

        // Lifelines
        renderLifelines(card, cfg, lifelines, {
          onFiftyFifty: () => {
            let removed = 0;
            buttons.forEach((b) => {
              if (b.textContent !== correct && removed < 2) {
                b.style.visibility = "hidden";
                b.disabled = true;
                removed++;
              }
            });
          },
          onHint: () => {
            if (item.meaning) fb.innerHTML = `<span class="fr">💡 English context: <i>"${item.meaning}"</i></span>`;
          },
          onSkip: () => {
            timer.stop();
            fb.textContent = `⏭️ Skipped. Meaning was: ${correct}`;
            setTimeout(next, 1200);
          }
        });

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => { timer.stop(); roundEnd("Phrasal Verbs", score, i, maxStreak, () => startPhrasalVerbs(cfg)); } }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);
        timer.start();

        let answered = false;
        function choose(chosen, btn) {
          if (answered) return;
          answered = true;
          timer.stop();
          const timeSpent = timer.getTimeSpent();
          buttons.forEach((b) => (b.disabled = true));

          if (chosen === correct) {
            btn.classList.add("correct");
            U().sfx.correct();
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;

            const ptsData = computePoints(10, timeSpent, cfg, sessionState);
            score += ptsData.total;

            fb.className = "feedback ok";
            fb.innerHTML = `Correct! ✅ +${ptsData.total} pts ${ptsData.speedBonus ? '<span class="solo-bonus-tag">⚡ Speed +' + ptsData.speedBonus + '</span>' : ''}`;
          } else {
            btn.classList.add("wrong");
            U().sfx.wrong();
            sessionState.streak = 0;
            const correctBtn = buttons.find((b) => b.textContent === correct);
            if (correctBtn) correctBtn.classList.add("correct");
            fb.className = "feedback no";
            fb.textContent = "Answer: " + correct;
          }
          if (item.meaning) {
            fb.appendChild(h("div", { class: "fr mt", style: "margin-top:6px" }, ["🇬🇧 " + item.meaning]));
          }
          setTimeout(next, 1800);
        }

        function onTimeUp() {
          if (answered) return;
          answered = true;
          sessionState.streak = 0;
          buttons.forEach((b) => (b.disabled = true));
          const correctBtn = buttons.find((b) => b.textContent === correct);
          if (correctBtn) correctBtn.classList.add("correct");
          fb.className = "feedback no";
          fb.textContent = `⏰ Time's up! Meaning: ${correct}`;
          U().sfx.wrong();
          if (cfg.timerMode === "session") {
            setTimeout(() => roundEnd("Phrasal Verbs", score, i, maxStreak, () => startPhrasalVerbs(cfg)), 1800);
          } else {
            setTimeout(next, 1800);
          }
        }
      }, { replace: i > 0 });
    }

    function next() { i++; question(); }
    question();
  }

  /* =================================================================
     GAME 6 — Anagram (Configurable)
     ================================================================= */
  function anagram() {
    renderGameConfig("Anagram", "🔤", "Unscramble letters against customizable clocks & streak bonuses.", "anagram", startAnagram);
  }

  function startAnagram(cfg) {
    const anagramWords = C().anagramWords || [];
    if (!anagramWords.length) { U().alertBox("No anagram words available!"); return; }

    const deck = U().newSessionDeck(anagramWords, "solo_anagram");
    let score = 0, i = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const lifelines = { hint: 3, skip: 3 };

    function findVocab(w) {
      return (C().vocabulary || []).find((v) => v.en.toLowerCase() === w.toLowerCase());
    }

    function question() {
      const word = deck.drawInfinite();
      if (!word) { roundEnd("Anagram", score, i, maxStreak, () => startAnagram(cfg)); return; }

      const meta = findVocab(word) || { emoji: "🔤" };
      let scrambled = [];
      for (let t = 0; t < 5; t++) {
        scrambled = U().shuffle(word.split(""));
        if (scrambled.join("") !== word || word.length <= 1) break;
      }

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "🔤 Anagram", i, score, cfg, sessionState);

        const card = h("div", { class: "play-card solo-play-card" });
        const emojiEl = h("div", { class: "prompt-emoji" }, [meta.emoji || "🔤"]);
        card.appendChild(emojiEl);

        // Letter Tiles
        const tilesBox = h("div", { class: "wb-letters" });
        scrambled.forEach((l) => tilesBox.appendChild(h("span", { class: "wb-tile" }, [l.toUpperCase()])));
        card.appendChild(tilesBox);

        const hintEl = h("p", { class: "section-sub", style: "text-align:center" }, ["Hint: " + word.length + " letters"]);
        card.appendChild(hintEl);

        // Timer
        const timer = createTimerComponent(cfg, () => onTimeUp(), sessionState);
        if (timer.el) card.appendChild(timer.el);

        const input = h("input", {
          type: "text",
          class: "input-text mt",
          placeholder: "Type the unscrambled word...",
          autocomplete: "off",
          style: "font-size:1.25rem;text-align:center;max-width:340px;margin:14px auto;display:block;"
        });
        const submitBtn = h("button", { class: "btn btn-primary", onclick: () => submit() }, ["Check ✓"]);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

        card.appendChild(h("div", { class: "wc-input-row" }, [input, submitBtn]));

        const speakBtn = h("button", { class: "speaker mt", title: "Listen", onclick: () => U().speak(word) }, ["🔊 Listen"]);
        card.appendChild(h("div", { class: "row center mt" }, [speakBtn]));

        const feedback = h("div", { class: "feedback mt" });
        card.appendChild(feedback);

        // Lifelines
        renderLifelines(card, cfg, lifelines, {
          onHint: () => {
            const first = word.charAt(0).toUpperCase();
            feedback.innerHTML = `<span class="fr">💡 Indice : Commence par <b>${first}</b> ${meta.fr ? '(Français: ' + meta.fr + ')' : ''}</span>`;
          },
          onSkip: () => {
            timer.stop();
            feedback.textContent = `⏭️ The word was: ${word}`;
            U().speak(word);
            setTimeout(next, 1200);
          }
        });

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => { timer.stop(); roundEnd("Anagram", score, i, maxStreak, () => startAnagram(cfg)); } }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);
        timer.start();
        setTimeout(() => { try { input.focus(); } catch (e) {} }, 80);

        let answered = false;
        function submit() {
          if (answered) return;
          const raw = (input.value || "").trim();
          if (!raw) return;

          if (raw.toLowerCase() === word.toLowerCase()) {
            answered = true;
            timer.stop();
            const timeSpent = timer.getTimeSpent();
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;

            const ptsData = computePoints(10, timeSpent, cfg, sessionState);
            score += ptsData.total;

            U().sfx.correct();
            feedback.className = "feedback ok";
            feedback.innerHTML = `Perfect! ✅ +${ptsData.total} pts ${ptsData.speedBonus ? '<span class="solo-bonus-tag">⚡ Speed +' + ptsData.speedBonus + '</span>' : ''} (${word})`;
            U().speak(word);
            setTimeout(next, 1400);
          } else {
            U().sfx.wrong();
            sessionState.streak = 0;
            feedback.className = "feedback no";
            feedback.textContent = `❌ "${raw}" is incorrect. Try again!`;
          }
        }

        function onTimeUp() {
          if (answered) return;
          answered = true;
          sessionState.streak = 0;
          input.disabled = true;
          submitBtn.disabled = true;
          feedback.className = "feedback no";
          feedback.textContent = `⏰ Time's up! The word was: ${word}`;
          U().sfx.wrong();
          U().speak(word);
          if (cfg.timerMode === "session") {
            setTimeout(() => roundEnd("Anagram", score, i, maxStreak, () => startAnagram(cfg)), 1800);
          } else {
            setTimeout(next, 1800);
          }
        }
      }, { replace: i > 0 });
    }

    function next() { i++; question(); }
    question();
  }

  /* =================================================================
     GAME 7 — Pronunciation Drill
     ================================================================= */
  function pronunciationDrill() {
    renderGameConfig("Pronunciation Drill", "🗣️", "Master tricky English words, silent letters & phonetics.", "pronounce", startPronounceRound);
  }

  function startPronounceRound(cfg) {
    let pool = U().uniqueById(C().pronunciationWords || []);
    if (cfg.tier && cfg.tier !== "all") {
      const filtered = pool.filter((w) => (w.tier || "medium") === cfg.tier);
      if (filtered.length >= 3) pool = filtered;
    }
    const deck = U().newSessionDeck(pool, "solo_pronounce_" + (cfg.tier || "all"));
    let i = 0, score = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const canListen = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    function question() {
      const item = deck.drawInfinite();
      if (!item) { roundEnd("Pronunciation Drill", score, i, maxStreak, () => startPronounceRound(cfg)); return; }
      let isVerified = false;

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "🗣️ Pronunciation", i, score, cfg, sessionState);

        const card = h("div", { class: "play-card pronounce-card solo-play-card" });
        card.appendChild(h("div", { class: "pron-trap" }, [item.trap || "pronunciation"]));
        card.appendChild(h("div", { class: "prompt-word pron-word" }, [item.word]));

        const status = h("div", { class: "pron-status" }, [
          "1) Say the word out loud · 2) Tap 'Verify' to see IPA & compare"
        ]);
        card.appendChild(status);

        // Revealed Box
        const revealedBox = h("div", { class: "pron-revealed-box", style: "display:none; width:100%;" });
        revealedBox.appendChild(h("div", { class: "pron-ipa mt-sm" }, [item.ipa || ""]));
        if (item.fr) revealedBox.appendChild(h("p", { class: "pron-fr" }, ["🇫🇷 " + item.fr]));
        if (item.tip) {
          revealedBox.appendChild(h("div", { class: "pron-tip" }, [
            h("strong", {}, ["Tip: "]), item.tip
          ]));
        }

        const hearBtn = h("button", {
          class: "btn btn-ghost",
          onclick: () => { U().speak(item.word); status.textContent = "🔊 Model pronunciation played."; }
        }, ["🔊 Hear model"]);

        const slowBtn = h("button", {
          class: "btn btn-ghost",
          onclick: () => { U().speak(item.word, { slow: true }); status.textContent = "🐢 Slow model played."; }
        }, ["🐢 Hear slowly"]);

        revealedBox.appendChild(h("div", { class: "row center mt-sm" }, [hearBtn, slowBtn]));

        const judge = h("div", { class: "pron-judge mt" });
        judge.appendChild(h("p", { class: "section-sub", style: "margin-bottom:10px" }, ["How did you do?"]));
        judge.appendChild(h("div", { class: "row center", style: "gap:10px;" }, [
          h("button", { class: "btn btn-green", onclick: () => grade(true) }, ["✅ Sounded good"]),
          h("button", { class: "btn btn-ghost", onclick: () => U().speak(item.word, { slow: true }) }, ["🔁 Practice again"]),
          h("button", { class: "btn btn-red", onclick: () => grade(false) }, ["😅 Need work"])
        ]));
        revealedBox.appendChild(judge);
        card.appendChild(revealedBox);

        // Initial Actions
        const verifyBtn = h("button", { class: "btn btn-primary", onclick: () => verifyPronunciation() }, ["🔍 Verify & Hear model"]);
        const micBtn = h("button", { class: "btn btn-ghost", onclick: () => startMic() }, [canListen ? "🎤 Speak into mic" : "🎤 I pronounced it"]);

        const initialActions = h("div", { class: "row center mt-md", style: "gap:10px;" }, [verifyBtn, micBtn]);
        card.appendChild(initialActions);

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => roundEnd("Pronunciation Drill", score, i, maxStreak, () => startPronounceRound(cfg)) }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);

        function verifyPronunciation(transcript) {
          if (isVerified) { U().speak(item.word); return; }
          isVerified = true;
          initialActions.style.display = "none";
          revealedBox.style.display = "block";

          if (transcript) {
            const match = U().pronunciationMatch(transcript, item.word);
            if (match) {
              status.textContent = `Heard: "${transcript}" — Great pronunciation!`;
              status.className = "pron-status ok";
              U().sfx.correct();
            } else {
              status.textContent = `Heard: "${transcript}" — Compare with model below.`;
              status.className = "pron-status no";
            }
          }
          U().speak(item.word);
        }

        function startMic() {
          if (!canListen) { verifyPronunciation(); return; }
          micBtn.disabled = true;
          status.textContent = "🎙️ Listening... pronounce clearly.";
          U().listenOnce({ ms: 4500, lang: "en-US" }).then((res) => {
            micBtn.disabled = false;
            if (!res.ok) { verifyPronunciation(); return; }
            verifyPronunciation(res.transcript);
          });
        }

        function grade(good) {
          if (good) {
            score += 10;
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;
            U().sfx.correct();
          } else {
            sessionState.streak = 0;
            U().sfx.wrong();
          }
          setTimeout(next, good ? 600 : 1200);
        }
      }, { replace: i > 0 });
    }

    function next() { i++; question(); }
    question();
  }

  /* =================================================================
     GAME 8 — Mystery Object
     ================================================================= */
  function mysteryObject() {
    renderGameConfig("Mystery Object", "🔍", "Guess the mystery object from clues & descriptions.", "mysteryObject", startMysteryObject);
  }

  function startMysteryObject(cfg) {
    const vocabPool = (C().vocabulary || []).filter((v) => v && v.en && (v.meaning || v.fr));
    const mysteryPool = (C().mysteryObjects || []).map((m) => ({ en: m.word, meaning: m.clue, fr: m.fr, emoji: m.emoji || "🔍", cat: "Mystery" }));
    let pool = U().uniqueById(vocabPool.concat(mysteryPool));

    if (cfg.tier && cfg.tier !== "all") {
      const filtered = pool.filter((v) => {
        const len = (v.en || "").length;
        if (cfg.tier === "easy") return len <= 5 || (v.level || "easy") === "easy";
        if (cfg.tier === "medium") return (len > 5 && len <= 7) || (v.level || "medium") === "medium";
        if (cfg.tier === "hard") return len >= 7 || (v.level || "hard") === "hard";
        return true;
      });
      if (filtered.length >= 4) pool = filtered;
    }
    if (!pool.length) { U().alertBox("No mystery items available for this tier!"); return; }

    const deck = U().newSessionDeck(pool, "solo_mystery_" + cfg.tier);
    let idx = 0, score = 0, maxStreak = 0;
    const sessionState = { streak: 0 };
    const lifelines = { fiftyFifty: 2, hint: 2, skip: 2 };

    function question() {
      const item = deck.drawInfinite();
      if (!item) { roundEnd("Mystery Object", score, idx, maxStreak, () => startMysteryObject(cfg)); return; }

      let hintUsed = false;
      let baseRoundScore = 10;

      U().show((scr) => {
        const h = U().h;
        renderHUD(scr, "🔍 Mystery Object", idx, score, cfg, sessionState);

        const card = h("div", { class: "play-card solo-play-card obj-desc-card" });
        card.appendChild(h("div", { class: "topic-tag" }, ["Category: " + (item.cat || "Vocabulary")]));

        const cluesBox = h("div", { class: "clues-box mt" }, [
          h("h3", { class: "clues-title" }, ["💡 English Clue:"]),
          h("p", { class: "clue-text", style: "font-size:1.25rem; font-weight:600; color:var(--ink); margin-top:8px;" }, [item.meaning || "Guess the mystery object!"])
        ]);
        card.appendChild(cluesBox);

        // Timer
        const timer = createTimerComponent(cfg, () => onTimeUp(), sessionState);
        if (timer.el) card.appendChild(timer.el);

        card.appendChild(h("button", {
          class: "btn btn-ghost mt",
          onclick: () => U().speak(item.en)
        }, ["🔊 Listen to pronunciation hint"]));

        const frHintBox = h("div", { class: "fr-hint-box hidden mt" }, [
          h("div", { class: "fr-hint-word" }, ["🇫🇷 Traduction : " + (item.fr || "")])
        ]);
        card.appendChild(frHintBox);

        const hintBtn = h("button", {
          class: "btn btn-hint mt",
          onclick: () => {
            if (hintUsed) return;
            hintUsed = true;
            frHintBox.classList.remove("hidden");
            hintBtn.disabled = true;
            hintBtn.textContent = "🇫🇷 Traduction affichée (-2 pts)";
            baseRoundScore = 8;
            U().sfx.gift();
          }
        }, ["🇫🇷 Voir la traduction en français (-2 pts)"]);
        card.appendChild(hintBtn);

        const feedback = h("div", { class: "feedback mt" });
        card.appendChild(feedback);

        let buttons = [];

        if (cfg.tier === "easy" || cfg.tier === "medium") {
          const distractors = U().pickDistractors(pool, item, 3, (w) => w.en);
          const options = U().shuffle([item].concat(distractors));
          const optWrap = h("div", { class: "options mt-lg" });
          options.forEach((o) => {
            const b = h("button", { class: "opt", onclick: () => chooseMCQ(o, b) }, [o.en]);
            buttons.push(b);
            optWrap.appendChild(b);
          });
          card.appendChild(optWrap);
        } else {
          const input = h("input", {
            type: "text", placeholder: "Type your answer in English...",
            style: "width:100%; max-width:380px; padding:14px 18px; border-radius:12px; font-size:1.15rem; background:var(--card-2); border:1px solid var(--line); color:var(--ink); margin:16px auto; display:block; text-align:center;",
            onkeydown: (e) => { if (e.key === "Enter") checkDirect(); }
          });
          const checkBtn = h("button", { class: "btn btn-primary mt", onclick: checkDirect }, ["Submit 🚀"]);
          card.appendChild(input);
          card.appendChild(checkBtn);
          setTimeout(() => { try { input.focus(); } catch (e) {} }, 80);

          async function checkDirect() {
            const val = (input.value || "").trim().toLowerCase();
            const target = item.en.trim().toLowerCase();
            if (!val) return;
            timer.stop();
            const isValidSqlite = await U().validateEnglishWord(val);

            if (val === target) {
              reveal(true);
            } else {
              feedback.className = "feedback no";
              feedback.textContent = `❌ Try again! ${isValidSqlite ? "('" + val + "' is a valid word, but not the target item)" : ""}`;
              U().sfx.wrong();
              timer.start();
            }
          }
        }

        // Lifelines
        renderLifelines(card, cfg, lifelines, {
          onFiftyFifty: () => {
            let removed = 0;
            buttons.forEach((b) => {
              if (b.textContent.toLowerCase() !== item.en.toLowerCase() && removed < 2) {
                b.style.visibility = "hidden";
                b.disabled = true;
                removed++;
              }
            });
          },
          onHint: () => {
            if (!hintUsed) hintBtn.click();
          },
          onSkip: () => {
            timer.stop();
            reveal(false);
          }
        });

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: () => { timer.stop(); roundEnd("Mystery Object", score, idx, maxStreak, () => startMysteryObject(cfg)); } }, ["⏹ Stop & see score"])
        ]));

        scr.appendChild(card);
        timer.start();

        let answered = false;

        function chooseMCQ(chosen, btn) {
          if (answered) return;
          answered = true;
          timer.stop();
          const timeSpent = timer.getTimeSpent();
          buttons.forEach((b) => (b.disabled = true));
          hintBtn.disabled = true;

          if (chosen.en.toLowerCase() === item.en.toLowerCase()) {
            btn.classList.add("correct");
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;

            const ptsData = computePoints(baseRoundScore, timeSpent, cfg, sessionState);
            score += ptsData.total;

            feedback.className = "feedback ok";
            feedback.innerHTML = `✅ Correct! +${ptsData.total} pts ${ptsData.speedBonus ? '<span class="solo-bonus-tag">⚡ Speed +' + ptsData.speedBonus + '</span>' : ''} (${item.emoji || ""} ${item.en} = ${item.fr || ""})`;
            U().sfx.correct();
          } else {
            btn.classList.add("wrong");
            sessionState.streak = 0;
            const correctBtn = buttons.find((b) => b.textContent.toLowerCase() === item.en.toLowerCase());
            if (correctBtn) correctBtn.classList.add("correct");
            feedback.className = "feedback no";
            feedback.innerHTML = `The answer was: <b>${item.emoji || ""} ${item.en}</b> (${item.fr || ""})`;
            U().sfx.wrong();
          }
          U().speak(item.en);
          setTimeout(next, 1800);
        }

        function reveal(correct) {
          if (answered) return;
          answered = true;
          timer.stop();
          const timeSpent = timer.getTimeSpent();
          hintBtn.disabled = true;

          if (correct) {
            sessionState.streak++;
            if (sessionState.streak > maxStreak) maxStreak = sessionState.streak;
            const ptsData = computePoints(baseRoundScore, timeSpent, cfg, sessionState);
            score += ptsData.total;
            feedback.className = "feedback ok";
            feedback.innerHTML = `✅ Correct! +${ptsData.total} pts (${item.emoji || ""} ${item.en} = ${item.fr || ""})`;
            U().sfx.correct();
          } else {
            sessionState.streak = 0;
            feedback.className = "feedback no";
            feedback.innerHTML = `The word was: <b>${item.emoji || ""} ${item.en}</b> (${item.fr || ""})`;
            U().sfx.wrong();
          }
          U().speak(item.en);
          setTimeout(next, 1800);
        }

        function onTimeUp() {
          if (answered) return;
          reveal(false);
        }
      }, { replace: idx > 0 });
    }

    function next() { idx++; question(); }
    question();
  }

  /* =================================================================
     GAME 9 — Alphabet Race
     ================================================================= */
  function alphabetRace() {
    renderGameConfig("Alphabet Race", "🔠", "Race through letters A to Z with SQLite verification.", "alphabetRace", runAlphabetRaceSolo);
  }

  function runAlphabetRaceSolo(cfg) {
    const totalSec = cfg.timerMode === "session" ? (cfg.sessionSec || 90) : 90;
    const minLength = cfg.tier === "hard" ? 5 : (cfg.tier === "medium" ? 4 : 3);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    let currentIndex = 0;
    let remaining = totalSec;
    let score = 0;
    const usedWords = new Set();
    const wordsDone = {};
    let timer = null;

    async function isValidSoloWord(word) {
      if (!word || !/^[A-Za-z]+$/.test(word)) return false;
      return await U().validateEnglishWord(word);
    }

    if (cfg.timerMode !== "none") {
      timer = setInterval(() => {
        remaining -= 0.1;
        if (remaining <= 0) {
          clearInterval(timer);
          remaining = 0;
          finishSoloRace();
        }
      }, 100);
    }

    function finishSoloRace() {
      if (timer) clearInterval(timer);
      const completedCount = Object.keys(wordsDone).length;
      markProgress(completedCount);
      U().sfx.win();
      U().confetti(1800);

      U().show((scr) => {
        const h = U().h;
        scr.appendChild(h("div", { class: "play-card solo-play-card" }, [
          h("div", { class: "prompt-emoji" }, [completedCount >= 20 ? "🌟" : completedCount >= 10 ? "👍" : "💪"]),
          h("h2", { class: "section-title" }, ["Race Complete!"]),
          h("p", { class: "section-sub" }, ["Alphabet Race Solo"]),
          h("div", { class: "prompt-word" }, [`${completedCount}/26 letters completed (${score} pts)`]),
          h("div", { class: "row center mt-lg", style: "gap:16px;" }, [
            h("button", { class: "btn btn-primary", onclick: alphabetRace }, ["Play again"]),
            h("button", { class: "btn btn-ghost", onclick: menu }, ["Other games"])
          ])
        ]));
      }, { replace: true });
    }

    function renderTurn(message) {
      if ((cfg.timerMode !== "none" && remaining <= 0) || currentIndex >= alphabet.length) {
        finishSoloRace();
        return;
      }

      const letter = alphabet[currentIndex];

      U().show((scr) => {
        const h = U().h;
        const alphabetRow = h("div", { class: "alphabet-board" },
          alphabet.map((ch, idx) => {
            const isDone = wordsDone[ch];
            const isCurrent = idx === currentIndex;
            let cls = "alphabet-tile";
            if (isCurrent) cls += " current";
            else if (isDone) cls += " completed";
            return h("span", { class: cls, title: isDone ? `${ch}: ${isDone}` : ch }, [ch]);
          })
        );
        scr.appendChild(alphabetRow);

        const input = h("input", {
          type: "text",
          placeholder: "Type a word starting with " + letter + "...",
          autocomplete: "off",
          onkeydown: (e) => { if (e.key === "Enter") submitWord(); }
        });
        const feedback = h("div", { class: "alphabet-feedback" }, [message || " "]);

        scr.appendChild(h("div", { class: "alphabet-card" }, [
          h("div", { class: "turn-banner" }, [
            "🔠 Solo Race — letter ", h("span", { class: "ans" }, [letter])
          ]),
          h("div", { class: "gd-question" }, [
            h("div", { class: "topic-tag" }, ["Letter " + letter]),
            h("div", { class: "q" }, ["Enter an English word starting with " + letter + " (min " + minLength + " letters)."])
          ]),
          h("div", { class: "alphabet-status" }, [
            h("span", {}, ["Progress: ", currentIndex + 1, "/26"]),
            h("span", {}, ["Score: ", score, " pts"]),
            cfg.timerMode !== "none" ? h("span", {}, ["Time: ", Math.ceil(remaining), "s"]) : null
          ]),
          h("div", { class: "alphabet-input-row" }, [
            input,
            h("div", { class: "alphabet-actions" }, [
              h("button", { class: "btn btn-primary", onclick: submitWord }, ["Submit"]),
              h("button", { class: "btn btn-ghost", onclick: passWord }, ["Pass"])
            ])
          ]),
          feedback
        ]));

        if (cfg.timerMode !== "none") {
          const progressBar = h("div", { class: "progress-bar alphabet-progress" }, [
            h("div", {
              class: "progress-fill",
              style: { width: Math.max(0, remaining * 100 / totalSec) + "%" }
            }, [])
          ]);
          scr.appendChild(progressBar);
        }

        scr.appendChild(h("div", { class: "row center mt-lg" }, [
          h("button", { class: "btn btn-ghost", onclick: finishSoloRace }, ["🏁 Finish & see score"])
        ]));

        setTimeout(() => { try { input.focus(); } catch (e) {} }, 80);

        function normalizeWord(value) {
          return String(value || "").trim().replace(/[^A-Za-z]/g, "").toUpperCase();
        }

        function proceedNext(msg) {
          currentIndex++;
          if (currentIndex >= alphabet.length || (cfg.timerMode !== "none" && remaining <= 0)) {
            finishSoloRace();
            return;
          }
          renderTurn(msg);
        }

        async function submitWord() {
          const raw = normalizeWord(input.value);
          if (!raw) { feedback.textContent = "Please type a word."; return; }
          if (raw.charAt(0) !== letter) {
            feedback.textContent = "Word must start with " + letter + ".";
            input.value = "";
            input.focus();
            return;
          }
          if (raw.length < minLength) {
            feedback.textContent = "At least " + minLength + " letters required.";
            input.value = "";
            input.focus();
            return;
          }
          if (usedWords.has(raw)) {
            feedback.textContent = "You already used '" + raw + "'!";
            input.value = "";
            input.focus();
            return;
          }
          const valid = await isValidSoloWord(raw);
          if (!valid) {
            feedback.textContent = "⚠️ '" + raw + "' is not recognized as a valid English word.";
            input.value = "";
            input.focus();
            return;
          }

          usedWords.add(raw);
          wordsDone[letter] = raw;
          const pts = raw.length * 5 + (cfg.timerMode !== "none" ? Math.ceil(remaining / 10) : 10);
          score += pts;
          U().speak(raw);
          proceedNext("✅ " + raw + " (+" + pts + " pts)");
        }

        function passWord() {
          proceedNext("Passed letter " + letter + ".");
        }
      }, { replace: true });
    }

    renderTurn();
  }

  return { menu, start };
})();
