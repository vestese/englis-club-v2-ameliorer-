/* =====================================================================
   group.js — Mode en groupe (arbitre) : Le Grand Défi
   Plateau 8 thèmes · Chrono Steal · scores · cadeau mystère · podium
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.group = (function () {
  const U = () => CAA.util;
  const C = () => CAA.content;
  const BIG_CHALLENGE_SELECTION_KEY = "bigChallengeSelection";

  function loadBigChallengeSelection() {
    const saved = U().store.get(BIG_CHALLENGE_SELECTION_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  function saveBigChallengeSelection(names) {
    if (!Array.isArray(names)) names = [];
    U().store.set(BIG_CHALLENGE_SELECTION_KEY, names);
  }

  function getDefaultBigChallengeTopics() {
    return (C().grandDefi || []).slice(0, 8);
  }

  function getSavedBigChallengeTopics() {
    const names = loadBigChallengeSelection();
    if (!names.length) return [];
    return (C().grandDefi || []).filter((topic) => names.includes(topic.topic));
  }

  // état de la partie
  let G = null;

  // team colors for highlights
  const TEAM_COLORS = ['#1abc9c', '#3498db', '#e67e22', '#9b59b6', '#e74c3c', '#f1c40f'];
  function getTeamColor(idx) { return TEAM_COLORS[idx % TEAM_COLORS.length]; }

  /* ================================================================
     1) Configuration des équipes
     ================================================================ */
  /* ---------------- Choix du jeu de groupe ---------------- */
  function menu() {
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["Play in a group"]));
      scr.appendChild(h("p", { class: "section-sub" }, ["Choose a game to host on the TV."]));
      const grid = h("div", { class: "choice-grid" });
      grid.appendChild(h("div", { class: "choice", onclick: setup }, [
        h("h4", {}, ["The Big Challenge"]),
        h("small", {}, ["8-topic board, questions worth points"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: spellingBeeSetup }, [
        h("h4", {}, ["Spelling Bee"]),
        h("small", {}, ["Listen & spell out loud, in teams"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: pronounceSetup }, [
        h("h4", {}, ["Pronunciation Drill"]),
        h("small", {}, ["Say tricky words — IPA tip + model audio"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: anagramSetup }, [
        h("h4", {}, ["Anagram"]),
        h("small", {}, ["Unscramble the letters, in teams"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: grammarSetup }, [
        h("h4", {}, ["Grammar Duel"]),
        h("small", {}, ["Fill the gap, in teams"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: irregularSetup }, [
        h("h4", {}, ["Irregular Verbs"]),
        h("small", {}, ["Past simple, past participle or definition, in teams"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: alphabetRaceSetup }, [
        h("h4", {}, ["Alphabet Race"]),
        h("small", {}, ["From A to Z, form a word for each letter in team turns"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: phrasalSetup }, [
        h("h4", {}, ["Phrasal Verbs"]),
        h("small", {}, ["Match the verb to its meaning, in teams"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: wordChainSetup }, [
        h("h4", {}, ["Word Chain"]),
        h("small", {}, ["Next word starts with the last letter"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: wheelSetup }, [
        h("h4", {}, ["Spin the Wheel"]),
        h("small", {}, ["Random challenge — fail it, do a forfeit"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: charadesSetup }, [
        h("h4", {}, ["Charades"]),
        h("small", {}, ["Act it out — your team guesses"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: wordFromWordSetup }, [
        h("h4", {}, ["Word from Word"]),
        h("small", {}, ["Build words from one big word, in teams"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: wordBuilderSetup }, [
        h("h4", {}, ["Word Builder"]),
        h("small", {}, ["Make words from a pool of letters"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: objectDescSetup }, [
        h("h4", {}, ["Mystery Object"]),
        h("small", {}, ["Guess objects from English clues. French hint costs points!"])
      ]));
      grid.appendChild(h("div", { class: "choice", onclick: descriptionGameSetup }, [
        h("h4", {}, ["Description Challenge"]),
        h("small", {}, ["Listen to audio or read description, guess the word!"])
      ]));
      // TV Vocab choice
      grid.appendChild(h("div", { class: "choice", onclick: tvVocabSetup }, [
        h("h4", {}, ["TV Vocab"]),
        h("small", {}, ["A prompt with multiple hidden answers — faults & steal rules"]) 
      ]));
      scr.appendChild(grid);
    });
  }

  /* ---------------- Installation des équipes (générique) ----------------
     config : { title, subtitle, onStart(teams, { timerOn, phaseSec }) } */

  function teamSetup(config) {
    const names = ["Équipe A", "Équipe B"];
    let timerOn = true;
    let phaseSec = 12; // durée de CHAQUE phase du chrono

    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [config.title]));
      scr.appendChild(h("p", { class: "section-sub" }, [config.subtitle]));

      // saisie des équipes
      const list = h("div");
      function renderTeams() {
        list.innerHTML = "";
        names.forEach((nm, idx) => {
          const row = h("div", { class: "team-input-row" }, [
            h("input", {
              type: "text", value: nm, placeholder: `Team name ${idx + 1}`,
              oninput: (e) => (names[idx] = e.target.value)
            }),
            names.length > 2
              ? h("button", { class: "btn btn-ghost", onclick: () => { names.splice(idx, 1); renderTeams(); } }, ["✕"])
              : null
          ]);
          list.appendChild(row);
        });
      }
      renderTeams();
      scr.appendChild(list);

      scr.appendChild(h("div", { class: "row mt" }, [
        names.length < 6
          ? h("button", { class: "btn btn-ghost", onclick: () => { names.push(""); renderTeams(); } }, ["➕ Add a team"])
          : null
      ]));

      // timer options
      const timerPills = h("div", { class: "pill-group" });
      function renderTimer() {
        timerPills.innerHTML = "";
        [["Timer on", true], ["No timer", false]].forEach(([label, val]) => {
          timerPills.appendChild(h("button", {
            class: "pill" + (timerOn === val ? " active" : ""),
            onclick: () => { timerOn = val; renderTimer(); }
          }, [label]));
        });
      }
      renderTimer();

      const durPills = h("div", { class: "pill-group" });
      function renderDur() {
        durPills.innerHTML = "";
        [["Short", 8], ["Normal", 12], ["Long", 20]].forEach(([label, val]) => {
          durPills.appendChild(h("button", {
            class: "pill" + (phaseSec === val ? " active" : ""),
            onclick: () => { phaseSec = val; renderDur(); }
          }, [label]));
        });
      }
      renderDur();

      if (!config.hideTimer) {
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Chrono Steal"]), timerPills]),
          h("div", {}, [h("div", { class: "section-sub" }, ["Time per phase"]), durPills])
        ]));
      }

      // options supplémentaires propres au jeu (ex. choix du thème, durée)
      let readExtra = () => ({});
      if (config.extras) readExtra = config.extras(scr, h) || readExtra;

      const noteText = config.note || (config.hideTimer ? null :
        "Rule: the team whose turn it is answers during the green phase. If they get it wrong or run out of time, the other teams can steal the points (orange phase).");
      if (noteText) scr.appendChild(h("p", { class: "note" }, [noteText]));

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", {
          class: "btn btn-primary", onclick: () => {
            const teams = names.map((n) => n.trim()).filter(Boolean).map((n) => ({ name: n, score: 0 }));
            const minTeams = config.minTeams || 2;
            if (teams.length < minTeams) { U().alertBox(`Add at least ${minTeams} ${minTeams === 1 ? "team" : "teams"}.`); return; }
            config.onStart(teams, Object.assign({ timerOn, phaseSec }, readExtra()));
          }
        }, ["🚀 Start"])
      ]));
    });
  }

  function bigChallengeTopicExtras(scr, h) {
    const topics = C().grandDefi || [];
    const validTopics = new Set(topics.map((t) => t.topic));
    let selectedNames = new Set(loadBigChallengeSelection().filter((name) => validTopics.has(name)));
    let count = Math.max(2, Math.min(5, selectedNames.size || 4));
    if (selectedNames.size > count) {
      selectedNames = new Set(Array.from(selectedNames).slice(0, count));
    }

    const countPills = h("div", { class: "pill-group" });
    const topicGrid = h("div", { class: "pill-group", style: "flex-wrap: wrap; gap: .5rem;" });

    function render() {
      countPills.innerHTML = "";
      [["2 topics", 2], ["4 topics", 4], ["5 topics", 5]].forEach(([label, val]) => {
        countPills.appendChild(h("button", {
          class: "pill" + (count === val ? " active" : ""),
          onclick: () => {
            count = val;
            if (selectedNames.size > count) {
              selectedNames = new Set(Array.from(selectedNames).slice(0, count));
            }
            render();
          }
        }, [label]));
      });

      topicGrid.innerHTML = "";
      topics.forEach((topic) => {
        const active = selectedNames.has(topic.topic);
        topicGrid.appendChild(h("button", {
          class: "pill" + (active ? " active" : ""),
          onclick: () => {
            if (active) {
              selectedNames.delete(topic.topic);
            } else if (selectedNames.size < count) {
              selectedNames.add(topic.topic);
            } else {
              U().alertBox(`You can only select up to ${count} topics.`);
            }
            render();
          }
        }, [topic.emoji + " " + topic.topic]));
      });

      updateStatus();
    }

    const statusNote = h("p", { class: "note" });
    scr.appendChild(h("div", { class: "setup-opts" }, [
      h("div", {}, [h("div", { class: "section-sub" }, ["Topic count"]), countPills])
    ]));
    scr.appendChild(h("div", { class: "setup-opts mt" }, [
      h("div", { class: "section-sub" }, ["Select categories for The Big Challenge"]),
      topicGrid
    ]));
    scr.appendChild(statusNote);

    function updateStatus() {
      statusNote.textContent = `Selected ${selectedNames.size} / ${count} topics. You need at least 2.`;
    }

    render();

    return () => {
      const chosen = topics.filter((t) => selectedNames.has(t.topic));
      return { selectedTopics: chosen, selectedTopicNames: Array.from(selectedNames) };
    };
  }

  function setup() {
    teamSetup({
      title: "🏆 The Big Challenge — teams",
      subtitle: "The referee sets up the teams, then shows the board on the TV.",
      extras: bigChallengeTopicExtras,
      onStart: (teams, opts) => start(teams, opts)
    });
  }

  /* ---------------- TV Vocab (Group mode) ---------------- */
  function tvVocabSetup() {
    let faultLimit = 3;
    let pointsPerAnswer = 100;
    teamSetup({
      title: "📺 TV Vocab — teams",
      subtitle: "Prompt with multiple correct answers. Teams reveal answers, accumulate round points, faults and steals.",
      onStart: (teams, opts) => startTvVocab(teams, Object.assign({ faultLimit, pointsPerAnswer }, opts))
    });
  }

  function startTvVocab(teams, opts) {
    opts = opts || {};
    const deck = C().wheelChallenges || [];
    // Use content tv prompts if available (we added some in content.js)
    const pool = C().tvVocab || C().wheelChallenges || [];
    // Prepare game state G
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      faultLimit: opts.faultLimit || 3,
      pointsPerAnswer: opts.pointsPerAnswer || 100,
      currentRound: null,
      promptDeck: U().newSessionDeck(pool, 'group_tvvocab')
    };
    // build a vocabulary set for strict spelling validation (client-side fallback)
    try {
      const vocab = (C().vocabulary || []).map((it) => String(it.en || '').toUpperCase()).filter(Boolean);
      G.vocabSet = new Set(vocab);
    } catch (e) { G.vocabSet = new Set(); }
    tvVocabNextRound();
  }

  function tvVocabNextRound() {
    if (!G) return;
    const team = G.teams[G.turn];
    const item = G.promptDeck.draw();
    if (!item) { podium(); return; }
    // item may be from content.wheelChallenges or our tvVocab set
    // normalize: { prompt, answers }
    let promptObj = null;
    if (item.prompt && item.answers) promptObj = item;
    else if (item.task && item.title) promptObj = { prompt: item.task, answers: [] };
    else promptObj = { prompt: item.title || 'TV Vocab prompt', answers: [] };

    // For safety: if no answers provided, try to infer from content vocabulary
    if (!Array.isArray(promptObj.answers) || !promptObj.answers.length) {
      // fallback: split prompt words and pick some nouns
      promptObj.answers = (promptObj.prompt.match(/\b\w{3,}\b/g) || []).slice(0, 5).map((w) => w.toUpperCase());
    }

    // Build variable boxes so the number of visible slots hides the exact answer count
    const canonicalAnswers = (promptObj.answers || []).map((a) => String(a || '').toUpperCase()).filter(Boolean);
    // decide boxes count: at least answers.length, add 2-5 extra blanks, cap at 10
    const extra = Math.floor(Math.random() * 4) + 2; // 2..5
    const boxesCount = Math.min(10, Math.max(canonicalAnswers.length, canonicalAnswers.length + extra));
    // generate descending points per box
    const base = G.pointsPerAnswer || 100;
    const startPoints = Math.max(60, Math.round(base * 1.5));
    const delta = Math.max(8, Math.round((startPoints - 10) / Math.max(1, boxesCount - 1)));
    const pointsArr = new Array(boxesCount).fill(0).map((_, i) => Math.max(10, startPoints - i * delta));
    // create empty boxes
    const boxes = new Array(boxesCount).fill(null).map((_, i) => ({ answer: null, revealed: false, revealedBy: null, points: pointsArr[i] }));
    // randomly assign canonical answers to distinct boxes
    const availIdx = Array.from({ length: boxesCount }, (_, i) => i);
    canonicalAnswers.forEach((ans) => {
      if (!availIdx.length) return;
      const pick = Math.floor(Math.random() * availIdx.length);
      const idx = availIdx.splice(pick, 1)[0];
      boxes[idx].answer = ans;
    });

    G.currentRound = {
      prompt: promptObj.prompt,
      answers: canonicalAnswers,
      boxes: boxes,
      faults: G.teams.reduce((acc, t) => { acc[t.name] = 0; return acc; }, {}),
      roundPoints: 0,
      ownerTeamName: G.teams[G.turn] && G.teams[G.turn].name,
      finalStealAllowed: false,
      boxCount: boxesCount
    };

    // Show the round UI
    tvVocabShowRound();
  }

  function tvVocabShowRound() {
    const round = G.currentRound;
    if (!round) return; 
    const team = G.teams[G.turn];
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);

      // Ensure tvvocab stylesheet is linked
      if (!document.querySelector('link[href="css/tvvocab.css"]')) {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'css/tvvocab.css'; document.head.appendChild(link);
      }

      const card = h('div', { class: 'gd-question tvv-card' });

      // Turn Banner Header
      const headerBar = h('div', { class: 'tvv-header-bar' }, [
        h('div', { class: 'turn-banner' }, [
          '📺 Au tour de ', h('span', { class: 'team' }, [team.name])
        ]),
        h('div', { class: 'topic-tag', style: 'background:var(--tvv-gold);color:#000;font-weight:900;' }, ['📺 TV VOCAB SHOW'])
      ]);
      card.appendChild(headerBar);

      // Studio Prompt Box
      const promptBox = h('div', { class: 'tvv-prompt-box' }, [
        h('h3', {}, [round.prompt])
      ]);
      card.appendChild(promptBox);

      // Answers Board with Numbered Tiles
      const answersRow = h('div', { class: 'tv-answers mt-lg' });
      (round.boxes || []).forEach((b, idx) => {
        const revealed = b.revealed;
        const numStr = String(idx + 1).padStart(2, '0');
        const style = revealed && b.revealedBy !== undefined && b.revealedBy !== null ? `background:${getTeamColor(b.revealedBy)};color:#06121a;border-color:transparent;box-shadow:0 6px 18px ${getTeamColor(b.revealedBy)}66;` : '';
        const cls = 'tv-answer ' + (revealed ? 'revealed' : 'hidden');
        
        let box = null;
        if (revealed) {
          box = h('div', { class: cls, 'data-idx': idx, style: style }, [
            h('span', { class: 'tv-ans-text' }, [b.answer || '???']),
            h('span', { class: 'tv-pts-badge' }, ['+' + (b.points || 100) + ' PTS'])
          ]);
        } else {
          box = h('div', { class: cls, 'data-idx': idx }, [
            h('span', { class: 'tv-num-badge' }, [numStr]),
            h('span', { class: 'tv-lock-icon' }, ['🔒'])
          ]);
        }
        answersRow.appendChild(box);
      });
      card.appendChild(answersRow);

      // Round Score & Fault Stats Bar
      const fp = h('div', { class: 'tvv-stats mt-lg' }, [
        h('div', { class: 'round-points' }, [
          '🏆 Round Score: ',
          h('span', { class: 'round-points-val' }, [round.roundPoints + ' PTS'])
        ])
      ]);

      const faultsWrap = h('div', { class: 'faults-wrap' });
      G.teams.forEach((t, i) => {
        const isActive = G.turn === i;
        const f = round.faults[t.name] || 0;
        faultsWrap.appendChild(h('div', { class: 'team-fault ' + (isActive ? 'active' : '') }, [
          t.name + ' : ' + f + ' fault' + (f > 1 ? 's' : '')
        ]));
      });
      fp.appendChild(faultsWrap);
      card.appendChild(fp);

      // Strike Counter (Big Red X Badges)
      const faults = round.faults[G.teams[G.turn].name] || 0;
      const xArea = h('div', { class: 'tvv-x-area mt-lg' }, []);
      const xBoxes = h('div', { class: 'tvv-x-boxes' }, []);
      for (let i = 0; i < 3; i++) {
        xBoxes.appendChild(h('div', { class: 'tvv-x ' + (i < faults ? 'show' : '') }, [i < faults ? 'X' : '•']));
      }
      xArea.appendChild(xBoxes);
      card.appendChild(xArea);

      // Steal Mode Banner ("VOL DE POINTS")
      if (round.finalStealAllowed) {
        card.appendChild(h('div', { class: 'tvv-steal' }, [
          '⚡ VOL DE POINTS DISPONIBLE ! L\'équipe adverse peut voler la totalité des points de la manche !'
        ]));
      }

      // Input Field for Typing Answer
      const input = h('input', {
        type: 'text',
        class: 'tvv-input mt-lg',
        placeholder: "Proposez une réponse et appuyez sur Entrée...",
        style: 'width:100%;max-width:520px;padding:14px 16px;border-radius:12px;font-size:1.1rem;background:var(--card-2);color:var(--ink);outline:none;'
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = (e.target.value || '').trim();
          if (!val) return;
          tvVocabSubmit(val.toUpperCase());
          e.target.value = '';
        }
      });
      card.appendChild(input);

      // Host Control Action Buttons
      const actions = h('div', { class: 'tvv-actions' }, [
        h('button', { class: 'btn btn-primary', onclick: () => { tvVocabSubmitManualReveal(); } }, ['🔍 Révéler un Mot']),
        h('button', { class: 'btn btn-ghost', onclick: () => { tvVocabEndRoundAndNext(); } }, ['▶ Fin de Manche / Suivant']),
        h('button', { class: 'btn btn-ghost', onclick: () => podium() }, ['🏁 Fin de Partie'])
      ]);
      card.appendChild(actions);

      scr.appendChild(card);
    });
  }

  function tvVocabSubmit(answer) {
    const round = G.currentRound;
    if (!round) return;
    const norm = String(answer || '').toUpperCase();
    // strict spelling validation using utility or local vocab set
    let validSpell = true;
    if (U().isWord && typeof U().isWord === 'function') {
      try { validSpell = U().isWord(norm); } catch (e) { validSpell = true; }
    } else if (G && G.vocabSet) {
      // prefer canonical answers first: if it's one of the prompt answers, accept; else check vocabSet
      if (round.answers && round.answers.includes(norm)) validSpell = true;
      else validSpell = G.vocabSet.has(norm);
    }
    if (!validSpell) {
      // treat as incorrect
      U().sfx && U().sfx.wrong && U().sfx.wrong();
      incrementFaultAndMaybeRotate(round);
      return;
    }
    // find matching unrevealed box
    const boxIdx = (round.boxes || []).findIndex((b) => b.answer && b.answer.toUpperCase() === norm && !b.revealed);
    if (boxIdx >= 0) {
      // correct: reveal box
      const box = round.boxes[boxIdx];
      box.revealed = true;
      box.revealedBy = G.turn; // record which team revealed it
      const pts = box.points || (G.pointsPerAnswer || 100);
      round.roundPoints = (round.roundPoints || 0) + pts;
      // award to current team
      G.teams[G.turn].score = (G.teams[G.turn].score || 0) + pts;
      // If steal mode and current team is not owner, award entire roundPoints to stealer and clear round
      if (round.finalStealAllowed && round.ownerTeamName && round.ownerTeamName !== G.teams[G.turn].name) {
        // award remaining roundPoints to stealer (they already received pts for this answer)
        const total = round.roundPoints || 0;
        const remaining = Math.max(0, total - pts);
        G.teams[G.turn].score += remaining;
        // subtract the full roundPoints from the owner (owner already got partial points earlier)
        const ownerIdx = G.teams.findIndex((t) => t.name === round.ownerTeamName);
        if (ownerIdx >= 0) {
          // remove only the already-added points to avoid negative score
          G.teams[ownerIdx].score = Math.max(0, (G.teams[ownerIdx].score || 0) - (total - remaining));
        }
        // mark all answers revealed and advance
        (round.boxes || []).forEach((b) => { b.revealed = true; });
        tvVocabShowRound();
        setTimeout(() => { G.turn = (G.turn + 1) % G.teams.length; tvVocabNextRound(); }, 600);
        return;
      }
      // if all revealed, round ends
      if ((round.boxes || []).every((b) => b.revealed || !b.answer)) {
        tvVocabShowRound();
        U().sfx && U().sfx.correct && U().sfx.correct();
        // next turn and next round
        G.turn = (G.turn + 1) % G.teams.length;
        setTimeout(tvVocabNextRound, 800);
        return;
      }
      tvVocabShowRound();
    } else {
      // incorrect -> increment fault and maybe rotate
      incrementFaultAndMaybeRotate(round);
    }
  }

  function incrementFaultAndMaybeRotate(round) {
    const teamName = G.teams[G.turn].name;
    round.faults[teamName] = (round.faults[teamName] || 0) + 1;
    U().sfx && U().sfx.wrong && U().sfx.wrong();
    if (round.faults[teamName] >= G.faultLimit) {
      round.finalStealAllowed = true;
      // rotate to next team to attempt steal
      G.turn = (G.turn + 1) % G.teams.length;
      tvVocabShowRound();
    } else {
      tvVocabShowRound();
    }
  }

  function tvVocabSubmitManualReveal() {
    const round = G.currentRound;
    if (!round || !round.boxes) return;
    // reveal first unrevealed answer box
    const box = round.boxes.find((b) => b.answer && !b.revealed);
    if (box) {
      box.revealed = true;
      box.revealedBy = G.turn;
      const pts = box.points || (G.pointsPerAnswer || 100);
      round.roundPoints = (round.roundPoints || 0) + pts;
      G.teams[G.turn].score = (G.teams[G.turn].score || 0) + pts;

      // if reveal happened after owner faults exhausted and this is stealing team, award full round
      if (round.finalStealAllowed && round.ownerTeamName && round.ownerTeamName !== G.teams[G.turn].name) {
        const total = round.roundPoints || 0;
        const ownerIdx = G.teams.findIndex((t) => t.name === round.ownerTeamName);
        if (ownerIdx >= 0) {
          G.teams[ownerIdx].score = Math.max(0, (G.teams[ownerIdx].score || 0) - total);
        }
        G.teams[G.turn].score += Math.max(0, total - pts);
        (round.boxes || []).forEach((b) => { b.revealed = true; });
        tvVocabShowRound();
        setTimeout(() => { G.turn = (G.turn + 1) % G.teams.length; tvVocabNextRound(); }, 700);
        return;
      }

      // Check if all boxes with answers are revealed
      const allDone = (round.boxes || []).every((b) => !b.answer || b.revealed);
      if (allDone) {
        tvVocabShowRound();
        U().sfx && U().sfx.correct && U().sfx.correct();
        G.turn = (G.turn + 1) % G.teams.length;
        setTimeout(tvVocabNextRound, 800);
        return;
      }

      tvVocabShowRound();
    }
  }

  function tvVocabEndRoundAndNext() {
    // if final steal allowed, the team that stole gains roundPoints
    const round = G.currentRound;
    if (!round) return;
    if (round.finalStealAllowed) {
      // no successful steal happened: owner keeps the roundPoints
      const owner = round.ownerTeamName;
      if (owner) {
        const ownerIdx = G.teams.findIndex((t) => t.name === owner);
        if (ownerIdx >= 0) {
          G.teams[ownerIdx].score = (G.teams[ownerIdx].score || 0) + (round.roundPoints || 0);
        }
      }
    }
    // advance turn and next round
    G.turn = (G.turn + 1) % G.teams.length;
    tvVocabNextRound();
  }

  /* ================================================================
     Spelling Bee en groupe
     ================================================================ */
  const SPELLING_POINTS = 100;

  function spellingList() {
    const list = C().spellingWords;
    if (list && list.length) {
      return U().uniqueById(list.map((item) => typeof item === "string" ? { word: item, tier: "easy" } : item));
    }
    return [
      { word: "Cat", tier: "easy" },
      { word: "Delicious", tier: "medium" },
      { word: "Extraordinary", tier: "hard" }
    ];
  }

  function spellingBeeSetup() {
    let roundSec = 40;
    let tierFilter = "all";
    teamSetup({
      title: "🐝 Spelling Bee — teams",
      subtitle: "The referee plays the word audio; team members spell it out loud!",
      hideTimer: true,
      note: "Each turn: the team listens to the word audio (without seeing the text). They must spell it out loud letter by letter before time runs out. A correct spelling wins 100 points!",
      extras: (scr, h) => {
        const pills = h("div", { class: "pill-group" });
        function renderDur() {
          pills.innerHTML = "";
          [["30s", 30], ["40s", 40], ["60s", 60], ["90s", 90]].forEach(([label, val]) => {
            pills.appendChild(h("button", {
              class: "pill" + (roundSec === val ? " active" : ""),
              onclick: () => { roundSec = val; renderDur(); }
            }, [label]));
          });
        }
        const tierPills = h("div", { class: "pill-group" });
        function renderTiers() {
          tierPills.innerHTML = "";
          [["All Tiers", "all"], ["Easy", "easy"], ["Medium", "medium"], ["Hard", "hard"]].forEach(([label, val]) => {
            tierPills.appendChild(h("button", {
              class: "pill" + (tierFilter === val ? " active" : ""),
              onclick: () => { tierFilter = val; renderTiers(); }
            }, [label]));
          });
        }
        renderDur(); renderTiers();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Time to spell"]), pills]),
          h("div", {}, [h("div", { class: "section-sub" }, ["Difficulty Tier"]), tierPills])
        ]));
        return () => ({ roundSec: roundSec, tierFilter: tierFilter });
      },
      onStart: (teams, opts) => startSpellingBee(teams, opts)
    });
  }

  function startSpellingBee(teams, opts) {
    opts = opts || {};
    let pool = spellingList();
    if (opts.tierFilter && opts.tierFilter !== "all") {
      const filtered = pool.filter((item) => item.tier === opts.tierFilter);
      if (filtered.length) pool = filtered;
    }
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      roundSec: opts.roundSec || 40,
      onComplete: opts.onComplete || null,
      spellingDeck: U().newSessionDeck(pool, "group_spelling")
    };
    spellingBeeReady();
  }

  function spellingBeeEndBtn(h) {
    return h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"]);
  }

  function spellingBeeReady() {
    const team = G.teams[G.turn];
    const nextItem = G.spellingDeck.draw();
    if (!nextItem) {
      podium();
      return;
    }
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🐝 ", h("span", { class: "team" }, [team.name]), "'s turn"
      ]));
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "q" }, [team.name + " — get ready to listen & spell!"]));
      card.appendChild(h("p", { class: "section-sub" }, ["Press the button to play the word audio on the TV."]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => spellingBeePlay(nextItem) }, ["🔊 Play Word & Start"]),
        spellingBeeEndBtn(h)
      ]));
    });
  }

  function spellingBeePlay(item) {
    const team = G.teams[G.turn];
    let remaining = G.roundSec, timer = null, done = false;
    U().speak(item.word);

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🐝 ", h("span", { class: "team" }, [team.name]), " — spell out loud!"
      ]));

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["Difficulty: " + (item.tier || "easy").toUpperCase()]));

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      card.appendChild(chrono); card.appendChild(chronoLabel);

      card.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "speaker", onclick: () => U().speak(item.word) }, ["🔊 Repeat Word"])
      ]));

      card.appendChild(h("p", { class: "section-sub mt" }, ["Listen carefully and spell the word out loud letter by letter!"]));

      const panel = h("div", { class: "ref-panel mt" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — did " + team.name + " spell it correctly?"]));
      panel.appendChild(h("div", { class: "award-grid" }, [
        h("button", { class: "btn btn-green", onclick: () => win() }, ["✅ Correct! (+" + SPELLING_POINTS + " pts)"]),
        h("button", { class: "btn btn-red", onclick: () => lose() }, ["⏭️ Wrong / Pass (0 pts)"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [spellingBeeEndBtn(h)]));

      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.roundSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) lose();
      }
      function stop() { if (timer) clearInterval(timer); }
      function win() {
        if (done) return; done = true; stop();
        team.score += SPELLING_POINTS;
        U().sfx.correct();
        spellingBeeResult(item, true);
      }
      function lose() {
        if (done) return; done = true; stop();
        U().sfx.wrong();
        spellingBeeResult(item, false);
      }
    });
  }

  function spellingBeeResult(item, guessed) {
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, [guessed ? "✅ Correct Spelling!" : "⏰ Time's up / Incorrect"]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, [guessed ? "+" + SPELLING_POINTS + " points" : "No points"]),
        "The word was: " + item.word
      ]));
      card.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "speaker", onclick: () => U().speak(item.word) }, ["🔊"])
      ]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => nextSpellingBeeTurn() }, ["▶ Next team"]),
        spellingBeeEndBtn(h)
      ]));
    }, { replace: true });
  }

  function nextSpellingBeeTurn() {
    G.turn = (G.turn + 1) % G.teams.length;
    spellingBeeReady();
  }

  /* ================================================================
     Pronunciation Drill (group / TV)
     ================================================================ */
  const PRON_POINTS = 100;

  function pronouncePool(tier) {
    let pool = U().uniqueById(C().pronunciationWords || []);
    if (tier && tier !== "all") {
      const filtered = pool.filter((w) => (w.tier || "medium") === tier);
      if (filtered.length >= 3) pool = filtered;
    }
    return pool;
  }

  function pronounceSetup() {
    let tierFilter = "all";
    teamSetup({
      title: "🗣️ Pronunciation Drill — teams",
      subtitle: "Teams say tricky English words; the referee plays the model and judges.",
      hideTimer: true,
      note: "Each turn: the team sees the word + phonetics + tip, says it out loud, then the referee plays 🔊 Hear model and awards points if the pronunciation is good. Focus on silent letters, TH, stress, and other traps.",
      extras: (scr, h) => {
        const tierPills = h("div", { class: "pill-group" });
        function renderTiers() {
          tierPills.innerHTML = "";
          [["All", "all"], ["Easy", "easy"], ["Medium", "medium"], ["Hard", "hard"]].forEach(([label, val]) => {
            tierPills.appendChild(h("button", {
              class: "pill" + (tierFilter === val ? " active" : ""),
              onclick: () => { tierFilter = val; renderTiers(); }
            }, [label]));
          });
        }
        renderTiers();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Difficulty"]), tierPills])
        ]));
        return () => ({ tierFilter: tierFilter });
      },
      onStart: (teams, opts) => startPronounce(teams, opts)
    });
  }

  function startPronounce(teams, opts) {
    opts = opts || {};
    const pool = pronouncePool(opts.tierFilter || "all");
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      onComplete: opts.onComplete || null,
      pronDeck: U().newSessionDeck(pool, "group_pronounce_" + (opts.tierFilter || "all"))
    };
    pronounceReady();
  }

  function pronounceEndBtn(h) {
    return h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"]);
  }

  function pronounceReady() {
    const team = G.teams[G.turn];
    const nextItem = G.pronDeck.draw();
    if (!nextItem) {
      podium();
      return;
    }

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🗣️ ", h("span", { class: "team" }, [team.name]), "'s turn"
      ]));
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "q" }, [team.name + " — get ready to pronounce!"]));
      card.appendChild(h("p", { class: "section-sub" }, [
        "Say the word clearly out loud, then the referee verifies and reveals model audio & phonetics."
      ]));
      card.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => pronouncePlay(nextItem) }, ["Show word ➔"]),
        pronounceEndBtn(h)
      ]));
      scr.appendChild(card);
    });
  }

  function pronouncePlay(item) {
    if (!item) { podium(); return; }
    const team = G.teams[G.turn];
    let isVerified = false;

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🗣️ ", h("span", { class: "team" }, [team.name]), " — pronounce this word!"
      ]));

      const card = h("div", { class: "gd-question pronounce-card" });
      card.appendChild(h("div", { class: "pron-trap" }, [item.trap || "pronunciation"]));
      card.appendChild(h("div", { class: "prompt-word pron-word" }, [item.word]));

      const status = h("div", { class: "pron-status" }, [
        team.name + ": Say the word out loud! Referee: tap 'Verify' when done."
      ]);
      card.appendChild(status);

      // Zone d'information masquée avant la vérification
      const revealedBox = h("div", { class: "pron-revealed-box", style: "display:none; width:100%;" });
      revealedBox.appendChild(h("div", { class: "pron-ipa mt-sm" }, [item.ipa || ""]));
      if (item.fr) revealedBox.appendChild(h("p", { class: "pron-fr" }, ["🇫🇷 " + item.fr]));
      if (item.tip) {
        revealedBox.appendChild(h("div", { class: "pron-tip" }, [
          h("strong", {}, ["Tip: "]), item.tip
        ]));
      }
      if (item.focus) revealedBox.appendChild(h("p", { class: "pron-focus" }, [item.focus]));

      revealedBox.appendChild(h("div", { class: "row center mt-sm" }, [
        h("button", { class: "btn btn-ghost", onclick: () => U().speak(item.word) }, ["🔊 Hear model"]),
        h("button", { class: "btn btn-ghost", onclick: () => U().speak(item.word, { slow: true }) }, ["🐢 Hear slowly"])
      ]));

      const panel = h("div", { class: "ref-panel mt-md" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — did " + team.name + " pronounce it well?"]));
      panel.appendChild(h("div", { class: "award-grid" }, [
        h("button", { class: "btn btn-green", onclick: () => succeed() }, ["✅ Good  (+" + PRON_POINTS + ")"]),
        h("button", { class: "btn btn-red", onclick: () => fail() }, ["😅 Try next time"])
      ]));
      revealedBox.appendChild(panel);
      card.appendChild(revealedBox);

      // Bouton de vérification initial
      const verifyBtn = h("button", {
        class: "btn btn-primary mt-lg",
        onclick: () => verifyAndReveal()
      }, ["🔍 Verify & Reveal Pronunciation"]);

      const initialWrap = h("div", { class: "row center mt-md" }, [verifyBtn]);
      card.appendChild(initialWrap);

      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [pronounceEndBtn(h)]));

      function verifyAndReveal() {
        if (isVerified) {
          U().speak(item.word);
          return;
        }
        isVerified = true;
        initialWrap.style.display = "none";
        revealedBox.style.display = "block";
        status.textContent = "🔊 Model pronunciation played & phonetics revealed!";
        status.className = "pron-status hear";
        U().sfx.tick();
        // Prononciation orale automatique
        U().speak(item.word);
      }

      function succeed() {
        team.score += PRON_POINTS;
        U().sfx.correct();
        nextPronounceTurn();
      }
      function fail() {
        U().sfx.wrong();
        U().speak(item.word, { slow: true });
        setTimeout(nextPronounceTurn, 1200);
      }
    });
  }

  function nextPronounceTurn() {
    G.turn = (G.turn + 1) % G.teams.length;
    pronounceReady();
  }

  function anagramSetup() {
    let roundSec = 90;
    teamSetup({
      title: "🔤 Anagram — teams",
      subtitle: "The referee sets up the teams, then shows the scrambled letters on the TV.",
      hideTimer: true,
      note: "Each team gets a time budget. Scrambled words appear one by one; the team says the word and the referee types it in. A correct word scores up to " + ANA_POINTS + " points; a wrong answer cuts " + ANA_PENALTY + " seconds off the clock. Each team may pass up to " + ANA_MAX_PASS + " words. Stuck? A 💡 hint reveals the next letter but lowers that word's points. (Referee typos are forgiven — a close spelling still counts.)",
      extras: (scr, h) => {
        const pills = h("div", { class: "pill-group" });
        function renderDur() {
          pills.innerHTML = "";
          [["60s", 60], ["90s", 90], ["2 min", 120]].forEach(([label, val]) => {
            pills.appendChild(h("button", {
              class: "pill" + (roundSec === val ? " active" : ""),
              onclick: () => { roundSec = val; renderDur(); }
            }, [label]));
          });
        }
        renderDur();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Time per team"]), pills])
        ]));
        return () => ({ roundSec: roundSec });
      },
      onStart: (teams, opts) => startAnagram(teams, opts)
    });
  }

  function grammarSetup() {
    let topic = "All topics";
    teamSetup({
      title: "📝 Grammar Duel — teams",
      subtitle: "The referee sets up the teams, then shows the sentences on the TV.",
      extras: (scr, h) => {
        const cats = ["All topics"].concat(
          Array.from(new Set(C().grammar.map((i) => i.cat)))
        );
        const pills = h("div", { class: "pill-group" });
        function renderTopics() {
          pills.innerHTML = "";
          cats.forEach((c) => {
            const count = c === "All topics"
              ? C().grammar.length
              : C().grammar.filter((i) => i.cat === c).length;
            pills.appendChild(h("button", {
              class: "pill" + (topic === c ? " active" : ""),
              onclick: () => { topic = c; renderTopics(); }
            }, [c + " (" + count + ")"]));
          });
        }
        renderTopics();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Topic"]), pills])
        ]));
        return () => ({ topic: topic });
      },
      onStart: (teams, opts) => startGrammar(teams, opts)
    });
  }

  function irregularSetup() {
    let mode = "mixed";
    teamSetup({
      title: "🔁 Irregular Verbs — teams",
      subtitle: "The referee shows one verb; teams answer with the past simple, past participle, or the correct definition.",
      extras: (scr, h) => {
        const pills = h("div", { class: "pill-group" });
        function renderMode() {
          pills.innerHTML = "";
          [["Mixed", "mixed"], ["Past simple", "past"], ["Past participle", "participle"], ["Definition", "meaning"]].forEach(([label, val]) => {
            pills.appendChild(h("button", {
              class: "pill" + (mode === val ? " active" : ""),
              onclick: () => { mode = val; renderMode(); }
            }, [label]));
          });
        }
        renderMode();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Question type"]), pills])
        ]));
        return () => ({ mode: mode });
      },
      onStart: (teams, opts) => startIrregular(teams, opts)
    });
  }

  function phrasalSetup() {
    let lang = "fr";
    teamSetup({
      title: "🔗 Phrasal Verbs — teams",
      subtitle: "A phrasal verb appears on the TV. Teams pick the correct meaning.",
      extras: (scr, h) => {
        const pills = h("div", { class: "pill-group" });
        function renderLang() {
          pills.innerHTML = "";
          [["🇫🇷 French meanings", "fr"], ["🇬🇧 English meanings", "en"]].forEach(([label, val]) => {
            pills.appendChild(h("button", {
              class: "pill" + (lang === val ? " active" : ""),
              onclick: () => { lang = val; renderLang(); }
            }, [label]));
          });
        }
        renderLang();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Meaning language"]), pills])
        ]));
        return () => ({ lang: lang });
      },
      onStart: (teams, opts) => startPhrasal(teams, opts)
    });
  }

  function wordChainSetup() {
    let turnSec = 60;
    let mode = "separate";
    teamSetup({
      title: "🔗 Word Chain — teams",
      subtitle: "Choose the mode, set the teams and the time, then show the word on the TV.",
      hideTimer: true,
      note: "Rule: a starting word appears; each new word must start with the LAST letter of the previous one. Separate mode — each team builds its own chain against the clock. Shared mode — teams take turns on ONE chain; if a team is stuck, the others can steal the points. Vs Computer — each team plays a round against the CPU.",
      extras: (scr, h) => {
        const modePills = h("div", { class: "pill-group" });
        const durLabel = h("div", { class: "section-sub" }, ["Time per team"]);
        const durWrap = h("div");
        function durOptions() {
          return mode === "shared"
            ? [["10s", 10], ["15s", 15], ["20s", 20], ["30s", 30]]
            : [["30s", 30], ["60s", 60], ["90s", 90], ["2 min", 120]];
        }
        function renderDur() {
          durWrap.innerHTML = "";
          const grp = h("div", { class: "pill-group" });
          durOptions().forEach(([label, val]) => {
            grp.appendChild(h("button", {
              class: "pill" + (turnSec === val ? " active" : ""),
              onclick: () => { turnSec = val; renderDur(); }
            }, [label]));
          });
          durWrap.appendChild(grp);
        }
        function renderMode() {
          modePills.innerHTML = "";
          [["Each team separate", "separate"], ["One shared chain (steals)", "shared"], ["Each team vs Computer", "vsComputer"]].forEach(([label, val]) => {
            modePills.appendChild(h("button", {
              class: "pill" + (mode === val ? " active" : ""),
              onclick: () => {
                mode = val;
                turnSec = (mode === "shared") ? 20 : 60;
                durLabel.textContent = mode === "shared" ? "Time per turn" : "Time per team";
                renderMode(); renderDur();
              }
            }, [label]));
          });
        }
        renderMode();
        renderDur();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Mode"]), modePills]),
          h("div", {}, [durLabel, durWrap])
        ]));
        return () => ({ turnSec: turnSec, mode: mode });
      },
      onStart: (teams, opts) => {
        if (opts.mode === "shared") startWordChainShared(teams, opts);
        else if (opts.mode === "vsComputer") startWordChainVsComputer(teams, opts);
        else startWordChain(teams, opts);
      },
      minTeams: 1
    });
  }

  /* ---------------- Chrono à deux phases (réutilisable) ---------------- */
  function makeChrono(bar, chronoEl, labelEl) {
    let remaining = G.phaseSec, phase = 1, timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start2() {
      remaining = G.phaseSec;
      timer = setInterval(() => {
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.phaseSec) * 100) + "%";
        if (remaining <= 3 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) {
          if (phase === 1) {
            phase = 2;
            chronoEl.classList.add("phase2");
            labelEl.className = "chrono-label phase2 center row";
            labelEl.textContent = "🟠 Open to all teams — steal the points!";
            remaining = G.phaseSec;
          } else { stop(); labelEl.textContent = "⏰ Time's up"; }
        }
      }, 100);
    }
    return { start: start2, stop };
  }

  /* ----------------------------------------------------------------
     Démarrage réutilisable — utilisé par le mode autonome ET le Mode Réunion.
     opts : { timerOn, phaseSec, onComplete(rankedTeams) }
     Si onComplete est fourni, la fin de partie le rappelle au lieu
     d'afficher le podium autonome (le Mode Réunion gère la suite).
     ---------------------------------------------------------------- */
  function start(teams, opts) {
    opts = opts || {};
    if (Array.isArray(opts.selectedTopicNames)) {
      saveBigChallengeSelection(opts.selectedTopicNames);
    }
    if (Array.isArray(opts.selectedTopics) && opts.selectedTopics.length < 2) {
      U().alertBox("Choose at least 2 topics for The Big Challenge.");
      return;
    }
    let selectedTopics = Array.isArray(opts.selectedTopics) && opts.selectedTopics.length >= 2
      ? opts.selectedTopics
      : getSavedBigChallengeTopics();
    if (selectedTopics.length < 2) {
      selectedTopics = getDefaultBigChallengeTopics();
    }
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      used: {},
      timerOn: opts.timerOn !== false,
      phaseSec: opts.phaseSec || 12,
      onComplete: opts.onComplete || null,
      topics: selectedTopics
    };
    board();
  }

  /* ================================================================
     2) Le plateau
     ================================================================ */
  function totalCells() {
    return (G.topics || C().grandDefi).reduce((s, t) => s + t.questions.length, 0);
  }
  function usedCount() { return Object.keys(G.used).length; }

  function board() {
    U().show((scr) => {
      const h = U().h;
      const topics = G.topics || C().grandDefi;
      const maxRows = Math.max.apply(null, topics.map((t) => t.questions.length));

      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "Your turn: ", h("span", { class: "team" }, [G.teams[G.turn].name]),
        " — pick a topic and points"
      ]));

      const wrap = h("div", { class: "board-wrap" });
      const grid = h("div", { class: "board", style: `grid-template-columns: repeat(${topics.length}, 1fr)` });

      // en-têtes
      topics.forEach((t) => {
        grid.appendChild(h("div", { class: "col-head" }, [
          h("span", { class: "em" }, [t.emoji]), t.topic
        ]));
      });
      // cellules, rangée par rangée
      for (let r = 0; r < maxRows; r++) {
        topics.forEach((t, ti) => {
          const sorted = t.questions.slice().sort((a, b) => a.points - b.points);
          const q = sorted[r];
          if (!q) { grid.appendChild(h("div", {})); return; }
          const key = ti + "_" + q.points;
          const isUsed = !!G.used[key];
          const cell = h("button", {
            class: "cell" + (isUsed ? " used" : ""),
            onclick: isUsed ? null : () => question(ti, q, key)
          }, [String(q.points)]);
          if (q.gift && !isUsed) cell.appendChild(h("span", { class: "gift-tag" }, ["🎁"]));
          grid.appendChild(cell);
        });
      }
      wrap.appendChild(grid);
      scr.appendChild(wrap);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", {
          class: "btn btn-ghost", onclick: () => {
            U().confirmBox("End the game and see the podium?", podium);
          }
        }, ["🏁 End the game"])
      ]));
      scr.appendChild(h("p", { class: "note" }, [
        `Cells played: ${usedCount()} / ${totalCells()}`
      ]));

      if (usedCount() >= totalCells()) setTimeout(podium, 400);
    });
  }

  function scoreboard(scr) {
    const h = U().h;
    const sb = h("div", { class: "scoreboard" });
    G.teams.forEach((t, idx) => {
      sb.appendChild(h("div", { class: "score-chip" + (idx === G.turn ? " active" : "") }, [
        h("div", { class: "name" }, [t.name]),
        h("div", { class: "pts" }, [String(t.score)])
      ]));
    });
    scr.appendChild(sb);
  }

  /* ================================================================
     3) Une question
     ================================================================ */
  function question(topicIdx, q, key) {
    const topic = C().grandDefi[topicIdx];
    const choices = U().shuffle(q.choices);
    let chronoCtl = null, revealed = false;
    function stopTimer() { if (chronoCtl) chronoCtl.stop(); }

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, [topic.emoji + " " + topic.topic + (q.gift ? "  🎁 Mystery gift" : "")]));
      card.appendChild(h("div", { class: "worth" }, [q.points + " points"]));
      card.appendChild(h("div", { class: "q" }, [q.q]));

      // chrono
      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [
        G.timerOn ? "🟢 " + G.teams[G.turn].name + "'s turn" : "Timer off"
      ]);
      if (G.timerOn) { card.appendChild(chrono); card.appendChild(chronoLabel); }

      // choix (affichés pour la télé ; l'arbitre révèle)
      const optWrap = h("div", { class: "options" });
      const letters = ["A", "B", "C", "D"];
      const optBtns = [];
      choices.forEach((c, idx) => {
        const b = h("button", { class: "opt", disabled: "" }, [letters[idx] + ".  " + c]);
        optBtns.push(b);
        optWrap.appendChild(b);
      });
      card.appendChild(optWrap);

      const reveal = h("div", { class: "reveal" });
      card.appendChild(reveal);

      function doReveal() {
        if (revealed) return;
        revealed = true;
        const idx = choices.indexOf(q.answer);
        if (optBtns[idx]) optBtns[idx].classList.add("correct");
        reveal.appendChild(h("span", {}, ["Correct answer: ", h("span", { class: "ans" }, [q.answer]), " "]));
        reveal.appendChild(h("button", { class: "speaker", onclick: () => U().speak(q.answer) }, ["🔊"]));
        stopTimer();
      }

      // referee panel
      const panel = h("div", { class: "ref-panel" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — who answered correctly?"]));
      const awards = h("div", { class: "award-grid" });
      G.teams.forEach((t, idx) => {
        awards.appendChild(h("button", {
          class: "btn " + (idx === G.turn ? "btn-green" : "btn-ghost"),
          onclick: () => award(idx)
        }, [`✅ ${t.name}  (+${q.points})`]));
      });
      awards.appendChild(h("button", { class: "btn btn-red", onclick: () => award(-1) }, ["❌ Nobody (0)"]));
      panel.appendChild(awards);
      panel.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "btn btn-ghost", onclick: doReveal }, ["👁️ Reveal the answer"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);

      /* ----- chrono à deux phases ----- */
      if (G.timerOn) { chronoCtl = makeChrono(bar, chrono, chronoLabel); chronoCtl.start(); }

      /* ----- attribution des points ----- */
      function award(teamIdx) {
        stopTimer();
        doReveal();
        G.used[key] = true;
        if (teamIdx >= 0) {
          let earned = q.points;
          if (G.teams[teamIdx].doubleOrNothing) {
            earned = earned * 2;
            delete G.teams[teamIdx].doubleOrNothing;
          }
          G.teams[teamIdx].score = Math.max(0, G.teams[teamIdx].score + earned);
          U().sfx.correct();
          // cadeau mystère si question 🎁 et bonne réponse
          if (q.gift) { giftFlow(teamIdx, afterAward); return; }
        } else {
          if (G.turn >= 0 && G.teams[G.turn].doubleOrNothing) {
            G.teams[G.turn].score = 0;
            delete G.teams[G.turn].doubleOrNothing;
          }
          U().sfx.wrong();
        }
        afterAward();
      }
      function afterAward() {
        G.turn = (G.turn + 1) % G.teams.length; // l'équipe suivante choisit
        if (G.teams[G.turn].frozen) {
          delete G.teams[G.turn].frozen;
          U().alertBox(`🧊 ${G.teams[G.turn].name} is frozen! Turn skipped.`, () => {
            G.turn = (G.turn + 1) % G.teams.length;
            board();
          });
          return;
        }
        board();
      }
    });
  }

  /* ================================================================
     4) Cadeau mystère — garder ou offrir (choix à l'aveugle + effets majeurs)
     ================================================================ */
  function giftFlow(winnerIdx, done) {
    U().sfx.gift();
    const overlay = U().h("div", { class: "modal-back" });
    const modal = U().h("div", { class: "modal", style: "max-width:480px" });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function step1() {
      const h = U().h;
      modal.innerHTML = "";
      modal.appendChild(h("div", { class: "gift-emoji" }, ["🎁"]));
      modal.appendChild(h("h3", {}, ["Mystery gift!"]));
      modal.appendChild(h("p", { class: "section-sub" }, [
        G.teams[winnerIdx].name, " wins a gift. Blindly: keep it or give it away?"
      ]));
      const give = h("div", { class: "give-list" });
      give.appendChild(h("button", { class: "btn btn-primary", onclick: () => reveal(winnerIdx) }, ["🤲 Keep it"]));
      G.teams.forEach((t, idx) => {
        if (idx === winnerIdx) return;
        give.appendChild(h("button", { class: "btn btn-ghost", onclick: () => reveal(idx) }, ["🎁 Give to " + t.name]));
      });
      modal.appendChild(give);
    }

    function reveal(recipientIdx) {
      const gift = U().rand(C().gifts);
      const isMajor = gift.tier === "major";

      if (gift.good) {
        if (isMajor) { U().sfx.win(); U().confetti(1600); }
        else { U().sfx.correct(); }
      } else {
        U().sfx.wrong();
      }

      const h = U().h;
      modal.innerHTML = "";

      if (isMajor) {
        modal.appendChild(h("div", {
          style: "font-size:0.8rem;font-weight:bold;color:var(--brand);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;"
        }, ["✨ MAJOR MYSTERY GIFT ✨"]));
      }

      modal.appendChild(h("div", { class: "gift-emoji" }, [isMajor ? (gift.good ? "🌟" : "💥") : (gift.good ? "🎉" : "💣")]));
      modal.appendChild(h("h3", {}, ["For ", G.teams[recipientIdx].name]));
      modal.appendChild(h("div", { class: "gift-reveal " + (gift.good ? "good" : "bad") }, [gift.label]));

      if (gift.effect === "swap") {
        const otherTeams = G.teams.map((t, idx) => ({ t, idx })).filter(item => item.idx !== recipientIdx);
        if (otherTeams.length === 1) {
          const targetIdx = otherTeams[0].idx;
          const temp = G.teams[recipientIdx].score;
          G.teams[recipientIdx].score = G.teams[targetIdx].score;
          G.teams[targetIdx].score = temp;
          modal.appendChild(h("p", { class: "note mt" }, [`Swapped scores with ${G.teams[targetIdx].name}!`]));
          modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
        } else {
          modal.appendChild(h("p", { class: "section-sub mt" }, ["Choose team to swap scores with:"]));
          const swapBtns = h("div", { class: "give-list mt-sm" });
          otherTeams.forEach(({ t, idx }) => {
            swapBtns.appendChild(h("button", {
              class: "btn btn-primary",
              onclick: () => {
                const temp = G.teams[recipientIdx].score;
                G.teams[recipientIdx].score = G.teams[idx].score;
                G.teams[idx].score = temp;
                overlay.remove();
                done();
              }
            }, [`Swap with ${t.name} (${t.score} pts)`]));
          });
          modal.appendChild(swapBtns);
        }
      } else if (gift.effect === "steal") {
        let leaderIdx = 0;
        G.teams.forEach((t, idx) => {
          if (t.score > G.teams[leaderIdx].score) leaderIdx = idx;
        });
        if (leaderIdx === recipientIdx && G.teams.length > 1) {
          const sorted = G.teams.map((t, idx) => ({ t, idx })).sort((a, b) => b.t.score - a.t.score);
          leaderIdx = sorted[1].idx;
        }
        const stolen = Math.round(G.teams[leaderIdx].score * 0.35);
        G.teams[leaderIdx].score = Math.max(0, G.teams[leaderIdx].score - stolen);
        G.teams[recipientIdx].score += stolen;
        modal.appendChild(h("p", { class: "note mt" }, [`Stole ${stolen} points from ${G.teams[leaderIdx].name}!`]));
        modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
      } else if (gift.effect === "leader_target") {
        let leaderIdx = 0;
        G.teams.forEach((t, idx) => {
          if (t.score > G.teams[leaderIdx].score) leaderIdx = idx;
        });
        const penalty = Math.round(G.teams[leaderIdx].score * 0.30);
        G.teams[leaderIdx].score = Math.max(0, G.teams[leaderIdx].score - penalty);
        const others = G.teams.filter((t, idx) => idx !== leaderIdx);
        if (others.length > 0) {
          const share = Math.floor(penalty / others.length);
          others.forEach(t => t.score += share);
        }
        modal.appendChild(h("p", { class: "note mt" }, [`Leader ${G.teams[leaderIdx].name} lost ${penalty} pts distributed to others!`]));
        modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
      } else if (gift.effect === "reverse") {
        const sortedScores = G.teams.map(t => t.score).sort((a, b) => a - b);
        G.teams.forEach((t) => {
          const originalRankIndex = sortedScores.indexOf(t.score);
          const newScoreIndex = sortedScores.length - 1 - originalRankIndex;
          t.score = sortedScores[newScoreIndex];
        });
        modal.appendChild(h("p", { class: "note mt" }, ["All team rankings have been inverted!"]));
        modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
      } else if (gift.effect === "bankrupt") {
        G.teams[recipientIdx].score = 0;
        modal.appendChild(h("p", { class: "note mt" }, [`${G.teams[recipientIdx].name}'s score was reset to 0!`]));
        modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
      } else if (gift.effect === "freeze") {
        G.teams[recipientIdx].frozen = true;
        modal.appendChild(h("p", { class: "note mt" }, [`${G.teams[recipientIdx].name} will skip their next turn!`]));
        modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
      } else if (gift.effect === "double_or_nothing") {
        G.teams[recipientIdx].doubleOrNothing = true;
        modal.appendChild(h("p", { class: "note mt" }, [`Double or Nothing active for ${G.teams[recipientIdx].name}'s next question!`]));
        modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
      } else {
        if (gift.delta) {
          G.teams[recipientIdx].score = Math.max(0, G.teams[recipientIdx].score + gift.delta);
        }
        modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
      }
    }

    step1();
  }

  /* ================================================================
     4b) Anagramme en groupe — ronde chronométrée par équipe.
     Lettres mélangées sur la télé ; l'équipe dicte le mot, l'arbitre le
     saisit. Bonne réponse = points ; mauvaise réponse = temps en moins ;
     chaque équipe peut passer jusqu'à ANA_MAX_PASS mots.
     ================================================================ */
  const ANA_POINTS = 100;  // points par mot trouvé (sans indice)
  const ANA_PENALTY = 50;   // secondes perdues par mauvaise réponse
  const ANA_MAX_PASS = 3;  // nombre de « pass » autorisés par équipe
  const ANA_HINT_PTS = [100, 60, 30, 20]; // points selon le nb d'indices utilisés (lettres révélées)

  // distance de Levenshtein (pour tolérer les fautes de frappe de l'arbitre)
  function anaLeven(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = [];
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }
  // accepte la réponse si elle est exacte OU assez proche (faute de frappe)
  function anaMatch(guess, target) {
    const g = String(guess).trim().toLowerCase().replace(/\s+/g, "");
    const w = String(target).toLowerCase();
    if (!g) return false;
    if (g === w) return true;
    const tol = w.length >= 8 ? 2 : 1; // 1 faute tolérée (2 pour les mots longs)
    return anaLeven(g, w) <= tol;
  }

  function startAnagram(teams, opts) {
    opts = opts || {};
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      roundSec: opts.roundSec || 90,
      onComplete: opts.onComplete || null,
      anaDeck: U().newSessionDeck(C().anagramWords, "group_anagram")
    };
    anagramTurn(0);
  }

  function anaDraw() {
    return G.anaDeck.draw();
  }

  function anagramTurn(idx) {
    G.turn = idx;
    const team = G.teams[idx];
    let remaining = G.roundSec, timer = null, done = false;
    let solved = 0, roundPts = 0, passesUsed = 0;
    let word = null, scrambled = null, revealed = 0;

    function loadWord() {
      word = anaDraw();
      if (!word) {
        endRound();
        return;
      }
      revealed = 0;
      // Guarantee scrambled differs from original word (try up to 5 times)
      for (let t = 0; t < 5; t++) {
        scrambled = U().shuffle(word.split(""));
        if (scrambled.join("") !== word || word.length <= 1) break;
      }
    }
    loadWord();

    U().show((scr) => {
      const h = U().h;

      // tableau des scores + total en direct pour l'équipe active
      const sb = h("div", { class: "scoreboard" });
      let ptsNode = null;
      G.teams.forEach((t, i) => {
        const pts = h("div", { class: "pts" }, [String(t.score)]);
        if (i === idx) ptsNode = pts;
        sb.appendChild(h("div", { class: "score-chip" + (i === idx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]), pts
        ]));
      });
      scr.appendChild(sb);

      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🔤 ", h("span", { class: "team" }, [team.name]), " — unscramble the words!"
      ]));

      // lettres mélangées (mêmes tuiles que Word Builder)
      const tilesBox = h("div", { class: "wb-letters" });
      function renderTiles() {
        tilesBox.innerHTML = "";
        scrambled.forEach((l) => tilesBox.appendChild(h("span", { class: "wb-tile" }, [l.toUpperCase()])));
      }
      renderTiles();
      scr.appendChild(tilesBox);

      // valeur du mot (baisse avec les indices) + aperçu des lettres révélées
      const worthEl = h("div", { class: "worth", style: "text-align:center; margin:6px 0" }, ["This word: " + wordPts() + " pts"]);
      scr.appendChild(worthEl);
      const hintLine = h("div", { class: "ana-reveal" }, [""]);
      scr.appendChild(hintLine);

      // chrono (compte à rebours simple)
      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      scr.appendChild(chrono); scr.appendChild(chronoLabel);

      const card = h("div", { class: "gd-question" });
      function infoText() { return "Passes left: " + (ANA_MAX_PASS - passesUsed) + "   ·   Solved: " + solved + "   ·   +" + roundPts + " pts"; }
      const infoEl = h("div", { class: "wc-count" }, [infoText()]);
      card.appendChild(infoEl);

      // saisie de l'arbitre (le mot dicté par l'équipe)
      const input = h("input", {
        type: "text", placeholder: "Type the team's answer…", autocomplete: "off",
        onkeydown: (e) => { if (e.key === "Enter") submit(); }
      });
      const addBtn = h("button", { class: "btn btn-primary", onclick: () => submit() }, ["Check ✓"]);
      card.appendChild(h("div", { class: "wc-input-row" }, [input, addBtn]));
      const feedback = h("div", { class: "wc-feedback" }, [""]);
      card.appendChild(feedback);
      scr.appendChild(card);

      function passLabel() { return "🔁 Pass word (" + (ANA_MAX_PASS - passesUsed) + " left)"; }
      const passBtn = h("button", { class: "btn btn-ghost", onclick: () => pass() }, [passLabel()]);
      if (passesUsed >= ANA_MAX_PASS) passBtn.disabled = true;
      const hintBtn = h("button", { class: "btn btn-ghost", onclick: () => hint() }, ["💡 Hint (reveal a letter)"]);
      if (revealed >= word.length - 1) hintBtn.disabled = true;
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        hintBtn,
        passBtn,
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));

      setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 60);
      timer = setInterval(tick, 100);

      function applyChrono() {
        bar.style.width = Math.max(0, (remaining / G.roundSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
      }
      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        applyChrono();
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) endTurn();
      }
      function wordPts() { return ANA_HINT_PTS[Math.min(revealed, ANA_HINT_PTS.length - 1)]; }
      function maskedText() {
        const out = [];
        for (let i = 0; i < word.length; i++) out.push(i < revealed ? word.charAt(i).toUpperCase() : "_");
        return out.join(" ");
      }
      function refreshWord() {
        renderTiles();
        worthEl.textContent = "This word: " + wordPts() + " pts";
        hintLine.textContent = revealed > 0 ? maskedText() : "";
        hintBtn.disabled = revealed >= word.length - 1;
        infoEl.textContent = infoText();
      }
      function hint() {
        if (done) return;
        if (revealed >= word.length - 1) return; // on laisse toujours au moins 1 lettre cachée
        revealed++;
        U().sfx.tick();
        worthEl.textContent = "This word: " + wordPts() + " pts";
        hintLine.textContent = maskedText();
        feedback.textContent = "💡 Revealed a letter — this word is now worth " + wordPts() + " pts";
        if (revealed >= word.length - 1) hintBtn.disabled = true;
        try { input.focus(); } catch (e) { }
      }
      function submit() {
        if (done) return;
        const raw = (input.value || "").trim();
        if (!raw) return;
        if (anaMatch(raw, word)) {  // tolère les fautes de frappe de l'arbitre
          const pts = wordPts();
          solved++; roundPts += pts; team.score += pts;
          if (ptsNode) ptsNode.textContent = String(team.score);
          U().sfx.correct();
          feedback.textContent = "✅ Correct! " + word.toUpperCase() + "  +" + pts;
          loadWord(); refreshWord();
        } else {
          U().sfx.wrong();
          remaining = Math.max(0, remaining - ANA_PENALTY);
          applyChrono();
          feedback.textContent = '❌ "' + raw + '" is wrong  (−' + ANA_PENALTY + 's)';
          if (remaining <= 0) { input.value = ""; endTurn(); return; }
        }
        input.value = ""; try { input.focus(); } catch (e) { }
      }
      function pass() {
        if (done) return;
        if (passesUsed >= ANA_MAX_PASS) { feedback.textContent = "No passes left — keep trying!"; return; }
        passesUsed++;
        U().sfx.tick();
        feedback.textContent = "⏭️ Passed. The word was: " + word;
        loadWord(); refreshWord();
        passBtn.textContent = passLabel();
        if (passesUsed >= ANA_MAX_PASS) passBtn.disabled = true;
        try { input.focus(); } catch (e) { }
      }
      function endTurn() {
        if (done) return; done = true; if (timer) clearInterval(timer);
        anagramResult(idx, solved, roundPts);
      }
    });
  }

  function anagramResult(idx, solved, roundPts) {
    const isLast = idx === G.teams.length - 1;
    U().sfx.win();
    U().show((scr) => {
      const h = U().h;
      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t, i) => {
        sb.appendChild(h("div", { class: "score-chip" + (i === idx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["⏱️ Time! — " + G.teams[idx].name]));
      card.appendChild(h("div", { class: "q" }, [
        solved + (solved === 1 ? " word" : " words") + " solved  (+" + roundPts + " pts)"
      ]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => { if (isLast) podium(); else anagramTurn(idx + 1); } },
          [isLast ? "🏆 See podium" : "▶ Next team"])
      ]));
    }, { replace: true });
  }

  /* ================================================================
     4c) Grammaire en groupe — remplir le blanc
     Phrase avec ___ sur la télé ; les équipes choisissent le bon mot.
     Même Chrono Steal : temps écoulé OU mauvaise réponse → les autres volent.
     ================================================================ */
  const GRAMMAR_POINTS = 100; // points par phrase correcte

  function startGrammar(teams, opts) {
    opts = opts || {};
    let pool = C().grammar;
    if (opts.topic && opts.topic !== "All topics") {
      const filtered = pool.filter((i) => i.cat === opts.topic);
      if (filtered.length) pool = filtered;
    }
    const sessionKey = "group_grammar" + (opts.topic && opts.topic !== "All topics" ? "_" + opts.topic : "");
    const deck = U().newSessionDeck(pool, sessionKey);
    const items = deck.draw(Math.min(10, pool.length));
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      timerOn: opts.timerOn !== false,
      phaseSec: opts.phaseSec || 12,
      onComplete: opts.onComplete || null,
      gram: { items: items, i: 0 }
    };
    grammarTurn();
  }

  function grammarTurn() {
    const st = G.gram;
    if (st.i >= st.items.length) return podium();
    const item = st.items[st.i];
    const choices = U().shuffle(item.options);
    let chronoCtl = null, revealed = false;
    function stopTimer() { if (chronoCtl) chronoCtl.stop(); }

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["📝 Grammar Duel — " + item.cat + "  ·  " + (st.i + 1) + " / " + st.items.length]));
      card.appendChild(h("div", { class: "worth" }, [GRAMMAR_POINTS + " points"]));
      card.appendChild(h("div", { class: "q" }, [item.sentence]));

      // chrono
      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [
        G.timerOn ? "🟢 " + G.teams[G.turn].name + "'s turn" : "Timer off"
      ]);
      if (G.timerOn) { card.appendChild(chrono); card.appendChild(chronoLabel); }

      // choix (affichés pour la télé ; l'arbitre révèle)
      const optWrap = h("div", { class: "options" });
      const letters = ["A", "B", "C", "D"];
      const optBtns = [];
      choices.forEach((c, idx) => {
        const b = h("button", { class: "opt", disabled: "" }, [letters[idx] + ".  " + c]);
        optBtns.push(b);
        optWrap.appendChild(b);
      });
      card.appendChild(optWrap);

      const reveal = h("div", { class: "reveal" });
      card.appendChild(reveal);

      function doReveal() {
        if (revealed) return;
        revealed = true;
        const idx = choices.indexOf(item.answer);
        if (optBtns[idx]) optBtns[idx].classList.add("correct");
        const full = item.sentence.replace("___", item.answer);
        reveal.appendChild(h("span", {}, ["Correct answer: ", h("span", { class: "ans" }, [item.answer]), " "]));
        if (item.meaning || item.fr) {
          reveal.appendChild(h("div", { class: "fr-hint-box mt", style: "margin-top:8px;text-align:left" }, [
            item.meaning ? h("div", {}, ["🇬🇧 ", item.meaning]) : null,
            item.fr ? h("div", { class: "fr" }, ["🇫🇷 ", item.fr]) : null
          ]));
        }
        reveal.appendChild(h("button", { class: "speaker", onclick: () => U().speak(full) }, ["🔊"]));
        stopTimer();
      }

      // referee panel
      const panel = h("div", { class: "ref-panel" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — who answered correctly?"]));
      const awards = h("div", { class: "award-grid" });
      G.teams.forEach((t, idx) => {
        awards.appendChild(h("button", {
          class: "btn " + (idx === G.turn ? "btn-green" : "btn-ghost"),
          onclick: () => award(idx)
        }, [`✅ ${t.name}  (+${GRAMMAR_POINTS})`]));
      });
      awards.appendChild(h("button", { class: "btn btn-red", onclick: () => award(-1) }, ["❌ Nobody (0)"]));
      panel.appendChild(awards);
      panel.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "btn btn-ghost", onclick: doReveal }, ["👁️ Reveal the answer"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", {
          class: "btn btn-ghost", onclick: () => {
            U().confirmBox("End the game and see the podium?", podium);
          }
        }, ["🏁 End the game"])
      ]));

      if (G.timerOn) { chronoCtl = makeChrono(bar, chrono, chronoLabel); chronoCtl.start(); }

      function award(teamIdx) {
        stopTimer();
        doReveal();
        if (teamIdx >= 0) {
          G.teams[teamIdx].score = Math.max(0, G.teams[teamIdx].score + GRAMMAR_POINTS);
          U().sfx.correct();
        } else {
          U().sfx.wrong();
        }
        st.i++;
        G.turn = (G.turn + 1) % G.teams.length;
        grammarTurn();
      }
    });
  }

  /* ================================================================
     4c-b) Irregular Verbs en groupe — past / participle / definition
     ================================================================ */
  const IRREGULAR_POINTS = 100;

  function startIrregular(teams, opts) {
    opts = opts || {};
    const pool = (C().irregularVerbs || []).filter((v) => v && v.verb && v.past && v.participle);
    if (pool.length < 4) {
      U().alertBox("Not enough irregular verbs available!");
      return;
    }
    const deck = U().newSessionDeck(pool, "group_irregular_" + (opts.mode || "mixed"));
    const items = deck.draw(Math.min(10, pool.length));
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      timerOn: opts.timerOn !== false,
      phaseSec: opts.phaseSec || 12,
      onComplete: opts.onComplete || null,
      irregular: { items: items, i: 0, mode: opts.mode || "mixed" }
    };
    irregularTurn();
  }

  function irregularQuestionType(mode, item) {
    if (mode === "past") return "past";
    if (mode === "participle") return "participle";
    if (mode === "meaning") return "meaning";
    const roll = Math.random();
    if (roll < 0.55) return "participle";
    if (roll < 0.85) return "past";
    return "meaning";
  }

  function irregularPickDistractors(item, pool, field, count) {
    const correct = normalizeValue(item[field] || "");
    const others = U().shuffle(pool.filter((v) => v.verb !== item.verb))
      .map((v) => (field === "meaning" ? (v.meaning || v.fr) : (field === "past" ? v.past : v.participle)))
      .filter((m) => m && normalizeValue(m) !== correct);
    const unique = [];
    others.forEach((m) => {
      const norm = normalizeValue(m);
      if (!unique.some((x) => normalizeValue(x) === norm)) unique.push(m);
    });
    return unique.slice(0, count);
  }

  function normalizeValue(text) {
    return String(text || "").trim().toLowerCase();
  }

  function irregularTurn() {
    const st = G.irregular;
    if (!st || st.i >= st.items.length) return podium();
    const item = st.items[st.i];
    const type = irregularQuestionType(st.mode, item);
    let correct = "";
    let prompt = "";
    let choices = [];

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
      choices = U().shuffle([correctValue].concat(irregularPickDistractors(item, C().irregularVerbs || [], field, 3)));
    }

    let chronoCtl = null, revealed = false;
    function stopTimer() { if (chronoCtl) chronoCtl.stop(); }

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🔁 Irregular Verbs  ·  " + (st.i + 1) + " / " + st.items.length]));
      card.appendChild(h("div", { class: "worth" }, [IRREGULAR_POINTS + " points"]));
      card.appendChild(h("div", { class: "q", style: "font-size:clamp(1.6rem,5vw,2.6rem)" }, [item.verb]));
      card.appendChild(h("p", { class: "section-sub center" }, [prompt]));

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [
        G.timerOn ? "🟢 " + G.teams[G.turn].name + "'s turn" : "Timer off"
      ]);
      if (G.timerOn) { card.appendChild(chrono); card.appendChild(chronoLabel); }

      if (type === "meaning") {
        const optWrap = h("div", { class: "options" });
        const letters = ["A", "B", "C", "D"];
        const optBtns = [];
        choices.forEach((c, idx) => {
          const b = h("button", { class: "opt", disabled: "" }, [letters[idx] + ".  " + c]);
          optBtns.push(b);
          optWrap.appendChild(b);
        });
        card.appendChild(optWrap);
      } else {
        const input = h("input", {
          type: "text",
          placeholder: type === "past" ? "Write the past simple" : "Write the past participle",
          style: "width:100%;max-width:360px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);margin-top:8px"
        });
        card.appendChild(input);
        card.appendChild(h("div", { class: "row center mt" }, [
          h("button", { class: "btn btn-primary", onclick: () => awardInput(input.value) }, ["Check"])
        ]));
      }

      const reveal = h("div", { class: "reveal" });
      card.appendChild(reveal);

      const panel = h("div", { class: "ref-panel" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — who answered correctly?"]));
      const awards = h("div", { class: "award-grid" });
      G.teams.forEach((t, idx) => {
        awards.appendChild(h("button", {
          class: "btn " + (idx === G.turn ? "btn-green" : "btn-ghost"),
          onclick: () => award(idx)
        }, [`✅ ${t.name}  (+${IRREGULAR_POINTS})`]));
      });
      awards.appendChild(h("button", { class: "btn btn-red", onclick: () => award(-1) }, ["❌ Nobody (0)"]));
      panel.appendChild(awards);
      panel.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "btn btn-ghost", onclick: doReveal }, ["👁️ Reveal the answer"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End the game"])
      ]));

      if (G.timerOn) { chronoCtl = makeChrono(bar, chrono, chronoLabel); chronoCtl.start(); }

      function doReveal() {
        if (revealed) return;
        revealed = true;
        stopTimer();
        if (type === "meaning") {
          const idx = choices.indexOf(correct);
          if (optBtns[idx]) optBtns[idx].classList.add("correct");
        }
        reveal.appendChild(h("span", {}, ["Correct answer: ", h("span", { class: "ans" }, [correct]), " "]));
        if (type !== "meaning" && (item.meaning || item.fr)) {
          reveal.appendChild(h("div", { class: "fr-hint-box mt", style: "margin-top:8px;text-align:left" }, [
            item.meaning ? h("div", {}, ["🇬🇧 ", item.meaning]) : null,
            item.fr ? h("div", { class: "fr" }, ["🇫🇷 ", item.fr]) : null
          ]));
        }
      }

      function award(teamIdx) {
        stopTimer();
        doReveal();
        if (teamIdx >= 0) {
          G.teams[teamIdx].score = Math.max(0, G.teams[teamIdx].score + IRREGULAR_POINTS);
          U().sfx.correct();
        } else {
          U().sfx.wrong();
        }
        st.i++;
        G.turn = (G.turn + 1) % G.teams.length;
        irregularTurn();
      }

      function awardInput(answer) {
        if (normalizeValue(answer) === normalizeValue(correct)) {
          U().sfx.correct();
          doReveal();
          G.teams[G.turn].score = Math.max(0, G.teams[G.turn].score + IRREGULAR_POINTS);
        } else {
          U().sfx.wrong();
          doReveal();
        }
        st.i++;
        G.turn = (G.turn + 1) % G.teams.length;
        setTimeout(irregularTurn, 900);
      }
    });
  }

  /* ================================================================
     4c-b) Phrasal Verbs en groupe — trouver le sens (FR ou EN)
     ================================================================ */
  const PHRASAL_POINTS = 100;

  function startPhrasal(teams, opts) {
    opts = opts || {};
    const lang = opts.lang || "fr";
    const field = lang === "fr" ? "fr" : "meaning";
    const pool = (C().phrasalVerbs || []).filter((v) => v && v.verb && v[field]);
    if (pool.length < 4) {
      U().alertBox("Not enough phrasal verbs available!");
      return;
    }
    const deck = U().newSessionDeck(pool, "group_phrasal_" + lang);
    const items = deck.draw(Math.min(10, pool.length));
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      timerOn: opts.timerOn !== false,
      phaseSec: opts.phaseSec || 12,
      onComplete: opts.onComplete || null,
      phrasal: { items: items, i: 0, field: field, lang: lang }
    };
    phrasalTurn();
  }

  function phrasalPickDistractors(item, pool, field, count) {
    const correct = item[field];
    const others = U().shuffle(pool.filter((v) => v.verb !== item.verb))
      .map((v) => v[field])
      .filter((m) => m && m !== correct);
    const unique = [];
    others.forEach((m) => { if (!unique.includes(m)) unique.push(m); });
    return unique.slice(0, count);
  }

  function phrasalTurn() {
    const st = G.phrasal;
    if (st.i >= st.items.length) return podium();
    const item = st.items[st.i];
    const pool = C().phrasalVerbs || [];
    const correct = item[st.field];
    const choices = U().shuffle([correct].concat(phrasalPickDistractors(item, pool, st.field, 3)));
    let chronoCtl = null, revealed = false;
    function stopTimer() { if (chronoCtl) chronoCtl.stop(); }
    const langLabel = st.lang === "fr" ? "🇫🇷 French" : "🇬🇧 English";

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🔗 Phrasal Verbs — " + langLabel + "  ·  " + (st.i + 1) + " / " + st.items.length]));
      card.appendChild(h("div", { class: "worth" }, [PHRASAL_POINTS + " points"]));
      card.appendChild(h("div", { class: "q", style: "font-size:clamp(1.8rem,5vw,3rem)" }, [item.verb]));
      card.appendChild(h("button", {
        class: "speaker", style: "margin:8px auto;display:block",
        onclick: () => U().speak(item.verb)
      }, ["🔊 Listen"]));
      card.appendChild(h("p", { class: "section-sub center" }, ["What does this phrasal verb mean?"]));

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [
        G.timerOn ? "🟢 " + G.teams[G.turn].name + "'s turn" : "Timer off"
      ]);
      if (G.timerOn) { card.appendChild(chrono); card.appendChild(chronoLabel); }

      const optWrap = h("div", { class: "options" });
      const letters = ["A", "B", "C", "D"];
      const optBtns = [];
      choices.forEach((c, idx) => {
        const b = h("button", { class: "opt", disabled: "" }, [letters[idx] + ".  " + c]);
        optBtns.push(b);
        optWrap.appendChild(b);
      });
      card.appendChild(optWrap);

      const reveal = h("div", { class: "reveal" });
      card.appendChild(reveal);

      function doReveal() {
        if (revealed) return;
        revealed = true;
        const idx = choices.indexOf(correct);
        if (optBtns[idx]) optBtns[idx].classList.add("correct");
        reveal.appendChild(h("span", {}, ["Correct answer: ", h("span", { class: "ans" }, [correct]), " "]));
        const otherField = st.field === "fr" ? "meaning" : "fr";
        if (item[otherField]) {
          reveal.appendChild(h("div", { class: "fr-hint-box mt", style: "margin-top:8px;text-align:left" }, [
            h("div", { class: "fr" }, [(st.field === "fr" ? "🇬🇧 " : "🇫🇷 ") + item[otherField]])
          ]));
        }
        stopTimer();
      }

      const panel = h("div", { class: "ref-panel" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — who answered correctly?"]));
      const awards = h("div", { class: "award-grid" });
      G.teams.forEach((t, idx) => {
        awards.appendChild(h("button", {
          class: "btn " + (idx === G.turn ? "btn-green" : "btn-ghost"),
          onclick: () => award(idx)
        }, [`✅ ${t.name}  (+${PHRASAL_POINTS})`]));
      });
      awards.appendChild(h("button", { class: "btn btn-red", onclick: () => award(-1) }, ["❌ Nobody (0)"]));
      panel.appendChild(awards);
      panel.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "btn btn-ghost", onclick: doReveal }, ["👁️ Reveal the answer"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", {
          class: "btn btn-ghost", onclick: () => {
            U().confirmBox("End the game and see the podium?", podium);
          }
        }, ["🏁 End the game"])
      ]));

      if (G.timerOn) { chronoCtl = makeChrono(bar, chrono, chronoLabel); chronoCtl.start(); }

      function award(teamIdx) {
        stopTimer();
        doReveal();
        if (teamIdx >= 0) {
          G.teams[teamIdx].score = Math.max(0, G.teams[teamIdx].score + PHRASAL_POINTS);
          U().sfx.correct();
        } else {
          U().sfx.wrong();
        }
        st.i++;
        G.turn = (G.turn + 1) % G.teams.length;
        phrasalTurn();
      }
    });
  }

  /* ================================================================
     4d) Chaîne de mots (Word Chain)
     Un mot de départ est donné ; chaque mot suivant doit commencer par
     la DERNIÈRE lettre du précédent. Chaque équipe enchaîne le plus de
     mots possible dans le temps réglé par l'arbitre. Un mot = points.
     ================================================================ */
  const WORDCHAIN_POINTS = 10;

  function wcWordPool() {
    const set = new Set();
    (C().vocabulary || []).forEach((v) => { if (v && v.en) set.add(v.en); });
    (C().anagramWords || []).forEach((w) => { if (w) set.add(w); });
    const arr = Array.from(set).filter((w) => /^[A-Za-z]+$/.test(w) && w.length >= 3);
    return arr.length ? arr : ["Apple", "Orange", "Table", "Water", "House"];
  }

  function wcStartWords() {
    const arr = wcWordPool();
    return arr.length ? arr : ["Apple", "Orange", "Table", "Water", "House"];
  }

  function wcChip(word, isStart) {
    const h = U().h;
    const w = String(word);
    const body = w.slice(0, -1);
    const tail = w.slice(-1);
    return h("span", { class: "wc-word" + (isStart ? " start" : "") }, [
      body, h("span", { class: "tail" }, [tail])
    ]);
  }

  function startWordChain(teams, opts) {
    opts = opts || {};
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      turnSec: opts.turnSec || 60,
      onComplete: opts.onComplete || null,
      wc: { startWords: wcStartWords() }
    };
    wordChainTurn();
  }

  function wordChainTurn() {
    if (G.turn >= G.teams.length) return podium();
    const team = G.teams[G.turn];
    const wcDeck = U().newSessionDeck(G.wc.startWords, "group_wc_start");
    const startWord = wcDeck.draw();
    const used = new Set([startWord.toLowerCase()]);
    const path = [startWord];
    let required = startWord.trim().slice(-1).toLowerCase();
    let count = 0;
    let remaining = G.turnSec;
    let timer = null, ended = false;

    U().show((scr) => {
      const h = U().h;

      // tableau des scores (mis à jour en direct)
      const sbWrap = h("div");
      function refreshSB() {
        sbWrap.innerHTML = "";
        const sb = h("div", { class: "scoreboard" });
        G.teams.forEach((t, idx) => {
          sb.appendChild(h("div", { class: "score-chip" + (idx === G.turn ? " active" : "") }, [
            h("div", { class: "name" }, [t.name]),
            h("div", { class: "pts" }, [String(t.score)])
          ]));
        });
        sbWrap.appendChild(sb);
      }
      refreshSB();
      scr.appendChild(sbWrap);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🔗 Word Chain — " + team.name + "'s turn"]));

      // chrono (compte à rebours simple, une phase)
      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" },
        [Math.ceil(remaining) + "s"]);
      card.appendChild(chrono);
      card.appendChild(chronoLabel);

      // lettre requise
      const reqEl = h("div", { class: "wc-required" });
      function setReq() {
        reqEl.innerHTML = "";
        reqEl.appendChild(h("span", {}, ["Next word must start with "]));
        reqEl.appendChild(h("b", {}, [required]));
      }
      setReq();
      card.appendChild(reqEl);

      // compteur
      const countEl = h("div", { class: "wc-count" }, ["Words: 0"]);
      card.appendChild(countEl);

      // chaîne (mot de départ en premier)
      const chain = h("div", { class: "wc-chain" }, [wcChip(startWord, true)]);
      card.appendChild(chain);

      // saisie
      const input = h("input", {
        type: "text", placeholder: "Type the word…", autocomplete: "off",
        onkeydown: (e) => { if (e.key === "Enter") submit(); }
      });
      const addBtn = h("button", { class: "btn btn-primary", onclick: () => submit() }, ["Add ➕"]);
      card.appendChild(h("div", { class: "wc-input-row" }, [input, addBtn]));

      const feedback = h("div", { class: "wc-feedback" }, [""]);
      card.appendChild(feedback);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => endTurn() }, ["⏭️ End turn now"])
      ]));

      setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 60);
      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; } // l'arbitre a quitté l'écran
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.turnSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) endTurn();
      }

      async function submit() {
        if (ended) return;
        const raw = (input.value || "").trim();
        if (!raw) return;
        if (!/^[A-Za-z][A-Za-z'\-]*$/.test(raw)) { feedback.textContent = "Letters only."; return; }
        const wl = raw.toLowerCase();
        if (wl.charAt(0) !== required) {
          feedback.textContent = 'Must start with "' + required.toUpperCase() + '".';
          U().sfx.wrong(); input.value = ""; try { input.focus(); } catch (e) { }
          return;
        }
        if (used.has(wl)) {
          feedback.textContent = '"' + raw + '" was already used.';
          U().sfx.wrong(); input.value = ""; try { input.focus(); } catch (e) { }
          return;
        }
        feedback.textContent = "Checking...";
        const isValid = await U().validateEnglishWord(raw);
        if (!isValid) {
          feedback.textContent = '"' + raw + '" is not recognized as a valid English word.';
          U().sfx.wrong(); input.value = ""; try { input.focus(); } catch (e) { }
          return;
        }
        used.add(wl);
        path.push(raw);
        count++;
        team.score += WORDCHAIN_POINTS;
        required = wl.slice(-1);
        chain.appendChild(wcChip(raw, false));
        chain.scrollTop = chain.scrollHeight;
        countEl.textContent = "Words: " + count;
        setReq();
        refreshSB();
        feedback.textContent = "";
        U().sfx.correct();
        input.value = ""; try { input.focus(); } catch (e) { }
      }

      function endTurn() {
        if (ended) return;
        ended = true;
        if (timer) clearInterval(timer);
        input.disabled = true; addBtn.disabled = true;
        wordChainResult(team, path);
      }
    });
  }

  function wordChainResult(team, path) {
    const count = path.length - 1; // le mot de départ ne compte pas
    const isLast = G.turn === G.teams.length - 1;
    U().sfx.win();
    U().show((scr) => {
      const h = U().h;

      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t, idx) => {
        sb.appendChild(h("div", { class: "score-chip" + (idx === G.turn ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["⏱️ Time! — " + team.name]));
      card.appendChild(h("div", { class: "q" }, [
        count + (count === 1 ? " word" : " words") + "  (+" + (count * WORDCHAIN_POINTS) + " pts)"
      ]));
      const chain = h("div", { class: "wc-chain" });
      path.forEach((w, i) => chain.appendChild(wcChip(w, i === 0)));
      card.appendChild(chain);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => { G.turn++; wordChainTurn(); } },
          [isLast ? "🏆 See podium" : "▶ Next team"])
      ]));
    }, { replace: true });
  }

  /* ----------------------------------------------------------------
     Variante « chaîne partagée » : une seule chaîne pour tout le monde.
     Chaque équipe ajoute un mot à son tour ; si elle est bloquée
     (temps écoulé ou « pass »), les autres équipes peuvent voler les points.
     ---------------------------------------------------------------- */
  function startWordChainShared(teams, opts) {
    opts = opts || {};
    const startWords = wcStartWords();
    const wcDeck = U().newSessionDeck(startWords, "group_wc_start");
    const startWord = wcDeck.draw();
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      turnSec: opts.turnSec || 20,
      onComplete: opts.onComplete || null,
      wc: {
        shared: true,
        startWords: startWords,
        used: new Set([startWord.toLowerCase()]),
        path: [startWord],
        required: startWord.trim().slice(-1).toLowerCase()
      }
    };
    wcSharedActive();
  }

  function wcSharedChainBlock(h) {
    const st = G.wc;
    const chain = h("div", { class: "wc-chain" });
    st.path.forEach((w, i) => chain.appendChild(wcChip(w, i === 0)));
    return chain;
  }
  function wcSharedRequired(h) {
    const reqEl = h("div", { class: "wc-required" });
    reqEl.appendChild(h("span", {}, ["Next word must start with "]));
    reqEl.appendChild(h("b", {}, [G.wc.required]));
    return reqEl;
  }
  function wcCountLabel() {
    const n = G.wc.path.length - 1; // le mot de départ ne compte pas
    return "Chain: " + n + (n === 1 ? " word" : " words");
  }
  function wordChainScore(word) {
    return WORDCHAIN_POINTS + Math.max(0, word.length - 4) * 2;
  }

  function wcValid(raw) {
    const st = G.wc;
    if (!raw) return { ok: false, reason: "" };
    if (!/^[A-Za-z][A-Za-z'\-]*$/.test(raw)) return { ok: false, reason: "Letters only." };
    const wl = raw.toLowerCase();
    if (wl.charAt(0) !== st.required) return { ok: false, reason: 'Must start with "' + st.required.toUpperCase() + '".' };
    if (st.used.has(wl)) return { ok: false, reason: '"' + raw + '" was already used.' };
    return { ok: true, wl: wl };
  }
  function wcAccept(raw, wl, teamIdx) {
    const st = G.wc;
    st.used.add(wl);
    st.path.push(raw);
    st.required = wl.slice(-1);
    G.teams[teamIdx].score += wordChainScore(raw);
  }

  function wcSharedActive() {
    const st = G.wc;
    const team = G.teams[G.turn];
    let remaining = G.turnSec, timer = null, done = false;

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🔗 Word Chain (shared) — " + team.name + "'s turn"]));

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      card.appendChild(chrono); card.appendChild(chronoLabel);

      card.appendChild(wcSharedRequired(h));
      card.appendChild(h("div", { class: "wc-count" }, [wcCountLabel()]));
      const chain = wcSharedChainBlock(h);
      card.appendChild(chain);

      const input = h("input", {
        type: "text", placeholder: "Type " + team.name + "'s word…", autocomplete: "off",
        onkeydown: (e) => { if (e.key === "Enter") submit(); }
      });
      const addBtn = h("button", { class: "btn btn-primary", onclick: () => submit() }, ["Add ➕"]);
      card.appendChild(h("div", { class: "wc-input-row" }, [input, addBtn]));
      const feedback = h("div", { class: "wc-feedback" }, [""]);
      card.appendChild(feedback);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => stuck() }, ["🚩 Pass / stuck"]),
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));

      setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 60);
      setTimeout(() => { try { chain.scrollTop = chain.scrollHeight; } catch (e) { /* ignore */ } }, 60);
      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.turnSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) stuck();
      }
      function submit() {
        if (done) return;
        const raw = (input.value || "").trim();
        const v = wcValid(raw);
        if (!v.ok) {
          if (v.reason) { feedback.textContent = v.reason; U().sfx.wrong(); }
          input.value = ""; try { input.focus(); } catch (e) { }
          return;
        }
        done = true; if (timer) clearInterval(timer);
        wcAccept(raw, v.wl, G.turn);
        U().sfx.correct();
        G.turn = (G.turn + 1) % G.teams.length;
        wcSharedActive();
      }
      function stuck() {
        if (done) return;
        done = true; if (timer) clearInterval(timer);
        U().sfx.wrong();
        wcSharedSteal(G.turn);
      }
    });
  }

  function wcComputerWord(required, used) {
    const pool = wcWordPool();
    const candidates = pool.filter((w) => {
      const wl = w.toLowerCase();
      return wl.charAt(0) === required && !used.has(wl);
    });
    if (!candidates.length) return null;
    const maxLen = Math.max.apply(null, candidates.map((w) => w.length));
    const best = candidates.filter((w) => w.length === maxLen);
    return U().rand(best);
  }

  function startWordChainVsComputer(teams, opts) {
    opts = opts || {};
    const humanTeams = teams.slice();
    const cpuTeam = { name: "Computer", score: 0 };
    const allTeams = humanTeams.concat([cpuTeam]);
    const startWords = wcStartWords();
    G = {
      teams: allTeams,
      turn: 0,
      turnSec: opts.turnSec || 60,
      onComplete: opts.onComplete || null,
      vsComputer: true,
      wc: {
        startWords: startWords,
        cpuIdx: allTeams.length - 1,
        humanCount: humanTeams.length
      }
    };
    wcVsComputerResetRound();
    wcVsComputerActive();
  }

  function wcVsComputerResetRound() {
    const st = G.wc;
    const startWord = U().newSessionDeck(st.startWords, "group_wc_vs_computer_" + G.turn).draw();
    st.used = new Set([startWord.toLowerCase()]);
    st.path = [startWord];
    st.required = startWord.trim().slice(-1).toLowerCase();
  }

  function wcVsComputerActive() {
    const st = G.wc;
    const humanIdx = G.turn;
    const cpuIdx = st.cpuIdx;
    const human = G.teams[humanIdx];
    const cpu = G.teams[cpuIdx];
    let remaining = G.turnSec, timer = null, ended = false;

    U().show((scr) => {
      const h = U().h;
      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t, idx) => {
        sb.appendChild(h("div", { class: "score-chip" + (idx === humanIdx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🔗 Word Chain vs Computer — " + human.name]));
      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      card.appendChild(chrono); card.appendChild(chronoLabel);
      const reqEl = h("div", { class: "wc-required" });
      reqEl.appendChild(h("span", {}, ["Next word must start with "]));
      reqEl.appendChild(h("b", {}, [st.required]));
      card.appendChild(reqEl);
      card.appendChild(h("div", { class: "wc-count" }, ["Words: " + (st.path.length - 1)]));
      const chain = h("div", { class: "wc-chain" });
      st.path.forEach((w, i) => chain.appendChild(wcChip(w, i === 0)));
      card.appendChild(chain);

      const input = h("input", {
        type: "text", placeholder: "Type your word…", autocomplete: "off",
        onkeydown: (e) => { if (e.key === "Enter") submit(); }
      });
      const addBtn = h("button", { class: "btn btn-primary", onclick: () => submit() }, ["Add ➕"]);
      card.appendChild(h("div", { class: "wc-input-row" }, [input, addBtn]));
      const feedback = h("div", { class: "wc-feedback" }, [""]);
      card.appendChild(feedback);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => pass() }, ["🚩 Pass / stop"]),
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));

      setTimeout(() => { try { input.focus(); } catch (e) { } }, 60);
      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.turnSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) pass();
      }
      function submit() {
        if (ended) return;
        const raw = (input.value || "").trim();
        const v = wcValid(raw);
        if (!v.ok) {
          if (v.reason) { feedback.textContent = v.reason; U().sfx.wrong(); }
          input.value = ""; try { input.focus(); } catch (e) { }
          return;
        }
        ended = true; if (timer) clearInterval(timer);
        wcAccept(raw, v.wl, humanIdx);
        U().sfx.correct();
        cpuRespond();
      }
      function cpuRespond() {
        const cpuWord = wcComputerWord(st.required, st.used);
        if (!cpuWord) {
          wcVsComputerResult();
          return;
        }
        wcAccept(cpuWord, cpuWord.toLowerCase(), cpuIdx);
        feedback.textContent = "Computer plays: " + cpuWord;
        setTimeout(() => {
          remaining = G.turnSec;
          ended = false;
          wcVsComputerActive();
        }, 800);
      }
      function pass() {
        if (ended) return;
        ended = true;
        if (timer) clearInterval(timer);
        wcVsComputerResult();
      }
    });
  }

  function wcVsComputerResult() {
    const st = G.wc;
    const humanIdx = G.turn;
    const human = G.teams[humanIdx];
    const cpu = G.teams[st.cpuIdx];
    const isLast = humanIdx === st.humanCount - 1;
    U().show((scr) => {
      const h = U().h;
      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t, idx) => {
        sb.appendChild(h("div", { class: "score-chip" + (idx === humanIdx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🔚 Word Chain vs Computer — " + human.name]));
      card.appendChild(h("div", { class: "q" }, [human.name + ": " + human.score + " pts — Computer: " + cpu.score + " pts"]));
      const chain = h("div", { class: "wc-chain" });
      st.path.forEach((w, i) => chain.appendChild(wcChip(w, i === 0)));
      card.appendChild(chain);
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => {
          if (isLast) { CAA.group.menu(); }
          else { G.turn++; wcVsComputerResetRound(); wcVsComputerActive(); }
        } }, [isLast ? "Back to group menu" : "Next team"])
      ]));
    });
  }

  function wcSharedSteal(stuckIdx) {
    const st = G.wc;
    U().show((scr) => {
      const h = U().h;

      // tableau des scores (aucune équipe « active » pendant le vol)
      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t) => {
        sb.appendChild(h("div", { class: "score-chip" }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🟠 Steal! " + G.teams[stuckIdx].name + " is stuck"]));
      card.appendChild(wcSharedRequired(h));
      card.appendChild(h("div", { class: "wc-count" }, [wcCountLabel()]));
      card.appendChild(wcSharedChainBlock(h));

      const input = h("input", { type: "text", placeholder: "Type the stealing word…", autocomplete: "off" });
      card.appendChild(h("div", { class: "wc-input-row" }, [input]));
      const feedback = h("div", { class: "wc-feedback" }, [""]);
      card.appendChild(feedback);

      card.appendChild(h("div", { class: "section-sub", style: "text-align:center;margin-top:8px" }, [
        "Who stole it? (must start with " + st.required.toUpperCase() + ")"
      ]));
      const stealGrid = h("div", { class: "award-grid" });
      G.teams.forEach((t, idx) => {
        if (idx === stuckIdx) return;
        stealGrid.appendChild(h("button", { class: "btn btn-green", onclick: () => trySteal(idx) }, ["✅ " + t.name + "  (+" + WORDCHAIN_POINTS + ")"]));
      });
      stealGrid.appendChild(h("button", { class: "btn btn-red", onclick: () => skip() }, ["❌ Nobody — skip"]));
      card.appendChild(stealGrid);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));

      setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 60);

      function trySteal(idx) {
        const raw = (input.value || "").trim();
        const v = wcValid(raw);
        if (!v.ok) { feedback.textContent = v.reason || "Type the word first."; U().sfx.wrong(); return; }
        wcAccept(raw, v.wl, idx);
        U().sfx.correct();
        G.turn = (stuckIdx + 1) % G.teams.length; // la rotation continue après l'équipe bloquée
        wcSharedActive();
      }
      function skip() {
        // personne ne vole : aucun mot ajouté, la lettre requise ne change pas
        G.turn = (stuckIdx + 1) % G.teams.length;
        wcSharedActive();
      }
    });
  }

  /* ================================================================
     4e) La roue des défis (Spin the Wheel)
     L'arbitre fait tourner la roue ; elle tombe sur un défi rapide.
     L'équipe le réussit (+points) ou échoue → elle tire un GAGE (forfeit).
     ================================================================ */
  // difficultés (points + temps pour réaliser le défi)
  const WHEEL_DIFF = [
    { name: "Easy", pts: 50, time: 20, color: "#34d399" },
    { name: "Medium", pts: 100, time: 30, color: "#60a5fa" },
    { name: "Hard", pts: 200, time: 45, color: "#fb7185" }
  ];
  // cases spéciales de la roue (façon jeu télévisé)
  const WHEEL_SPECIALS = [
    { id: "jackpot", label: "JACKPOT", emoji: "💰", color: "#ffd23f" },
    { id: "double", label: "DOUBLE", emoji: "✖️", color: "#c084fc" },
    { id: "steal", label: "STEAL", emoji: "🥷", color: "#fb923c" },
    { id: "swap", label: "SWAP", emoji: "🔄", color: "#22d3ee" },
    { id: "bankrupt", label: "BANKRUPT", emoji: "💥", color: "#ef4444" },
    { id: "bonus", label: "BONUS", emoji: "🎁", color: "#a3e635" },
    { id: "immunity", label: "IMMUNITY", emoji: "🛡️", color: "#38bdf8" }
  ];
  const WHEEL_FALLBACK = [
    { title: "Reverse alphabet", task: "Say the alphabet in reverse, from Z to A." },
    { title: "Count down", task: "Count backwards from 20 to 1 in English." },
    { title: "5 animals", task: "Name 5 animals in English in 15 seconds." },
    { title: "5 colours", task: "Name 5 colours in English." },
    { title: "Days of week", task: "Say the days of the week in order." },
    { title: "Months", task: "Say the 12 months of the year in order." },
    { title: "5 fruits", task: "Name 5 fruits in English." },
    { title: "Use 'because'", task: "Make a sentence using the word 'because'." },
    { title: "Letter B", task: "Say 4 words that start with the letter B." },
    { title: "5 countries", task: "Name 5 countries in English." }
  ];
  const GAGE_FALLBACK = [
    "Sing the chorus of any song in English.",
    "Talk in English for 20 seconds without stopping.",
    "Do 5 jumping jacks while counting in English.",
    "Say a tongue twister 3 times, fast.",
    "Tell a short joke in English.",
    "Do a robot walk across the room."
  ];

  function wheelChalPool() {
    const c = C().wheelChallenges;
    return U().uniqueById((c && c.length) ? c : WHEEL_FALLBACK);
  }
  function gageList() {
    const g = C().gages;
    return (g && g.length) ? g : GAGE_FALLBACK;
  }

  function wheelMakeSlice(it) {
    const d = U().rand(WHEEL_DIFF);
    return {
      kind: "challenge",
      title: it.title,
      task: it.task,
      diff: d.name,
      pts: d.pts,
      time: d.time,
      color: d.color
    };
  }

  /** IDs des défis déjà présents sur la roue (pour ne pas les dupliquer entre cases). */
  function wheelOnBoardIds(excludeIdx) {
    const ids = new Set();
    (G.wheel.items || []).forEach((it, i) => {
      if (excludeIdx !== undefined && i === excludeIdx) return;
      if (it && it.kind === "challenge") {
        const id = U().getItemId(it);
        if (id) ids.add(id);
      }
    });
    return ids;
  }

  /** Tire un défi jamais posé dans la partie, et pas déjà sur une autre case. */
  function wheelPickFreshChallenge(excludeIdx) {
    const onBoard = wheelOnBoardIds(excludeIdx);
    const all = wheelChalPool();

    const freshOffBoard = all.filter((it) => {
      const id = U().getItemId(it);
      return id && !G.wheel.asked.has(id) && !onBoard.has(id);
    });
    if (freshOffBoard.length) return U().sample(freshOffBoard, 1)[0];

    // Encore des non-posés, mais tous déjà sur la roue → en prendre un quand même
    const freshAny = all.filter((it) => {
      const id = U().getItemId(it);
      return id && !G.wheel.asked.has(id);
    });
    if (freshAny.length) return U().sample(freshAny, 1)[0];

    // Vrai épuisement du pool → recycle via le registre
    return G.wheel.asked.pick(all, 1);
  }

  // compose la roue : défis (avec difficulté) + cases spéciales, mélangés
  function buildWheel() {
    const challenges = [];
    const usedLocal = new Set();
    const all = wheelChalPool();

    for (let i = 0; i < 8; i++) {
      let pool = all.filter((it) => {
        const id = U().getItemId(it);
        return id && !usedLocal.has(id) && !G.wheel.asked.has(id);
      });
      if (!pool.length) {
        // Plus de frais hors roue : autoriser un recyclage contrôlé
        pool = all.filter((it) => {
          const id = U().getItemId(it);
          return id && !usedLocal.has(id);
        });
      }
      if (!pool.length) break;
      const it = U().sample(pool, 1)[0];
      usedLocal.add(U().getItemId(it));
      challenges.push(wheelMakeSlice(it));
    }
    const specials = U().sample(WHEEL_SPECIALS, Math.min(4, WHEEL_SPECIALS.length)).map((sp) =>
      ({ kind: "special", id: sp.id, label: sp.label, emoji: sp.emoji, color: sp.color }));
    return U().shuffle(challenges.concat(specials));
  }

  /** Après un défi joué : l'enregistrer et remplacer toute case qui l'affichait. */
  function wheelConsumeChallenge(ch) {
    if (!ch) return;
    G.wheel.asked.mark(ch);
    const id = U().getItemId(ch);
    if (!id || !G.wheel.items) return;
    G.wheel.items.forEach((it, i) => {
      if (it && it.kind === "challenge" && U().getItemId(it) === id) {
        const fresh = wheelPickFreshChallenge(i);
        if (fresh) G.wheel.items[i] = wheelMakeSlice(fresh);
      }
    });
  }

  function wheelSetup() {
    teamSetup({
      title: "🎡 Spin the Wheel — teams",
      subtitle: "The referee sets up the teams, then spins the wheel on the TV.",
      hideTimer: true,
      note: "Spin the wheel! It can land on a CHALLENGE (Easy 50 / Medium 100 / Hard 200 pts — perform it before the timer runs out) or a SPECIAL slice (Jackpot, Double, Steal, Swap, Bankrupt, Bonus, Immunity). Fail a challenge and the other teams can STEAL it — or you draw a fun GAGE (forfeit). Each challenge is asked only once per game.",
      onStart: (teams, opts) => startWheel(teams, opts)
    });
  }

  function startWheel(teams, opts) {
    opts = opts || {};
    // Nouvelle partie = historique des défis remis à zéro
    const asked = U().createAskedTracker("group_wheel_chal", { persist: true });
    asked.clear();
    const gageAsked = U().createAskedTracker("group_wheel_gage", { persist: true });
    gageAsked.clear();
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0, immunity: 0 })),
      turn: 0,
      onComplete: opts.onComplete || null,
      wheel: {
        asked: asked,
        gageAsked: gageAsked,
        lastSlot: null,
        rot: 0
      }
    };
    G.wheel.items = buildWheel();
    wheelSpinScreen();
  }

  function wheelPolar(cx, cy, r, deg) {
    const t = deg * Math.PI / 180; // 0° en haut, sens horaire
    return { x: cx + r * Math.sin(t), y: cy - r * Math.cos(t) };
  }
  function wheelSvgMarkup(items, rot) {
    const N = items.length, cx = 150, cy = 150, r = 145, seg = 360 / N;
    let s = "";
    for (let i = 0; i < N; i++) {
      const it = items[i];
      const p0 = wheelPolar(cx, cy, r, i * seg);
      const p1 = wheelPolar(cx, cy, r, (i + 1) * seg);
      const large = seg > 180 ? 1 : 0;
      s += '<path d="M' + cx + ',' + cy + ' L' + p0.x.toFixed(2) + ',' + p0.y.toFixed(2) +
        ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2) +
        ' Z" fill="' + it.color + '" stroke="#1e2244" stroke-width="2"/>';
      const tp = wheelPolar(cx, cy, r * 0.7, (i + 0.5) * seg);
      const glyph = it.kind === "special" ? it.emoji : String(it.pts);
      s += '<text x="' + tp.x.toFixed(2) + '" y="' + tp.y.toFixed(2) + '" fill="#12132a" font-size="20" ' +
        'font-weight="800" text-anchor="middle" dominant-baseline="central">' + glyph + '</text>';
    }
    return '<svg id="wheelSvg" class="wheel-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" ' +
      'style="transform:rotate(' + (rot || 0) + 'deg)">' + s + '</svg>';
  }

  function wheelEndBtn(h) {
    return h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"]);
  }

  function wheelSpinScreen() {
    const items = G.wheel.items;
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "Spin the wheel: ", h("span", { class: "team" }, [G.teams[G.turn].name])
      ]));

      scr.appendChild(h("div", { class: "wheel-wrap" }, [
        h("div", { html: wheelSvgMarkup(items, G.wheel.rot) }),
        h("div", { class: "wheel-pointer" }),
        h("div", { class: "wheel-hub" }, ["🎡"])
      ]));

      const legend = h("div", { class: "wheel-legend" });
      items.forEach((it, i) => {
        const label = it.kind === "special" ? (it.emoji + " " + it.label) : (it.pts + " pts · " + it.title + " (" + it.diff + ")");
        legend.appendChild(h("span", { class: "lg" }, [
          h("span", { class: "dot", style: "background:" + it.color }),
          h("b", {}, [(i + 1) + ". "]), label
        ]));
      });
      scr.appendChild(legend);

      const spinBtn = h("button", { class: "btn btn-primary", onclick: () => doSpin(spinBtn) }, ["🎡 SPIN"]);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [spinBtn]));
      scr.appendChild(h("div", { class: "row center mt" }, [wheelEndBtn(h)]));

      function doSpin(btn) {
        const N = items.length, seg = 360 / N;
        const idx = Math.floor(Math.random() * N);
        const mid = (idx + 0.5) * seg;
        const jitter = (Math.random() - 0.5) * seg * 0.5;
        const targetMod = (((360 - mid - jitter) % 360) + 360) % 360;
        const cur = G.wheel.rot || 0;
        let next = (cur - (cur % 360)) + 360 * 5 + targetMod;
        while (next <= cur + 360 * 4) next += 360;
        G.wheel.rot = next;
        const svg = document.getElementById("wheelSvg");
        if (svg) svg.style.transform = "rotate(" + next + "deg)";
        if (btn) { btn.disabled = true; btn.textContent = "Spinning…"; }
        // ticking décélérant
        let t = 150, gap = 90;
        for (let k = 0; k < 16; k++) { setTimeout(() => U().sfx.tick(), t); t += gap; gap *= 1.14; }
        setTimeout(() => {
          U().sfx.win();
          const it = G.wheel.items[idx];
          G.wheel.lastSlot = idx;
          if (it.kind === "special") wheelSpecialScreen(idx);
          else {
            wheelConsumeChallenge(it);
            wheelRunChallenge(it, it.pts, it.time, null);
          }
        }, 4400);
      }
    });
  }

  /* --- réaliser un défi (chronométré) --- */
  function wheelRunChallenge(ch, pts, time, banner) {
    const teamName = G.teams[G.turn].name;
    let remaining = time, timer = null, done = false;
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🎡 " + teamName + "'s challenge" + (banner ? "  " + banner : "")]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, [ch.diff + " · worth " + pts + " pts"]),
        ch.task
      ]));
      card.appendChild(h("div", { class: "row center" }, [
        h("button", { class: "speaker", onclick: () => U().speak(ch.task) }, ["🔊"])
      ]));

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const clabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s to perform"]);
      card.appendChild(chrono); card.appendChild(clabel);

      const panel = h("div", { class: "ref-panel" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — did " + teamName + " succeed?"]));
      panel.appendChild(h("div", { class: "award-grid" }, [
        h("button", { class: "btn btn-green", onclick: () => succeed() }, ["✅ Success  (+" + pts + ")"]),
        h("button", { class: "btn btn-red", onclick: () => fail() }, ["😅 Fail"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [wheelEndBtn(h)]));

      timer = setInterval(tick, 100);
      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / time) * 100) + "%";
        clabel.textContent = remaining > 0 ? Math.ceil(remaining) + "s to perform" : "⏰ Time's up — referee, judge it!";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) clearInterval(timer);
      }
      function stop() { if (timer) clearInterval(timer); }
      function succeed() {
        if (done) return; done = true; stop();
        G.teams[G.turn].score += pts;
        U().sfx.correct();
        nextWheelTurn();
      }
      function fail() {
        if (done) return; done = true; stop();
        wheelStealPhase(ch, pts);
      }
    });
  }

  /* --- échec : les autres équipes peuvent voler le défi --- */
  function wheelStealPhase(ch, pts) {
    const stuckIdx = G.turn;
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["😅 " + G.teams[stuckIdx].name + " failed — OPEN TO STEAL!"]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, ["Steal it for " + pts + " pts"]),
        ch.task
      ]));
      const grid = h("div", { class: "award-grid" });
      G.teams.forEach((t, i) => {
        if (i === stuckIdx) return;
        grid.appendChild(h("button", { class: "btn btn-green", onclick: () => steal(i) }, ["✅ " + t.name + "  (+" + pts + ")"]));
      });
      grid.appendChild(h("button", { class: "btn btn-red", onclick: () => noSteal() }, ["❌ Nobody — draw a gage"]));
      card.appendChild(grid);
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [wheelEndBtn(h)]));

      function steal(i) { G.teams[i].score += pts; U().sfx.correct(); nextWheelTurn(); }
      function noSteal() { wheelGage(stuckIdx, nextWheelTurn); }
    });
  }

  /* --- gage (forfeit), sauté si l'équipe a une immunité --- */
  function wheelGage(teamIdx, done) {
    const team = G.teams[teamIdx];
    const h = U().h;
    const overlay = h("div", { class: "modal-back" });
    const modal = h("div", { class: "modal" });
    if (team.immunity > 0) {
      team.immunity--;
      U().sfx.gift();
      modal.appendChild(h("div", { class: "gift-emoji" }, ["🛡️"]));
      modal.appendChild(h("h3", {}, ["Immunity used!"]));
      modal.appendChild(h("p", { class: "section-sub" }, [team.name + " skips the gage. (Immunity left: " + team.immunity + ")"]));
      modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
    } else {
      U().sfx.wrong();
      const gage = G.wheel.gageAsked
        ? G.wheel.gageAsked.take(gageList(), 1)
        : (U().rand(gageList()));
      modal.appendChild(h("div", { class: "gift-emoji" }, ["😅"]));
      modal.appendChild(h("h3", {}, ["Gage for " + team.name + "!"]));
      modal.appendChild(h("p", { class: "section-sub" }, ["No points — perform this:"]));
      modal.appendChild(h("div", { class: "gage-reveal" }, [gage || gageList()[0]]));
      modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Done ✔"]));
    }
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /* --- case spéciale --- */
  function wheelSpecialOverlay(emoji, title, msg, done) {
    const h = U().h;
    const overlay = h("div", { class: "modal-back" });
    const modal = h("div", { class: "modal" });
    modal.appendChild(h("div", { class: "gift-emoji" }, [emoji]));
    modal.appendChild(h("h3", {}, [title]));
    modal.appendChild(h("p", { class: "section-sub", style: "font-size:1.15rem" }, [msg]));
    modal.appendChild(h("button", { class: "btn btn-primary mt", onclick: () => { overlay.remove(); done(); } }, ["Continue"]));
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function wheelSpecialScreen(idx) {
    const sp = G.wheel.items[idx];
    const team = G.teams[G.turn];
    function leaderOther() {
      let best = -1, bi = -1;
      G.teams.forEach((t, i) => { if (i !== G.turn && t.score > best) { best = t.score; bi = i; } });
      return bi;
    }

    if (sp.id === "double") {
      const d = U().rand(WHEEL_DIFF);
      const base = wheelPickFreshChallenge();
      const fallback = wheelChalPool()[0] || WHEEL_FALLBACK[0];
      const src = base || fallback;
      const ch = { title: src.title, task: src.task, diff: d.name };
      wheelConsumeChallenge(ch);
      G.wheel.lastSlot = null;
      wheelSpecialOverlay("✖️", "DOUBLE!", "This challenge is worth DOUBLE — " + (d.pts * 2) + " points!",
        () => wheelRunChallenge(ch, d.pts * 2, d.time, "✖️2 DOUBLE"));
      return;
    }

    let msg = "", jackpot = false;
    switch (sp.id) {
      case "jackpot": team.score += 300; msg = "+300 points!"; jackpot = true; break;
      case "bonus": team.score += 150; msg = "+150 free points!"; break;
      case "bankrupt": { const lost = Math.floor(team.score / 2); team.score -= lost; msg = "Lost half your points (−" + lost + ")."; break; }
      case "steal": {
        const bi = leaderOther();
        if (bi < 0) { msg = "…but there's no one to steal from."; }
        else { const amt = Math.min(100, G.teams[bi].score); G.teams[bi].score -= amt; team.score += amt; msg = "Took " + amt + " points from " + G.teams[bi].name + "!"; }
        break;
      }
      case "swap": {
        const bi = leaderOther();
        if (bi < 0) { msg = "…but there's no one to swap with."; }
        else { const tmp = team.score; team.score = G.teams[bi].score; G.teams[bi].score = tmp; msg = "Swapped scores with " + G.teams[bi].name + "!"; }
        break;
      }
      case "immunity": team.immunity = (team.immunity || 0) + 1; msg = "You can skip your next gage."; break;
      default: msg = "";
    }
    if (jackpot) { U().sfx.win(); U().confetti(2600); }
    else if (sp.id === "bankrupt") U().sfx.wrong();
    else U().sfx.gift();
    wheelSpecialOverlay(sp.emoji, sp.label + "!", msg, nextWheelTurn);
  }

  function nextWheelTurn() {
    G.turn = (G.turn + 1) % G.teams.length;
    wheelSpinScreen();
  }

  /* ================================================================
     4f) Charades (mime) — une équipe mime, ses coéquipiers devinent.
     Le mot n'est montré qu'à l'acteur (les autres regardent ailleurs),
     puis caché pendant le mime ; l'arbitre valide (points) ou passe.
     ================================================================ */
  const CHARADES_POINTS = 100;
  const CHARADES_FALLBACK = [
    { word: "A cat", cat: "Animal" }, { word: "An elephant", cat: "Animal" },
    { word: "Swimming", cat: "Action" }, { word: "Sleeping", cat: "Action" },
    { word: "Eating", cat: "Action" }, { word: "Driving a car", cat: "Action" },
    { word: "A doctor", cat: "Job" }, { word: "A teacher", cat: "Job" },
    { word: "Playing football", cat: "Sport" }, { word: "Boxing", cat: "Sport" },
    { word: "Reading a book", cat: "Action" }, { word: "A monkey", cat: "Animal" }
  ];
  function charList() {
    const c = C().charades;
    return (c && c.length) ? c : CHARADES_FALLBACK;
  }
  function charDraw() {
    return G.charDeck.draw();
  }

  function charadesSetup() {
    let roundSec = 40;
    teamSetup({
      title: "🎭 Charades — teams",
      subtitle: "The referee sets up the teams, then runs it on the TV.",
      hideTimer: true,
      note: "Each turn: one actor from the team reads a secret word (everyone else looks away!), then mimes it with NO talking while the team guesses before time runs out. A correct guess scores points.",
      extras: (scr, h) => {
        const pills = h("div", { class: "pill-group" });
        function renderDur() {
          pills.innerHTML = "";
          [["40s", 40], ["60s", 60], ["90s", 90], ["2 min", 120]].forEach(([label, val]) => {
            pills.appendChild(h("button", {
              class: "pill" + (roundSec === val ? " active" : ""),
              onclick: () => { roundSec = val; renderDur(); }
            }, [label]));
          });
        }
        renderDur();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Time to guess"]), pills])
        ]));
        return () => ({ roundSec: roundSec });
      },
      onStart: (teams, opts) => startCharades(teams, opts)
    });
  }

  function startCharades(teams, opts) {
    opts = opts || {};
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      onComplete: opts.onComplete || null,
      roundSec: opts.roundSec || 60,
      charDeck: U().newSessionDeck(charList(), "group_charades")
    };
    charadesReady();
  }

  function charadesEndBtn(h) {
    return h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"]);
  }

  function charadesReady() {
    const team = G.teams[G.turn];
    const word = charDraw();
    if (!word) {
      podium();
      return;
    }
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🎭 ", h("span", { class: "team" }, [team.name]), "'s turn"
      ]));
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "q" }, ["Choose one actor from " + team.name + "."]));
      card.appendChild(h("p", { class: "section-sub" }, ["When you're ready, reveal the secret word — everyone else, look away! 🙈"]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => charadesReveal(word) }, ["🎬 Reveal the word (actor only)"]),
        charadesEndBtn(h)
      ]));
    });
  }

  function charadesReveal(word) {
    if (!word) {
      podium();
      return;
    }
    const team = G.teams[G.turn];
    U().show((scr) => {
      const h = U().h;
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🙈 " + team.name + " — actor only, others look away!"]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, [word.cat]),
        word.word
      ]));
      card.appendChild(h("p", { class: "section-sub" }, ["Got it? Start acting — no talking, no pointing at words!"]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => charadesActing(word) }, ["🎬 Start acting"]),
        h("button", { class: "btn btn-ghost", onclick: () => charadesReveal(charDraw()) }, ["🔀 Another word"]),
        charadesEndBtn(h)
      ]));
    });
  }

  function charadesActing(word) {
    const team = G.teams[G.turn];
    let remaining = G.roundSec, timer = null, done = false;
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🎭 ", h("span", { class: "team" }, [team.name]), " — act it out!"
      ]));

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["Category: " + word.cat]));

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      card.appendChild(chrono); card.appendChild(chronoLabel);

      card.appendChild(h("p", { class: "section-sub" }, ["Actor: mime only, no talking! Team: shout your guesses. (The word is hidden.)"]));

      const panel = h("div", { class: "ref-panel" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — did " + team.name + " guess it?"]));
      panel.appendChild(h("div", { class: "award-grid" }, [
        h("button", { class: "btn btn-green", onclick: () => win() }, ["✅ Guessed!  (+" + CHARADES_POINTS + ")"]),
        h("button", { class: "btn btn-red", onclick: () => lose() }, ["⏭️ Pass (no points)"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [charadesEndBtn(h)]));

      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.roundSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) lose();
      }
      function stop() { if (timer) clearInterval(timer); }
      function win() {
        if (done) return; done = true; stop();
        team.score += CHARADES_POINTS;
        U().sfx.correct();
        charadesResult(word, true);
      }
      function lose() {
        if (done) return; done = true; stop();
        U().sfx.wrong();
        charadesResult(word, false);
      }
    });
  }

  function charadesResult(word, guessed) {
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, [guessed ? "✅ Guessed!" : "⏰ Time's up / passed"]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, [guessed ? "+" + CHARADES_POINTS + " points" : "No points"]),
        "The word was: " + word.word
      ]));
      card.appendChild(h("div", { class: "row center" }, [
        h("button", { class: "speaker", onclick: () => U().speak(word.word) }, ["🔊"])
      ]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => nextCharadesTurn() }, ["▶ Next team"]),
        charadesEndBtn(h)
      ]));
    }, { replace: true });
  }

  function nextCharadesTurn() {
    G.turn = (G.turn + 1) % G.teams.length;
    charadesReady();
  }

  /* ================================================================
     4g) Word from Word — chaque équipe reçoit un mot de base,
     puis doit former des mots avec les lettres de ce mot.
     Les lettres sont comptées exactement : si le mot de base contient
     3 E, le mot formé ne peut pas contenir 4 E. Chaque mot ne peut
     être utilisé qu'une seule fois pendant la partie.
     ================================================================ */
  const WFW_MINLEN = 3;
  const WFW_BASE_WORDS = ["INTERNATIONAL", "ENVIRONMENT", "EDUCATION", "CHALLENGING", "CONVERSATION", "ELECTRICITY", "ADVENTURE", "INFORMATION", "HOSPITALITY", "COMMUNICATION", "PRACTICE", "EXPERIENCE", "DISCOVERY", "MOUNTAIN", "ENGLISH", "HAPPINESS", "COMPUTER", "SCHOOL", "FRIENDSHIP", "ELEMENT"];
  const WFW_ENGLISH_WORDS = (() => {
    const set = new Set();
    const addWords = (words) => {
      (Array.isArray(words) ? words : []).forEach((w) => {
        const norm = normalizeBaseWord(w);
        if (norm && norm.length >= WFW_MINLEN && /^[A-Z]+$/.test(norm)) set.add(norm);
      });
    };
    addWords((C().vocabulary || []).map((v) => v.en));
    addWords(C().anagramWords || []);
    const extras = [
      "ABLE","ACID","ACT","ADD","AGE","AIM","AIR","ALL","AND","ANT","APPLE","AREA","ARM","ART","ASK",
      "ATOM","AUNT","AWAY","BAG","BAN","BAR","BASE","BE","BED","BEE","BEEN","BEER","BELL","BEST","BET",
      "BIG","BILL","BIN","BIRD","BITE","BLADE","BLUE","BOAT","BODY","BOOK","BOX","BOY","BREAD","BRING",
      "BROWN","BUSH","BUS","CAGE","CALL","CAMP","CAN","CAP","CAR","CARD","CARE","CASE","CAT","CAVE","CELL",
      "CENT","CHAIR","CHARGE","CHEF","CHILD","CITY","CLUB","COAT","CODE","COLD","COME","COOL","CORN","COST",
      "CLOUD","CUTE","DAD","DANCE","DAY","DEAR","DEEP","DESK","DICE","DID","DIG","DOG","DOOR","DRY","DUNE",
      "EACH","EAST","EAT","EDGE","EGG","EIGHT","ELM","EYE","FACE","FALL","FARM","FAST","FEAR","FEET",
      "FELL","FIND","FIRE","FISH","FIT","FIVE","FLOW","FOOD","FOOT","FOR","FREE","FRIEND","GAME","GARDEN",
      "GATE","GIVE","GOAT","GOLD","GOOD","GREEN","GROW","HAND","HARD","HAT","HAVE","HEAR","HEAT","HELP",
      "HER","HIDE","HIGH","HILL","HIM","HIS","HOME","HOPE","HOT","HOUSE","ICE","IDEA","IN","INTO","IRON",
      "ISLAND","IT","JAM","JAR","JAW","JET","JOB","JOIN","JOKE","JOY","JUMP","JUST","KEEP","KEY","KID",
      "KIND","KING","KISS","KITE","KNOW","LAD","LAMP","LAND","LARGE","LAST","LATE","LEAF","LEARN","LEAVE",
      "LEFT","LEG","LEND","LENT","LESS","LET","LIFE","LIGHT","LIKE","LIME","LINE","LION","LIST","LIVE",
      "LONE","LONG","LOOK","LOVE","MADE","MAKE","MAN","MANY","MAP","MARK","MASS","MAT","MEAL","MEAN","MEAT",
      "MEET","MELT","MEN","MENT","MILE","MILL","MIND","MINE","MINT","MIRROR","MIX","MONEY","MOON","MORE",
      "MOUNTAIN","MOUSE","MOVE","MUSIC","NAME","NATURE","NEAR","NEED","NEW","NICE","NIGHT","NINE","NO","NOD",
      "NORTH","NOTE","NOW","OAK","OAT","OCEAN","OIL","OLD","ONE","OPEN","ORANGE","ORDER","OTHER","OUR","OUT",
      "OVER","PAGE","PAIN","PAIR","PARK","PART","PASS","PAST","PATH","PEACE","PEAR","PEN","PENCIL","PEPPER",
      "PER","PERSON","PET","PHONE","PICK","PIE","PIG","PILOT","PINE","PINK","PLACE","PLAIN","PLANT","PLAY",
      "POINT","POOR","PORT","POST","POT","POWER","PRAY","PRESS","PRICE","PRIDE","PROVE","PUP","PUT","QUEEN",
      "RACE","RAIN","READ","REAL","RED","RICE","RIDE","RING","RIVER","ROAD","ROCK","ROOM","ROSE","ROUND","RULE",
      "RUN","SAFE","SAIL","SALT","SAME","SAND","SAVE","SAY","SCHOOL","SEA","SEAT","SEE","SEED","SELF","SEND",
      "SENSE","SET","SEVEN","SHARE","SHE","SHEEP","SHIP","SHOE","SHOP","SHOW","SILK","SILVER","SING","SIT",
      "SKY","SLEEP","SLOW","SMALL","SMILE","SNOW","SOAP","SOFT","SOIL","SON","SONG","SOUTH","SPACE","SPARE",
      "SPEAK","SPEED","SPEND","SPIN","SPOON","SPRING","STAR","START","STAY","STONE","STOP","STORY","STUDY",
      "SUM","SUN","SWEET","SWIM","TABLE","TAKE","TALK","TALL","TANK","TAP","TEA","TEAM","TEAR","TELL","TEN",
      "TEST","TEXT","THAN","THAT","THE","THEIR","THEM","THEN","THERE","THEY","THING","THINK","THIS","THREE",
      "THROUGH","TIME","TO","TOE","TOOL","TOP","TOUCH","TOWN","TREE","TRIANGLE","TRIP","TRUE","TURN","TWO",
      "TYPE","UNDER","UNIT","UP","USE","VERY","VIEW","VILLAGE","VOICE","WALK","WALL","WANT","WAR","WARM","WASH",
      "WATER","WAVE","WAY","WE","WEAK","WEAR","WEED","WELL","WENT","WEST","WHAT","WHEN","WHERE","WHICH",
      "WHITE","WHO","WHY","WIDE","WIFE","WILD","WILL","WIND","WINDOW","WINE","WING","WIN","WISH","WITH","WOOD",
      "WORD","WORK","WORLD","WORM","WORTH","WRITE","WRONG","YEAR","YES","YET","YOU","YOUNG","ZERO"
    ];
    addWords(extras);
    return set;
  })();

  function normalizeBaseWord(text) {
    return String(text || "").toUpperCase().replace(/[^A-Z]/g, "");
  }

  function wfwCanMake(candidate, baseWord, minLength) {
    const word = normalizeBaseWord(candidate);
    const base = normalizeBaseWord(baseWord);
    const min = minLength || WFW_MINLEN;
    if (!word || word.length < min || word.length > base.length) return false;
    const avail = {};
    base.split("").forEach((ch) => { avail[ch] = (avail[ch] || 0) + 1; });
    for (let i = 0; i < word.length; i++) {
      const ch = word.charAt(i);
      if (!avail[ch]) return false;
      avail[ch]--;
    }
    return true;
  }

  function wfwPoints(word, baseWord) {
    const len = normalizeBaseWord(word).length;
    const baseLen = normalizeBaseWord(baseWord).length;
    let pts = len * len;
    if (len >= baseLen - 1) pts += 8;
    return pts;
  }

  async function wfwIsEnglishWord(word, minLength) {
    const norm = normalizeBaseWord(word);
    const min = minLength || WFW_MINLEN;
    if (!norm || norm.length < min) return false;
    if (WFW_ENGLISH_WORDS.has(norm)) return true;
    return await U().validateEnglishWord(norm);
  }

  function pickWfwBaseWords(count) {
    const pool = U().shuffle(WFW_BASE_WORDS.slice());
    const picked = [];
    for (let i = 0; i < count; i++) {
      const next = pool[i % pool.length];
      picked.push(next);
    }
    return picked;
  }

  function wordFromWordSetup() {
    let roundSec = 90;
    let minLength = 3;
    teamSetup({
      title: "🧩 Word from Word — teams",
      subtitle: "The referee gives a big word. Teams must form smaller words using only its letters.",
      hideTimer: true,
      note: "Each team gets a base word. They must form as many valid words as possible from its letters. You can choose the minimum word length, and correct answers earn a small time bonus. If the base word has 3 E's, no formed word can use 4 E's. Each word can be used only once during the whole game.",
      extras: (scr, h) => {
        const timePills = h("div", { class: "pill-group" });
        function renderTime() {
          timePills.innerHTML = "";
          [["60s", 60], ["90s", 90], ["2 min", 120], ["3 min", 180]].forEach(([label, val]) => {
            timePills.appendChild(h("button", {
              class: "pill" + (roundSec === val ? " active" : ""),
              onclick: () => { roundSec = val; renderTime(); }
            }, [label]));
          });
        }
        const lengthPills = h("div", { class: "pill-group" });
        function renderLength() {
          lengthPills.innerHTML = "";
          [["3 letters", 3], ["4 letters", 4], ["5 letters", 5], ["6 letters", 6]].forEach(([label, val]) => {
            lengthPills.appendChild(h("button", {
              class: "pill" + (minLength === val ? " active" : ""),
              onclick: () => { minLength = val; renderLength(); }
            }, [label]));
          });
        }
        renderTime(); renderLength();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Time per team"]), timePills]),
          h("div", {}, [h("div", { class: "section-sub" }, ["Minimum word length"]), lengthPills])
        ]));
        return () => ({ roundSec: roundSec, minLength: minLength });
      },
      onStart: (teams, opts) => startWordFromWord(teams, opts)
    });
  }

  function startWordFromWord(teams, opts) {
    opts = opts || {};
    const baseWords = pickWfwBaseWords(teams.length);
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      roundSec: opts.roundSec || 90,
      onComplete: opts.onComplete || null,
      wfw: { baseWords: baseWords, usedWords: new Set(), teamWords: {}, minLength: opts.minLength || WFW_MINLEN }
    };
    wfwTurn(0);
  }

  function wfwTurn(idx) {
    G.turn = idx;
    const team = G.teams[idx];
    const baseWord = G.wfw.baseWords[idx] || WFW_BASE_WORDS[0];
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🧩 ", h("span", { class: "team" }, [team.name]), " — build words from the base word"
      ]));
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["Base word: " + baseWord]));
      const minLength = G.wfw?.minLength || WFW_MINLEN;
      card.appendChild(h("p", { class: "section-sub" }, ["Use only the letters from this word. Only English words are accepted. No word can be repeated during the game. Words must be at least " + minLength + " letters long."]));
      card.appendChild(h("div", { class: "wheel-challenge", style: "font-size:1.2rem" }, ["📌 Example: if the base word contains 3 E, your word cannot contain 4 E."]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => wfwPlay(idx, baseWord) }, ["▶ Start"]),
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));
    });
  }

  function wfwPlay(idx, baseWord) {
    const team = G.teams[idx];
    const st = G.wfw;
    const teamUsed = new Set(st.teamWords[idx] || []);
    let roundPts = 0;
    let remaining = G.roundSec, timer = null, done = false;

    U().show((scr) => {
      const h = U().h;
      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t, i) => {
        sb.appendChild(h("div", { class: "score-chip" + (i === idx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);

      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🧩 ", h("span", { class: "team" }, [team.name]), " — form words from ", h("span", { class: "ans" }, [baseWord])
      ]));

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["Base word: " + baseWord]));
      const totalEl = h("div", { class: "wc-count" }, ["Words: 0   ·   +0 pts"]);
      card.appendChild(totalEl);
      const chain = h("div", { class: "wc-chain" });
      card.appendChild(chain);

      const input = h("input", {
        type: "text",
        placeholder: "Type a word for " + team.name + "…",
        autocomplete: "off",
        onkeydown: (e) => { if (e.key === "Enter") submit(); }
      });
      const addBtn = h("button", { class: "btn btn-primary", onclick: () => submit() }, ["Add ➕"]);
      card.appendChild(h("div", { class: "wc-input-row" }, [input, addBtn]));
      const feedback = h("div", { class: "wc-feedback" }, [""]);
      card.appendChild(feedback);
      scr.appendChild(card);

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      scr.appendChild(chrono); scr.appendChild(chronoLabel);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => endTurn() }, ["⏭️ End turn now"]),
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));

      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.roundSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) endTurn();
      }

      async function submit() {
        if (done) return;
        const raw = (input.value || "").trim();
        if (!raw) return;
        if (!/^[A-Za-z]+$/.test(raw)) { reject("Letters only."); return; }
        const word = normalizeBaseWord(raw);
        const minLength = st.minLength || WFW_MINLEN;
        if (!word) { reject("Type a real word."); return; }
        if (word.length < minLength) { reject("Too short — at least " + minLength + " letters."); return; }
        if (st.usedWords.has(word)) { reject('"' + raw + '" already used in this game.'); return; }
        if (teamUsed.has(word)) { reject('"' + raw + '" already used by this team.'); return; }
        if (!wfwCanMake(word, baseWord, minLength)) { reject("That word uses letters not available in the base word."); return; }
        
        feedback.textContent = "Checking...";
        const isEng = await wfwIsEnglishWord(word, minLength);
        if (!isEng) { reject("'" + raw + "' is not recognized as a valid English word."); return; }

        st.usedWords.add(word);
        teamUsed.add(word);
        st.teamWords[idx] = Array.from(teamUsed);
        const pts = wfwPoints(word, baseWord);
        roundPts += pts;
        team.score += pts;
        chain.appendChild(h("span", { class: "wc-word" }, [word, " ", h("span", { class: "tail" }, ["+" + pts]) ]));
        totalEl.textContent = "Words: " + teamUsed.size + "   ·   +" + roundPts + " pts";
        feedback.textContent = "";
        U().sfx.correct();
        input.value = ""; try { input.focus(); } catch (e) { }
      }

      function reject(msg) {
        feedback.textContent = msg; U().sfx.wrong();
        input.value = ""; try { input.focus(); } catch (e) { }
      }

      function endTurn() {
        if (done) return; done = true; if (timer) clearInterval(timer);
        wfwResult(idx, teamUsed.size, roundPts, baseWord);
      }
    });
  }

  function wfwResult(idx, wordCount, roundPts, baseWord) {
    const isLast = idx === G.teams.length - 1;
    U().sfx.win();
    U().show((scr) => {
      const h = U().h;
      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t, i) => {
        sb.appendChild(h("div", { class: "score-chip" + (i === idx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🧩 Base word: " + baseWord]));
      card.appendChild(h("div", { class: "q" }, [wordCount + (wordCount === 1 ? " word" : " words") + "  (+" + roundPts + " pts)"]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => { if (isLast) podium(); else wfwTurn(idx + 1); } }, [isLast ? "🏆 See podium" : "▶ Next team"])
      ]));
    }, { replace: true });
  }

  /* ================================================================
     4g) Word Builder — un pool de lettres mélangées ; chaque équipe
     forme le plus de mots possible (uniquement avec ces lettres).
     Plus le mot est long, plus il rapporte (longueur²) ; utiliser
     TOUTES les lettres double les points. Ronde chronométrée pour
     tout le monde, puis notation équipe par équipe (l'arbitre saisit).
     ================================================================ */
  const WB_MINLEN = 3;

  function wbRandPool(size) {
    size = size || 9;
    const vowelBag = "AAAEEEEIIIOOOUU";                       // voyelles pondérées
    const consBag = "BBCCDDDDFFGGHHJKLLLLMMNNNNNPPPRRRRRSSSSTTTTTVVWWYZ"; // consonnes pondérées, rares limitées
    const nV = Math.round(size * 0.4) + (Math.random() < 0.5 ? 0 : 1); // ~40% voyelles
    const letters = [];
    for (let i = 0; i < nV; i++) letters.push(vowelBag[Math.floor(Math.random() * vowelBag.length)]);
    for (let i = 0; i < size - nV; i++) letters.push(consBag[Math.floor(Math.random() * consBag.length)]);
    // triées A→Z pour la lisibilité (les doublons se regroupent) ; l'ordre n'affecte pas le jeu
    return letters.sort();
  }

  function wbCanMake(word, pool) {
    const avail = {};
    pool.forEach((l) => { avail[l] = (avail[l] || 0) + 1; });
    for (let i = 0; i < word.length; i++) {
      const ch = word.charAt(i);
      if (!avail[ch]) return false;
      avail[ch]--;
    }
    return true;
  }

  function wbPoints(len, poolSize) {
    let p = len * len;            // longueur au carré
    if (len === poolSize) p *= 2; // bonus : utilise toutes les lettres
    return p;
  }

  function wordBuilderSetup() {
    let roundSec = 120;
    let poolSize = 22;
    teamSetup({
      title: "🔡 Word Builder — teams",
      subtitle: "The referee sets up the teams, then shows the letters on the TV.",
      hideTimer: true,
      note: "Each team gets its own pool of letters and a set time. Team members call out words made ONLY from those letters (each letter only as many times as it appears, min 3 letters) and the referee types each one live. Longer words score more — a word is worth its length squared, and using ALL the letters doubles it.",
      extras: (scr, h) => {
        const timePills = h("div", { class: "pill-group" });
        function renderTime() {
          timePills.innerHTML = "";
          [["90s", 90], ["2 min", 120], ["3 min", 180]].forEach(([label, val]) => {
            timePills.appendChild(h("button", {
              class: "pill" + (roundSec === val ? " active" : ""),
              onclick: () => { roundSec = val; renderTime(); }
            }, [label]));
          });
        }
        const sizePills = h("div", { class: "pill-group" });
        function renderSize() {
          sizePills.innerHTML = "";
          [["22 letters", 22], ["26 letters", 26], ["30 letters", 30]].forEach(([label, val]) => {
            sizePills.appendChild(h("button", {
              class: "pill" + (poolSize === val ? " active" : ""),
              onclick: () => { poolSize = val; renderSize(); }
            }, [label]));
          });
        }
        renderTime(); renderSize();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Thinking time"]), timePills]),
          h("div", {}, [h("div", { class: "section-sub" }, ["Letters in the pool"]), sizePills])
        ]));
        return () => ({ roundSec: roundSec, poolSize: poolSize });
      },
      onStart: (teams, opts) => startWordBuilder(teams, opts)
    });
  }

  function startWordBuilder(teams, opts) {
    opts = opts || {};
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      roundSec: opts.roundSec || 120,
      onComplete: opts.onComplete || null,
      wb: { poolSize: opts.poolSize || 22, pool: [] }
    };
    wbTurn(0);
  }

  function wbTiles(h) {
    const tiles = h("div", { class: "wb-letters" });
    G.wb.pool.forEach((l) => tiles.appendChild(h("span", { class: "wb-tile" }, [l])));
    return tiles;
  }

  function wbTurn(idx) {
    G.turn = idx;
    G.wb.pool = wbRandPool(G.wb.poolSize);
    const team = G.teams[idx];
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🔡 ", h("span", { class: "team" }, [team.name]), " — get ready!"
      ]));
      scr.appendChild(wbTiles(h));
      scr.appendChild(h("p", { class: "section-sub", style: "text-align:center" }, ["Look at your letters. When your team is ready, press Start — the timer starts then."]));
      scr.appendChild(h("p", { class: "note" }, ["Make words using ONLY these letters (each letter only as many times as it appears, min " + WB_MINLEN + " letters). Longer words score more; using ALL the letters doubles the points."]));
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => wbPlay(idx) }, ["▶ Start"]),
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));
    });
  }

  function wbPlay(idx) {
    G.turn = idx;
    const st = G.wb;
    const team = G.teams[idx];
    const used = new Set();
    let roundPts = 0;
    let remaining = G.roundSec, timer = null, done = false;

    U().show((scr) => {
      const h = U().h;

      // tableau des scores avec total en direct pour l'équipe active
      const sb = h("div", { class: "scoreboard" });
      let ptsNode = null;
      G.teams.forEach((t, i) => {
        const pts = h("div", { class: "pts" }, [String(t.score)]);
        if (i === idx) ptsNode = pts;
        sb.appendChild(h("div", { class: "score-chip" + (i === idx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]), pts
        ]));
      });
      scr.appendChild(sb);

      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🔡 ", h("span", { class: "team" }, [team.name]), " — call out words, the referee types them!"
      ]));
      scr.appendChild(wbTiles(h));

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      scr.appendChild(chrono); scr.appendChild(chronoLabel);

      const card = h("div", { class: "gd-question" });
      const totalEl = h("div", { class: "wc-count" }, ["Words: 0   ·   +0 pts"]);
      card.appendChild(totalEl);
      const chain = h("div", { class: "wc-chain" });
      card.appendChild(chain);

      const input = h("input", {
        type: "text", placeholder: "Type " + team.name + "'s word…", autocomplete: "off",
        onkeydown: (e) => { if (e.key === "Enter") submit(); }
      });
      const addBtn = h("button", { class: "btn btn-primary", onclick: () => submit() }, ["Add ➕"]);
      card.appendChild(h("div", { class: "wc-input-row" }, [input, addBtn]));
      const feedback = h("div", { class: "wc-feedback" }, [""]);
      card.appendChild(feedback);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => endTurn() }, ["⏭️ End turn now"]),
        h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"])
      ]));

      setTimeout(() => { try { input.focus(); } catch (e) { /* ignore */ } }, 60);
      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.roundSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) endTurn();
      }
      async function submit() {
        if (done) return;
        const raw = (input.value || "").trim();
        if (!raw) return;
        if (!/^[A-Za-z]+$/.test(raw)) { feedback.textContent = "Letters only."; input.value = ""; return; }
        const w = raw.toUpperCase();
        if (w.length < WB_MINLEN) { reject("Too short — at least " + WB_MINLEN + " letters."); return; }
        if (used.has(w)) { reject('"' + raw + '" already counted.'); return; }
        if (!wbCanMake(w, st.pool)) { reject("Can't build that from the letters."); return; }
        feedback.textContent = "Checking...";
        const isValid = await U().validateEnglishWord(w);
        if (!isValid) { reject('"' + raw + '" is not recognized as a valid English word.'); return; }
        used.add(w);
        const pts = wbPoints(w.length, st.pool.length);
        roundPts += pts; team.score += pts;
        if (ptsNode) ptsNode.textContent = String(team.score);
        chain.appendChild(h("span", { class: "wc-word" }, [w, " ", h("span", { class: "tail" }, ["+" + pts])]));
        totalEl.textContent = "Words: " + used.size + "   ·   +" + roundPts + " pts";
        feedback.textContent = "";
        U().sfx.correct();
        input.value = ""; try { input.focus(); } catch (e) { }
      }
      function reject(msg) {
        feedback.textContent = msg; U().sfx.wrong();
        input.value = ""; try { input.focus(); } catch (e) { }
      }
      function endTurn() {
        if (done) return; done = true; if (timer) clearInterval(timer);
        wbResult(idx, used.size, roundPts);
      }
    });
  }

  function wbResult(idx, wordCount, roundPts) {
    const isLast = idx === G.teams.length - 1;
    U().sfx.win();
    U().show((scr) => {
      const h = U().h;
      const sb = h("div", { class: "scoreboard" });
      G.teams.forEach((t, i) => {
        sb.appendChild(h("div", { class: "score-chip" + (i === idx ? " active" : "") }, [
          h("div", { class: "name" }, [t.name]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(sb);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, ["⏱️ Time! — " + G.teams[idx].name]));
      card.appendChild(h("div", { class: "q" }, [
        wordCount + (wordCount === 1 ? " word" : " words") + "  (+" + roundPts + " pts)"
      ]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => { if (isLast) podium(); else wbTurn(idx + 1); } },
          [isLast ? "🏆 See podium" : "▶ Next team"])
      ]));
    }, { replace: true });
  }

  function alphabetRaceSetup() {
    let totalSec = 90;
    let minLength = 3;
    teamSetup({
      title: "🔠 Alphabet Race — teams",
      subtitle: "Build a word for each letter from A to Z.",
      hideTimer: true,
      note: "One shared timer for the whole alphabet. Each letter must get a valid word in order. Wrong answers score 0 and the game moves on.",
      extras: (scr, h) => {
        const timePills = h("div", { class: "pill-group" });
        const lengthPills = h("div", { class: "pill-group" });

        function renderTime() {
          timePills.innerHTML = "";
          [["60s", 60], ["75s", 75], ["90s", 90], ["120s", 120]].forEach(([label, val]) => {
            timePills.appendChild(h("button", {
              class: "pill" + (totalSec === val ? " active" : ""),
              onclick: () => { totalSec = val; renderTime(); }
            }, [label]));
          });
        }

        function renderLength() {
          lengthPills.innerHTML = "";
          [["3 letters", 3], ["4 letters", 4], ["5 letters", 5], ["6 letters", 6]].forEach(([label, val]) => {
            lengthPills.appendChild(h("button", {
              class: "pill" + (minLength === val ? " active" : ""),
              onclick: () => { minLength = val; renderLength(); }
            }, [label]));
          });
        }

        renderTime();
        renderLength();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Total game time"]), timePills]),
          h("div", {}, [h("div", { class: "section-sub" }, ["Minimum word length"]), lengthPills])
        ]));
        return () => ({ roundSec: totalSec, minLength });
      },
      onStart: (teams, opts) => startAlphabetRace(teams, opts)
    });
  }

  async function isAlphabetValidWord(word) {
    if (!word || !/^[A-Za-z]+$/.test(word)) return false;
    return await U().validateEnglishWord(word);
  }

  function startAlphabetRace(teams, opts) {
    opts = opts || {};
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0, words: {} })),
      turn: 0,
      roundSec: opts.roundSec || 90,
      minLength: opts.minLength || 3,
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      currentIndex: 0,
      matchUsedWords: new Set(),
      usedWordsMap: new Map(),
      remaining: opts.roundSec || 90,
      timer: null
    };
    startAlphabetTimer();
    alphabetRaceTurn();
  }

  function startAlphabetTimer() {
    if (G.timer) return;
    G.timer = setInterval(() => {
      G.remaining -= 0.1;
      if (G.remaining <= 0) {
        clearInterval(G.timer);
        G.remaining = 0;
        showAlphabetGameOver();
      }
    }, 100);
  }

  function alphabetRaceTurn(message) {
    if (G.remaining <= 0) {
      showTeamFinish(G.teams[G.turn].name + " has run out of time.");
      return;
    }

    const team = G.teams[G.turn];
    const letter = G.alphabet[G.currentIndex];
    let remainingInterval = null;

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      const alphabetRow = h("div", { class: "alphabet-board" },
        G.alphabet.map((ch, idx) => {
          const isDone = team.words[ch];
          const isCurrent = idx === G.currentIndex;
          let cls = "alphabet-tile";
          if (isCurrent) cls += " current";
          else if (isDone) cls += " completed";
          return h("span", { class: cls, title: isDone ? `${ch}: ${isDone}` : ch }, [ch]);
        })
      );
      scr.appendChild(alphabetRow);

      const input = h("input", {
        type: "text",
        placeholder: "Enter a valid word starting with " + letter + "...",
        autocomplete: "off",
        onkeydown: (e) => { if (e.key === "Enter") submitWord(); }
      });
      const feedback = h("div", { class: "alphabet-feedback" }, [message || " "]);

      scr.appendChild(h("div", { class: "alphabet-card" }, [
        h("div", { class: "turn-banner" }, [
          "🔠 ", h("span", { class: "team" }, [team.name]), " — letter ", h("span", { class: "ans" }, [letter])
        ]),
        h("div", { class: "gd-question" }, [
          h("div", { class: "topic-tag" }, ["Letter " + letter]),
          h("div", { class: "q" }, ["Enter an English word starting with " + letter + " (min " + G.minLength + " letters)."])
        ]),
        h("div", { class: "alphabet-status" }, [
          h("span", {}, ["Letters: ", G.currentIndex + 1, "/", G.alphabet.length]),
          h("span", {}, ["Team Words: ", Object.keys(team.words).length]),
          h("span", {}, ["Remaining: ", Math.ceil(G.remaining), "s"])
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

      const remainingLabel = h("div", { class: "chrono-label center row", style: "justify-content:center;margin-top:.75rem;" }, [Math.ceil(G.remaining) + "s left"]);
      remainingInterval = setInterval(() => {
        if (!remainingLabel.isConnected) {
          clearInterval(remainingInterval);
          return;
        }
        remainingLabel.textContent = Math.ceil(G.remaining) + "s left";
      }, 100);

      const progressBar = h("div", { class: "progress-bar alphabet-progress" }, [
        h("div", {
          class: "progress-fill",
          style: { width: Math.max(0, G.remaining * 100 / G.roundSec) + "%" }
        }, [])
      ]);

      scr.appendChild(progressBar);
      scr.appendChild(remainingLabel);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-ghost", onclick: () => { G.remaining = 0; showTeamFinish(team.name + " has ended their round."); } }, ["🏁 End turn"])
      ]));

      input.focus();

      function normalizeWord(value) {
        return String(value || "").trim().replace(/[^A-Za-z]/g, "").toUpperCase();
      }

      function proceedToNextLetter(nextMessage) {
        input.value = "";
        input.focus();
        G.currentIndex += 1;
        if (G.currentIndex >= G.alphabet.length || G.remaining <= 0) {
          showTeamFinish(G.teams[G.turn].name + " finished their alphabet run!");
          return;
        }
        alphabetRaceTurn(nextMessage);
      }

      async function submitWord() {
        const raw = normalizeWord(input.value);
        if (!raw) {
          feedback.textContent = "Please type a word.";
          return;
        }
        if (raw.charAt(0) !== letter) {
          feedback.textContent = "Word must start with letter " + letter + ".";
          input.value = "";
          input.focus();
          return;
        }
        if (raw.length < G.minLength) {
          feedback.textContent = "At least " + G.minLength + " letters required.";
          input.value = "";
          input.focus();
          return;
        }
        if (G.matchUsedWords.has(raw)) {
          const usedBy = G.usedWordsMap.get(raw) || "another team";
          feedback.textContent = "⚠️ '" + raw + "' was already used by " + usedBy + "! (Two teams cannot write the same word)";
          input.value = "";
          input.focus();
          return;
        }
        const valid = await isAlphabetValidWord(raw);
        if (!valid) {
          feedback.textContent = "⚠️ '" + raw + "' is not recognized as a valid English word.";
          input.value = "";
          input.focus();
          return;
        }

        // Mark as used globally across all teams in this match
        G.matchUsedWords.add(raw);
        G.usedWordsMap.set(raw, team.name);
        team.words[letter] = raw;

        const pts = raw.length * 5 + Math.ceil(G.remaining / 10);
        team.score += pts;
        U().speak(raw);
        proceedToNextLetter("✅ " + raw + " (+" + pts + " pts)");
      }

      function passWord() {
        proceedToNextLetter("Passed letter " + letter + ".");
      }
    }, { replace: true });
  }

  function showTeamFinish(message) {
    if (G.timer) {
      clearInterval(G.timer);
      G.timer = null;
    }
    const team = G.teams[G.turn];
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "gd-question" }, [
        h("div", { class: "topic-tag" }, ["🔚 Round finished"]),
        h("div", { class: "q" }, [message])
      ]));
      scr.appendChild(h("div", { class: "section-note" }, [
        team.name + " completed " + Object.keys(team.words).length + "/26 letters and scored " + team.score + " points."
      ]));

      const isLastTeam = G.turn + 1 >= G.teams.length;
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => {
          if (isLastTeam) {
            showAlphabetSummary();
          } else {
            nextTeam();
          }
        } }, [isLastTeam ? "📊 View A-Z Word Summary" : "▶ Next team turn"])
      ]));
    }, { replace: true });
  }

  function nextTeam() {
    G.turn += 1;
    G.currentIndex = 0;
    G.remaining = G.roundSec;
    if (G.timer) {
      clearInterval(G.timer);
      G.timer = null;
    }
    startAlphabetTimer();
    alphabetRaceTurn("Next team: " + G.teams[G.turn].name + " starts now!");
  }

  function showAlphabetGameOver() {
    if (G.timer) {
      clearInterval(G.timer);
      G.timer = null;
    }
    showTeamFinish(G.teams[G.turn].name + " ran out of time.");
  }

  function showAlphabetSummary() {
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("h2", { class: "section-title" }, ["📊 Alphabet Race — Word Summary"]));
      scr.appendChild(h("p", { class: "section-sub" }, ["Comparison of words submitted by each team (no duplicate words allowed)."]));

      const table = h("table", { class: "alphabet-recap-table", style: "width:100%;margin-top:1rem;border-collapse:collapse;" });
      const headerRow = h("tr", {}, [
        h("th", { style: "padding:8px;border-bottom:2px solid var(--line);text-align:center;" }, ["Letter"])
      ]);
      G.teams.forEach((t) => {
        headerRow.appendChild(h("th", { style: "padding:8px;border-bottom:2px solid var(--line);text-align:left;" }, [t.name]));
      });
      table.appendChild(headerRow);

      G.alphabet.forEach((ch) => {
        const row = h("tr", {}, [
          h("td", { style: "padding:6px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;font-weight:700;color:var(--brand)" }, [ch])
        ]);
        G.teams.forEach((t) => {
          const w = t.words[ch] || "-";
          row.appendChild(h("td", { style: "padding:6px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.95rem;" }, [w]));
        });
        table.appendChild(row);
      });

      scr.appendChild(h("div", { style: "max-height:360px;overflow-y:auto;border:1px solid var(--line);border-radius:12px;padding:8px;background:var(--card-2);" }, [table]));

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => podium() }, ["🏆 Go to Podium"])
      ]));
    }, { replace: true });
  }

  function alphabetRaceResult() {
    podium();
  }

  /* ================================================================
     7) Spelling Bee en groupe — setup avancé
     ================================================================ */
  function spellingBeeSetup() {
    let wordsPerTurn = 5;
    let difficulty = "all";   // "easy" | "medium" | "hard" | "all"
    let wordSec = 0;          // 0 = pas de chrono
    teamSetup({
      title: "🐝 Spelling Bee (Group)",
      subtitle: "Listen to the word — spell it out loud, referee submits.",
      hideTimer: true,
      extras: (scr, h) => {
        /* --- Nombre de mots par équipe --- */
        const wptPills = h("div", { class: "pill-group" });
        function renderWpt() {
          wptPills.innerHTML = "";
          [3, 5, 7, 10].forEach((n) => {
            wptPills.appendChild(h("button", {
              class: "pill" + (wordsPerTurn === n ? " active" : ""),
              onclick: () => { wordsPerTurn = n; renderWpt(); }
            }, [String(n)]));
          });
        }
        renderWpt();

        /* --- Difficulté --- */
        const diffPills = h("div", { class: "pill-group" });
        function renderDiff() {
          diffPills.innerHTML = "";
          [["All levels", "all"], ["🟢 Easy", "easy"], ["🟡 Medium", "medium"], ["🔴 Hard", "hard"]].forEach(([label, val]) => {
            diffPills.appendChild(h("button", {
              class: "pill" + (difficulty === val ? " active" : ""),
              onclick: () => { difficulty = val; renderDiff(); }
            }, [label]));
          });
        }
        renderDiff();

        /* --- Temps par mot --- */
        const timePills = h("div", { class: "pill-group" });
        function renderTime() {
          timePills.innerHTML = "";
          [["No timer", 0], ["15s", 15], ["20s", 20], ["30s", 30], ["45s", 45]].forEach(([label, val]) => {
            timePills.appendChild(h("button", {
              class: "pill" + (wordSec === val ? " active" : ""),
              onclick: () => { wordSec = val; renderTime(); }
            }, [label]));
          });
        }
        renderTime();

        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Words per team"]), wptPills]),
          h("div", {}, [h("div", { class: "section-sub" }, ["Difficulty"]), diffPills]),
          h("div", {}, [h("div", { class: "section-sub" }, ["Time per word"]), timePills])
        ]));
        return () => ({});
      },
      onStart: (teams, opts) => {
        startGroupSpellingBee(teams, { wordsPerTurn, difficulty, wordSec });
      }
    });
  }

  function startGroupSpellingBee(teams, opts) {
    opts = opts || {};
    const difficulty = opts.difficulty || "all";
    const vocabPool = (C().vocabulary || []).map(v => ({ word: v.en, tier: v.level || "easy" }));
    const spellingPool = (C().spellingWords || []).map(w => typeof w === "string" ? { word: w, tier: "medium" } : w);
    let fullPool = U().uniqueById(vocabPool.concat(spellingPool));
    if (difficulty !== "all") {
      const filtered = fullPool.filter(w => w.tier === difficulty);
      if (filtered.length >= 3) fullPool = filtered;
    }

    G = {
      teams: teams.map(t => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      wordsPerTurn: opts.wordsPerTurn || 5,
      wordSec: opts.wordSec || 0,
      difficulty: difficulty,
      spellingDeck: U().newSessionDeck(fullPool, "group_spelling_" + difficulty),
      onComplete: opts.onComplete || null
    };
    spellingBeeTurn(0);
  }

  function spellingBeeDraw() {
    return G.spellingDeck.draw();
  }

  function spellingBeeEndBtn(h) {
    return h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"]);
  }

  function spellingBeeTurn(teamIdx) {
    G.turn = teamIdx;
    const team = G.teams[teamIdx];
    let turnWords = 0;
    let turnScore = 0;
    let wordItem = spellingBeeDraw();
    let revealed = false;
    let revealUsed = false;
    let revealLetter = "";
    let timer = null;
    let timeLeft = G.wordSec;
    let timerDone = false;

    // If deck is exhausted from the start of this team's turn, go to podium
    if (!wordItem) {
      podium();
      return;
    }

    function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

    function startWordTimer(bar, chronoLabel, onExpire) {
      clearTimer();
      if (!G.wordSec) return;
      timeLeft = G.wordSec;
      timerDone = false;
      timer = setInterval(() => {
        if (bar.isConnected === false) { clearTimer(); return; }
        timeLeft -= 0.1;
        bar.style.width = Math.max(0, (timeLeft / G.wordSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(timeLeft)) + "s";
        if (timeLeft <= 3 && timeLeft > 0) U().sfx.tick();
        if (timeLeft <= 0 && !timerDone) { timerDone = true; clearTimer(); onExpire(); }
      }, 100);
    }

    function renderScreen() {
      clearTimer();
      const targetWord = (typeof wordItem === "string" ? wordItem : (wordItem.word || wordItem.en || "")).trim();
      const tierLabel = (typeof wordItem === "object" && wordItem.tier) ? wordItem.tier : "medium";
      const tierColor = tierLabel === "easy" ? "#34d399" : tierLabel === "hard" ? "#fb7185" : "#60a5fa";
      const tierIcon = tierLabel === "easy" ? "🟢" : tierLabel === "hard" ? "🔴" : "🟡";

      U().show((scr) => {
        const h = U().h;

        /* ---- Scoreboard compact ---- */
        scoreboard(scr);

        /* ---- Bannière tour ---- */
        scr.appendChild(h("div", { class: "turn-banner" }, [
          "🐝 ", h("span", { class: "team" }, [team.name]),
          ` — Word ${turnWords + 1} / ${G.wordsPerTurn}`
        ]));

        /* ---- Barre de progression de la manche ---- */
        const prog = h("div", { class: "progress" }, [
          h("i", { style: `width:${(turnWords / G.wordsPerTurn) * 100}%` })
        ]);
        scr.appendChild(prog);

        /* ---- Carte principale ---- */
        const card = h("div", { class: "gd-question" });

        /* Badge difficulté */
        card.appendChild(h("div", { class: "topic-tag", style: `border-left: 4px solid ${tierColor}` }, [
          tierIcon + " " + tierLabel.charAt(0).toUpperCase() + tierLabel.slice(1) + " word"
        ]));

        /* Icône audio */
        card.appendChild(h("div", { class: "prompt-emoji", style: "font-size:3rem;text-align:center;margin:8px 0" }, ["🎧"]));
        card.appendChild(h("p", { class: "section-sub", style: "text-align:center" }, [
          "Listen carefully — then spell the word out loud!"
        ]));

        /* Boutons audio */
        const soundRow = h("div", { class: "row center mt mb" });
        soundRow.appendChild(h("button", {
          class: "btn btn-primary",
          style: "font-size:1.1rem;padding:10px 22px;",
          onclick: () => U().speak(targetWord)
        }, ["🔊 Listen"]));
        soundRow.appendChild(h("button", {
          class: "btn btn-ghost",
          style: "font-size:1rem;padding:10px 18px;",
          onclick: () => U().speak(targetWord, { slow: true })
        }, ["🐢 Slowly"]));
        card.appendChild(soundRow);

        /* Chrono par mot (si activé) */
        if (G.wordSec) {
          const bar = h("i");
          const chrono = h("div", { class: "chrono" }, [bar]);
          const chronoLabel = h("div", {
            class: "chrono-label center row",
            style: "justify-content:center"
          }, [G.wordSec + "s"]);
          card.appendChild(chrono);
          card.appendChild(chronoLabel);
          // lance le timer après render
          setTimeout(() => {
            startWordTimer(bar, chronoLabel, () => {
              // Temps écoulé → passe
              revealed = true;
              renderScreen();
              setTimeout(() => nextWord(false), 1800);
            });
          }, 50);
        }

        /* Réponse révélée */
        const revealBox = h("div", { class: "reveal mt-sm" });
        if (revealed) {
          revealBox.appendChild(h("span", {}, [
            "Correct spelling: ", h("b", { class: "ans" }, [targetWord])
          ]));
        }
        if (revealUsed) {
          revealBox.appendChild(h("div", { class: "fr-hint-box mt-sm" }, ["🔎 Revealed letter: " + revealLetter]));
        }
        card.appendChild(revealBox);

        /* Panel arbitre */
        const panel = h("div", { class: "ref-panel mt" });
        panel.appendChild(h("div", { class: "label" }, ["Referee — type what the team spells:"]));
        const inputRow = h("div", { class: "wc-input-row mt-sm" });
        const input = h("input", {
          type: "text",
          placeholder: "Type the spelling…",
          autocomplete: "off",
          spellcheck: "false",
          onkeydown: (e) => { if (e.key === "Enter") submitSpelling(); }
        });
        const submitBtn = h("button", {
          class: "btn btn-green",
          onclick: () => submitSpelling()
        }, ["✓ Submit"]);
        inputRow.appendChild(input);
        inputRow.appendChild(submitBtn);
        panel.appendChild(inputRow);

        const actionRow = h("div", { class: "row center mt-sm" });
        const revealLetterBtn = h("button", {
          class: "btn btn-ghost",
          onclick: () => {
            if (revealUsed) return;
            revealUsed = true;
            const penalty = 20;
            team.score = Math.max(0, team.score - penalty);
            turnScore = Math.max(0, turnScore - penalty);
            const idx = Math.floor(Math.random() * targetWord.length);
            revealLetter = targetWord.charAt(idx).toUpperCase();
            revealBox.appendChild(h("div", { class: "fr-hint-box mt-sm" }, ["🔎 Revealed letter: " + revealLetter]));
            scoreLine.textContent = "This turn: " + turnScore + " pts";
            revealLetterBtn.disabled = true;
            revealLetterBtn.textContent = "🔎 Letter revealed (-" + penalty + " pts)";
            U().sfx.gift();
          }
        }, ["🧩 Reveal a letter (-20 pts)"]);
        actionRow.appendChild(revealLetterBtn);
        actionRow.appendChild(h("button", {
          class: "btn btn-ghost",
          onclick: () => { clearTimer(); revealed = true; renderScreen(); }
        }, ["👁️ Reveal"]));
        actionRow.appendChild(h("button", {
          class: "btn btn-ghost",
          onclick: () => { clearTimer(); nextWord(false); }
        }, ["⏭️ Pass (0)"]));
        panel.appendChild(actionRow);
        card.appendChild(panel);
        scr.appendChild(card);

        /* Score de la manche en bas */
        const scoreLine = h("span", { class: "section-sub" }, [`This turn: ${turnScore >= 0 ? "+" : ""}${turnScore} pts`]);
        scr.appendChild(h("div", { class: "row center mt" }, [scoreLine]));

        scr.appendChild(h("div", { class: "row center mt" }, [spellingBeeEndBtn(h)]));

        /* Auto-play + focus */
        setTimeout(() => U().speak(targetWord), 300);
        setTimeout(() => { try { input.focus(); } catch (e) { } }, 120);

        function submitSpelling() {
          const guess = (input.value || "").trim();
          if (!guess) return;
          clearTimer();
          const isCorrect = guess.toLowerCase() === targetWord.toLowerCase() || anaMatch(guess, targetWord);
          if (isCorrect) {
            const pts = tierLabel === "hard" ? 150 : tierLabel === "easy" ? 75 : 100;
            U().sfx.correct();
            team.score += pts;
            turnScore += pts;
            nextWord(true);
          } else {
            U().sfx.wrong();
            revealed = true;
            renderScreen();
            setTimeout(() => nextWord(false), 2000);
          }
        }
      });
    }

    function nextWord(wasCorrect) {
      turnWords++;
      if (turnWords < G.wordsPerTurn) {
        wordItem = spellingBeeDraw();
        if (!wordItem) {
          // Deck exhausted mid-turn — end team's turn gracefully
          endTurn();
          return;
        }
        revealed = false;
        renderScreen();
      } else {
        endTurn();
      }
    }

    function endTurn() {
      /* Fin du tour de cette équipe */
      clearTimer();
      const nextTeamIdx = (teamIdx + 1) % G.teams.length;
      const isLastTeam = nextTeamIdx === 0;

      const h = U().h;
      const overlay = h("div", { class: "modal-back" });
      const modal = h("div", { class: "modal" });
      modal.appendChild(h("div", { class: "gift-emoji" }, ["✅"]));
      modal.appendChild(h("h3", {}, [`${team.name}'s turn done!`]));
      modal.appendChild(h("div", { class: "section-sub" }, [`+${turnScore} pts this turn`]));

      const btns = h("div", { class: "give-list mt" });
      btns.appendChild(h("button", {
        class: "btn btn-primary mt",
        onclick: () => { overlay.remove(); spellingBeeTurn(nextTeamIdx); }
      }, [isLastTeam ? "▶ Start next round" : `▶ Next: ${G.teams[nextTeamIdx].name}`]));
      btns.appendChild(h("button", {
        class: "btn btn-red mt",
        onclick: () => { overlay.remove(); podium(); }
      }, ["🏁 End game & see podium"]));
      modal.appendChild(btns);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    }

    renderScreen();
  }

  /* ================================================================
     5) Podium
     ================================================================ */
  function podium() {
    const ranked = G.teams.slice().sort((a, b) => b.score - a.score);
    // En Mode Réunion : rendre la main au déroulé de la réunion.
    if (G.onComplete) { const cb = G.onComplete; G.onComplete = null; return cb(ranked); }
    U().sfx.win();
    U().confetti(3200);
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title center", style: "text-align:center" }, ["🏆 Podium"]));

      const order = [1, 0, 2]; // 2e, 1er, 3e pour l'effet visuel
      const podium = h("div", { class: "podium" });
      order.forEach((rank) => {
        const t = ranked[rank];
        if (!t) return;
        const medals = ["🥇", "🥈", "🥉"];
        podium.appendChild(h("div", { class: "pod p" + (rank + 1) }, [
          h("div", { class: "medal" }, [medals[rank]]),
          h("div", { class: "pname" }, [t.name]),
          h("div", { class: "ppts" }, [t.score + " pts"])
        ]));
      });
      scr.appendChild(h("div", { class: "podium-wrap" }, [podium]));

      // classement complet
      const full = h("div", { class: "scoreboard mt" });
      ranked.forEach((t, i) => {
        full.appendChild(h("div", { class: "score-chip" }, [
          h("div", { class: "name" }, [`${i + 1}. ${t.name}`]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(full);

      // enregistrer au classement de la saison
      saveSeason(ranked);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: setup }, ["Play again"]),
        h("button", { class: "btn btn-ghost", onclick: U().goHome }, ["Home"])
      ]));
    }, { replace: true });
  }

  /* ================================================================
     4h) Mystery Object (Object Description) — Deviner un objet décrit
     en anglais grâce à des indices. Option de voir la traduction
     française avec une déduction de points (-20 pts).
     ================================================================ */
  const OBJ_DESC_BASE_POINTS = 100;
  const OBJ_DESC_HINT_PENALTY = 20;

  const OBJ_DESC_FALLBACK = [
    {
      word: "Smartphone", emoji: "📱", cat: "Technology",
      clues: ["Small electronic device in your pocket.", "Used for calling, messaging, and photos.", "Has a touch glass screen."],
      fr: "Téléphone portable", frClue: "Appareil électronique tactile pour téléphoner."
    },
    {
      word: "Umbrella", emoji: "☂️", cat: "Everyday Items",
      clues: ["Opens like a canopy over your head.", "Keeps you dry when walking in the rain.", "Folds up when dry."],
      fr: "Parapluie", frClue: "Accessoire pour se protéger de la pluie."
    }
  ];

  function objDescList() {
    const vocab = C().vocabulary;
    if (vocab && vocab.length) {
      const valid = vocab.filter((v) => v && v.en && (v.meaning || v.fr));
      if (valid.length) {
        return valid.map((v) => ({
          word: v.en,
          emoji: v.emoji || "❓",
          cat: v.cat || "Vocabulary",
          clues: v.meaning ? [v.meaning] : ["A word in English."],
          fr: v.fr || v.en,
          frClue: v.fr ? ("En français : " + v.fr) : ""
        }));
      }
    }
    return OBJ_DESC_FALLBACK;
  }

  function objectDescSetup() {
    let roundSec = 60;
    teamSetup({
      title: "🔍 Mystery Object — teams",
      subtitle: "One describer gets a secret word, hears its pronunciation, and describes it in English to their team!",
      hideTimer: true,
      note: "Each turn: one describer from the team looks at the TV alone (everyone else looks away!), hears the English pronunciation, then describes the object orally in English while their team guesses before time runs out. Need help? Reveal the French hint for a 20-point penalty.",
      extras: (scr, h) => {
        const pills = h("div", { class: "pill-group" });
        function renderDur() {
          pills.innerHTML = "";
          [["40s", 40], ["60s", 60], ["90s", 90], ["2 min", 120]].forEach(([label, val]) => {
            pills.appendChild(h("button", {
              class: "pill" + (roundSec === val ? " active" : ""),
              onclick: () => { roundSec = val; renderDur(); }
            }, [label]));
          });
        }
        renderDur();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Time to guess"]), pills])
        ]));
        return () => ({ roundSec: roundSec });
      },
      onStart: (teams, opts) => startObjectDesc(teams, opts)
    });
  }

  function startObjectDesc(teams, opts) {
    opts = opts || {};
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      roundSec: opts.roundSec || 60,
      onComplete: opts.onComplete || null,
      objDeck: U().newSessionDeck(objDescList(), "group_object_desc")
    };
    objectDescReady();
  }

  function objectDescEndBtn(h) {
    return h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"]);
  }

  function objectDescDraw() {
    return G.objDeck.draw(); // returns null when all unique items exhausted
  }

  function objectDescReady() {
    const team = G.teams[G.turn];
    const nextItem = objectDescDraw();
    if (!nextItem) {
      podium();
      return;
    }
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🔍 ", h("span", { class: "team" }, [team.name]), "'s turn"
      ]));
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "q" }, ["Choose one describer from " + team.name + "."]));
      card.appendChild(h("p", { class: "section-sub" }, ["When you're ready, reveal the secret word — everyone else, look away! 🙈"]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => objectDescReveal(nextItem) }, ["🔍 Reveal the word (describer only)"]),
        objectDescEndBtn(h)
      ]));
    });
  }

  function objectDescReveal(item) {
    const team = G.teams[G.turn];
    U().show((scr) => {
      const h = U().h;
      const card = h("div", { class: "gd-question obj-desc-card" });
      card.appendChild(h("div", { class: "topic-tag" }, ["🙈 " + team.name + " — describer only, others look away!"]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, [item.cat || "Vocabulary"]),
        (item.emoji ? item.emoji + " " : "") + item.word
      ]));
      card.appendChild(h("div", { class: "fr-sub mb-sm" }, ["🇫🇷 " + item.fr]));
      card.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "speaker", title: "Listen to pronunciation", onclick: () => U().speak(item.word) }, ["🔊 Listen"])
      ]));
      card.appendChild(h("p", { class: "section-sub mt" }, ["Got it? Start describing out loud in English — no mimes, no pointing, no saying the word!"]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => objectDescDescribing(item) }, ["🗣️ Start describing"]),
        h("button", { class: "btn btn-ghost", onclick: () => objectDescReveal(objectDescDraw()) }, ["🔀 Another word"]),
        objectDescEndBtn(h)
      ]));
    });
  }

  function objectDescDescribing(item) {
    const team = G.teams[G.turn];
    let remaining = G.roundSec, timer = null, done = false;
    let hintUsed = false;

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "🗣️ ", h("span", { class: "team" }, [team.name]), " — describe it in English!"
      ]));

      const card = h("div", { class: "gd-question obj-desc-card" });
      card.appendChild(h("div", { class: "topic-tag" }, ["Category: " + (item.cat || "Vocabulary") + "  ·  Potential: "]));

      const ptsBadge = h("span", { class: "worth-badge" }, ["100 pts"]);
      card.querySelector(".topic-tag").appendChild(ptsBadge);

      const bar = h("i");
      const chrono = h("div", { class: "chrono" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      card.appendChild(chrono); card.appendChild(chronoLabel);

      card.appendChild(h("p", { class: "section-sub" }, ["Describer: speak in English, no saying the secret word! Team: shout your guesses. (The word is hidden.)"]));

      // French Hint Container (hidden initially)
      const frHintBox = h("div", { class: "fr-hint-box hidden" });
      frHintBox.appendChild(h("div", { class: "fr-hint-title" }, ["🇫🇷 Indice en Français (-20 pts):"]));
      frHintBox.appendChild(h("div", { class: "fr-hint-content" }, [
        h("div", { class: "fr-hint-word" }, ["Traduction : " + item.fr])
      ]));
      card.appendChild(frHintBox);

      // Button to show French Translation Hint
      const hintBtn = h("button", {
        class: "btn btn-hint mt",
        onclick: () => {
          if (hintUsed) return;
          hintUsed = true;
          frHintBox.classList.remove("hidden");
          hintBtn.disabled = true;
          hintBtn.innerHTML = "🇫🇷 Traduction affichée (-20 pts)";
          ptsBadge.textContent = (OBJ_DESC_BASE_POINTS - OBJ_DESC_HINT_PENALTY) + " pts";
          winBtn.textContent = "✅ Guessed! (+" + (OBJ_DESC_BASE_POINTS - OBJ_DESC_HINT_PENALTY) + " pts)";
          U().sfx.gift();
        }
      }, ["🇫🇷 Voir la traduction en français (-20 pts)"]);
      card.appendChild(hintBtn);

      const winBtn = h("button", { class: "btn btn-green", onclick: () => win() }, ["✅ Guessed! (+" + OBJ_DESC_BASE_POINTS + " pts)"]);
      const panel = h("div", { class: "ref-panel mt" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — did " + team.name + " guess the object?"]));
      panel.appendChild(h("div", { class: "award-grid" }, [
        winBtn,
        h("button", { class: "btn btn-red", onclick: () => lose() }, ["⏭️ Pass (0 pts)"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [objectDescEndBtn(h)]));

      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.roundSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) lose();
      }
      function stop() { if (timer) clearInterval(timer); }
      function win() {
        if (done) return; done = true; stop();
        const pts = hintUsed ? (OBJ_DESC_BASE_POINTS - OBJ_DESC_HINT_PENALTY) : OBJ_DESC_BASE_POINTS;
        team.score += pts;
        U().sfx.correct();
        objectDescResult(item, true, pts);
      }
      function lose() {
        if (done) return; done = true; stop();
        U().sfx.wrong();
        objectDescResult(item, false, 0);
      }
    });
  }

  function objectDescResult(item, guessed, ptsEarned) {
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, [guessed ? "✅ Guessed!" : "⏰ Time's up / Passed"]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, [guessed ? "+" + ptsEarned + " points" : "No points"]),
        "The word was: " + (item.emoji ? item.emoji + " " : "") + item.word + " (🇫🇷 " + item.fr + ")"
      ]));
      card.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "speaker", onclick: () => U().speak(item.word) }, ["🔊"])
      ]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => nextObjectDescTurn() }, ["▶ Next team"]),
        objectDescEndBtn(h)
      ]));
    }, { replace: true });
  }

  function nextObjectDescTurn() {
    G.turn = (G.turn + 1) % G.teams.length;
    objectDescReady();
  }

  /* -------------------------------------------------------------------
     DESCRIPTION CHALLENGE (Play in Group)
     ------------------------------------------------------------------- */
  function descriptionGameSetup() {
    let roundSec = 60;
    teamSetup({
      title: "💡 Description Challenge — teams",
      subtitle: "Listen to the oral description (or reveal text) and guess the secret word!",
      hideTimer: true,
      note: "Each turn: the audio description plays. Your team must guess the word! Text is hidden by default — revealing text causes a 20-point penalty.",
      extras: (scr, h) => {
        const pills = h("div", { class: "pill-group" });
        function renderDur() {
          pills.innerHTML = "";
          [["40s", 40], ["60s", 60], ["90s", 90], ["2 min", 120]].forEach(([label, val]) => {
            pills.appendChild(h("button", {
              class: "pill" + (roundSec === val ? " active" : ""),
              onclick: () => { roundSec = val; renderDur(); }
            }, [label]));
          });
        }
        renderDur();
        scr.appendChild(h("div", { class: "setup-opts" }, [
          h("div", {}, [h("div", { class: "section-sub" }, ["Time to guess"]), pills])
        ]));
        return () => ({ roundSec: roundSec });
      },
      onStart: (teams, opts) => startDescriptionGame(teams, opts)
    });
  }

  function startDescriptionGame(teams, opts) {
    opts = opts || {};
    const items = (C().descriptionGame || []);
    G = {
      teams: teams.map((t) => ({ name: t.name, score: t.score || 0 })),
      turn: 0,
      roundSec: opts.roundSec || 60,
      deck: U().newSessionDeck(items, "group_description_game")
    };
    descriptionGameReady();
  }

  function descriptionGameEndBtn(h) {
    return h("button", { class: "btn btn-ghost", onclick: () => U().confirmBox("End the game and see the podium?", podium) }, ["🏁 End game"]);
  }

  function descriptionGameReady() {
    const team = G.teams[G.turn];
    const item = G.deck.draw();
    if (!item) {
      podium();
      return;
    }

    let remaining = G.roundSec, timer = null, done = false;
    let hintUsed = false;
    const basePts = 50;

    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      scr.appendChild(h("div", { class: "turn-banner" }, [
        "💡 ", h("span", { class: "team" }, [team.name]), "'s turn — Description Challenge"
      ]));

      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, [
        (item.emoji || "💡") + " Topic: " + (item.topic || "General") + " (" + (item.difficulty || "medium") + ")"
      ]));

      const ptsBadge = h("span", { class: "worth-badge mt-sm" }, [basePts + " pts"]);
      card.appendChild(ptsBadge);

      const bar = h("i");
      const chrono = h("div", { class: "chrono mt" }, [bar]);
      const chronoLabel = h("div", { class: "chrono-label center row", style: "justify-content:center" }, [Math.ceil(remaining) + "s"]);
      card.appendChild(chrono); card.appendChild(chronoLabel);

      // Audio Speed Controls
      const audioRow = h("div", { class: "row center mt", style: "gap:8px;flex-wrap:wrap;" }, [
        h("button", {
          class: "btn btn-primary",
          style: "background:linear-gradient(135deg, #8e44ad, #3498db);border:none;font-size:1rem;padding:10px 16px;",
          onclick: () => U().speak(item.description, { rate: 0.85 })
        }, ["🔊 Listen (Normal)"]),
        h("button", {
          class: "btn btn-ghost",
          style: "font-size:0.95rem;padding:10px 14px;border:1px solid var(--line);",
          onclick: () => U().speak(item.description, { rate: 0.6 })
        }, ["🐢 Slow (0.6x)"]),
        h("button", {
          class: "btn btn-ghost",
          style: "font-size:0.95rem;padding:10px 14px;border:1px solid var(--line);",
          onclick: () => U().speak(item.description, { rate: 0.45 })
        }, ["🐢 Very Slow (0.45x)"])
      ]);
      card.appendChild(audioRow);

      // Hidden Text Box
      const descTextHolder = h("div", {
        class: "section-note mt",
        style: "font-size:1.1rem;line-height:1.6;background:rgba(0,0,0,0.3);padding:16px;border-radius:12px;border:1px dashed var(--line);"
      }, ["🔒 Text description is hidden. Listen to the audio or click reveal below."]);
      card.appendChild(descTextHolder);

      // Reveal Button
      const revealBtn = h("button", {
        class: "btn btn-hint mt",
        style: "background:rgba(241,196,15,0.2);border:1px solid #f1c40f;color:#f1c40f;",
        onclick: () => {
          if (hintUsed) return;
          hintUsed = true;
          descTextHolder.textContent = "📖 " + item.description;
          descTextHolder.style.border = "1px solid #f1c40f";
          revealBtn.disabled = true;
          revealBtn.textContent = "👁️ Text Revealed (-20 pts penalty)";
          ptsBadge.textContent = (basePts - 20) + " pts";
          winBtn.textContent = "✅ Guessed! (+" + (basePts - 20) + " pts)";
        }
      }, ["👁️ Reveal Text (-20 pts Penalty)"]);
      card.appendChild(revealBtn);

      // MCQ Options Display for Team / Referee
      if (item.options && item.options.length) {
        card.appendChild(h("div", { class: "section-sub mt-lg", style: "font-weight:700;" }, ["Options (QCM):"]));
        const choiceGrid = h("div", { class: "pill-group mt" });
        item.options.forEach((opt) => {
          choiceGrid.appendChild(h("button", {
            class: "pill active",
            style: "padding:8px 16px;font-size:1.05rem;",
            onclick: () => {
              if (opt.toLowerCase() === item.answer.toLowerCase()) win();
              else lose();
            }
          }, [opt]));
        });
        card.appendChild(choiceGrid);
      }

      // Referee Panel
      const winBtn = h("button", { class: "btn btn-green", onclick: () => win() }, ["✅ Guessed! (+" + basePts + " pts)"]);
      const panel = h("div", { class: "ref-panel mt-lg" });
      panel.appendChild(h("div", { class: "label" }, ["Referee — Answer: " + item.answer]));
      panel.appendChild(h("div", { class: "award-grid" }, [
        winBtn,
        h("button", { class: "btn btn-red", onclick: () => lose() }, ["⏭️ Pass (0 pts)"])
      ]));
      card.appendChild(panel);
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [descriptionGameEndBtn(h)]));

      // Auto play speech description on load
      setTimeout(() => {
        try { U().speak(item.description); } catch (e) {}
      }, 400);

      timer = setInterval(tick, 100);

      function tick() {
        if (bar.isConnected === false) { clearInterval(timer); return; }
        remaining -= 0.1;
        bar.style.width = Math.max(0, (remaining / G.roundSec) * 100) + "%";
        chronoLabel.textContent = Math.max(0, Math.ceil(remaining)) + "s";
        if (remaining <= 5 && remaining > 0) U().sfx.tick();
        if (remaining <= 0) lose();
      }
      function stop() { if (timer) clearInterval(timer); }
      function win() {
        if (done) return; done = true; stop();
        const pts = hintUsed ? (basePts - 20) : basePts;
        team.score += pts;
        U().sfx.correct();
        descriptionGameResult(item, true, pts);
      }
      function lose() {
        if (done) return; done = true; stop();
        U().sfx.wrong();
        descriptionGameResult(item, false, 0);
      }
    });
  }

  function descriptionGameResult(item, guessed, ptsEarned) {
    U().show((scr) => {
      const h = U().h;
      scoreboard(scr);
      const card = h("div", { class: "gd-question" });
      card.appendChild(h("div", { class: "topic-tag" }, [guessed ? "✅ Guessed!" : "⏰ Time's up / Passed"]));
      card.appendChild(h("div", { class: "wheel-challenge" }, [
        h("span", { class: "tag" }, [guessed ? "+" + ptsEarned + " points" : "No points"]),
        "The answer was: " + (item.emoji ? item.emoji + " " : "") + item.answer
      ]));
      card.appendChild(h("p", { class: "section-sub mt" }, [item.description]));
      card.appendChild(h("div", { class: "row center mt" }, [
        h("button", { class: "speaker", onclick: () => U().speak(item.answer) }, ["🔊 Speak Answer"])
      ]));
      scr.appendChild(card);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => nextDescriptionGameTurn() }, ["▶ Next team turn"]),
        descriptionGameEndBtn(h)
      ]));
    }, { replace: true });
  }

  function nextDescriptionGameTurn() {
    G.turn = (G.turn + 1) % G.teams.length;
    descriptionGameReady();
  }

  /* ---------- Classement de la saison (stocké localement) ---------- */
  function saveSeason(ranked) {
    const season = U().store.get("season", {});
    ranked.forEach((t, i) => {
      const rec = season[t.name] || { wins: 0, points: 0, games: 0 };
      rec.games += 1;
      rec.points += t.score;
      if (i === 0) rec.wins += 1;
      season[t.name] = rec;
    });
    U().store.set("season", season);
  }

  return { menu, setup, spellingBeeSetup, pronounceSetup, anagramSetup, grammarSetup, irregularSetup, phrasalSetup, tvVocabSetup, wordChainSetup, wheelSetup, charadesSetup, wordFromWordSetup, wordBuilderSetup, alphabetRaceSetup, objectDescSetup, descriptionGameSetup, podium, start };
})();

