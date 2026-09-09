/* =====================================================================
   meeting.js — Meeting Mode: hosts a whole club session, stage by
   stage, with one team list and cumulative scores.
   Stages: Warm-up → The Big Challenge → Speaking game → Review → Podium
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.meeting = (function () {
  const U = () => CAA.util;
  const C = () => CAA.content;

  // fallback if imported content has no "speakingPrompts" yet
  const FALLBACK_PROMPTS = [
    { prompt: "Introduce yourself in English" },
    { prompt: "Name 5 animals in English" },
    { prompt: "Describe your family" },
    { prompt: "Count from 1 to 20" },
    { prompt: "Name 5 kinds of food" },
    { prompt: "Describe the weather today" }
  ];

  const STAGES = [
    { id: "warmup",    emoji: "", title: "Warm-up" },
    { id: "granddefi", emoji: "", title: "The Big Challenge" },
    { id: "speaking",  emoji: "", title: "Speaking game" },
    { id: "review",    emoji: "", title: "Word review" }
  ];

  let M = null;

  /* ================================================================
     Meeting setup
     ================================================================ */
  function setup() {
    const names = ["Team A", "Team B"];
    const enabled = { warmup: true, granddefi: true, speaking: true, review: true };

    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["Meeting Mode"]));
      scr.appendChild(h("p", { class: "section-sub" }, [
        "The app hosts the whole session, stage by stage. Set up the teams and choose the programme."
      ]));

      // teams
      const list = h("div");
      function renderTeams() {
        list.innerHTML = "";
        names.forEach((nm, idx) => {
          list.appendChild(h("div", { class: "team-input-row" }, [
            h("input", { type: "text", value: nm, placeholder: `Team ${idx + 1}`,
              oninput: (e) => (names[idx] = e.target.value) }),
            names.length > 2
              ? h("button", { class: "btn btn-ghost", onclick: () => { names.splice(idx, 1); renderTeams(); } }, ["✕"])
              : null
          ]));
        });
      }
      renderTeams();
      scr.appendChild(h("h3", { class: "section-title", style: "font-size:1.15rem" }, ["Teams"]));
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row" }, [
        names.length < 6
          ? h("button", { class: "btn btn-ghost", onclick: () => { names.push(""); renderTeams(); } }, ["+ Add a team"])
          : null
      ]));

      // programme (stages)
      scr.appendChild(h("h3", { class: "section-title", style: "font-size:1.15rem;margin-top:22px" }, ["Session programme"]));
      const prog = h("div", { class: "editor-list" });
      STAGES.forEach((st) => {
        prog.appendChild(h("label", { class: "list-item", style: "cursor:pointer" }, [
          h("input", { type: "checkbox", checked: enabled[st.id] ? "" : null, style: "width:auto;transform:scale(1.3);accent-color:var(--brand)",
            onchange: (e) => (enabled[st.id] = e.target.checked) }),
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [st.title]),
            h("div", { class: "muted" }, [stageHint(st.id)])
          ])
        ]));
      });
      prog.appendChild(h("div", { class: "list-item" }, [
        h("div", { class: "grow" }, [h("div", { class: "strong" }, ["Podium"]), h("div", { class: "muted" }, ["Final ranking + celebration (always at the end)"])])
      ]));
      scr.appendChild(prog);

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => {
          const teams = names.map((n) => n.trim()).filter(Boolean).map((n) => ({ name: n, score: 0 }));
          if (teams.length < 2) { U().alertBox("Add at least 2 teams."); return; }
          const stages = STAGES.filter((s) => enabled[s.id]).map((s) => s.id);
          M = { teams, stages, idx: 0, reviewWords: [] };
          runStage();
        } }, ["Start the meeting"])
      ]));
    });
  }

  function stageHint(id) {
    return {
      warmup: "A few words to warm up (with pronunciation)",
      granddefi: "The big team game (questions, timer, points)",
      speaking: "Speaking cards, with bonus points",
      review: "We go over the words of the session together"
    }[id];
  }

  /* ================================================================
     Flow
     ================================================================ */
  function runStage() {
    if (!M || M.idx >= M.stages.length) return finalPodium();
    const id = M.stages[M.idx];
    if (id === "warmup") warmup();
    else if (id === "granddefi") grandDefi();
    else if (id === "speaking") speaking();
    else if (id === "review") review();
    else nextStage();
  }
  function nextStage() { M.idx++; runStage(); }

  // shared progress banner
  function header(scr, current) {
    const h = U().h;
    const total = M.stages.length + 1; // + podium
    scr.appendChild(h("div", { class: "hud" }, [
      h("span", {}, ["🗓️ Meeting"]),
      h("span", {}, ["Stage ", h("b", {}, [String(M.idx + 1), " / ", String(total)]), " — ", current])
    ]));
    scr.appendChild(h("div", { class: "progress" }, [h("i", { style: `width:${((M.idx) / total) * 100}%` })]));
  }

  function scoreboard(scr) {
    const h = U().h;
    const sb = h("div", { class: "scoreboard" });
    M.teams.forEach((t) => {
      sb.appendChild(h("div", { class: "score-chip" }, [
        h("div", { class: "name" }, [t.name]),
        h("div", { class: "pts" }, [String(t.score)])
      ]));
    });
    scr.appendChild(sb);
  }

  /* ---------------- Stage: Warm-up (flashcards) ---------------- */
  function warmup() {
    const deck = U().newSessionDeck(C().vocabulary, "meeting_warmup");
    const words = deck.draw(Math.min(8, (C().vocabulary || []).length));
    M.reviewWords = words;
    let i = 0;

    function render() {
      U().show((scr) => {
        const h = U().h;
        header(scr, "🔥 Warm-up");
        const w = words[i];
        const card = h("div", { class: "play-card" }, [
          h("p", { class: "section-sub" }, ["Say it together out loud:"]),
          h("div", { class: "prompt-emoji" }, [w.emoji]),
          h("div", { class: "prompt-word" }, [
            w.en,
            h("button", { class: "speaker", title: "Listen", onclick: () => U().speak(w.en) }, ["🔊"])
          ]),
          h("div", { class: "row center mt-lg" }, [
            i > 0 ? h("button", { class: "btn btn-ghost", onclick: () => { i--; render(); } }, ["← Previous"]) : null,
            i < words.length - 1
              ? h("button", { class: "btn btn-primary", onclick: () => { i++; render(); } }, ["Next word →"])
              : h("button", { class: "btn btn-primary", onclick: nextStage }, ["Next stage ✓"])
          ]),
          h("p", { class: "note" }, [`Word ${i + 1} / ${words.length}`])
        ]);
        scr.appendChild(card);
      });
      U().speak(words[i].en);
    }
    render();
  }

  /* ---------------- Stage: The Big Challenge ---------------- */
  function grandDefi() {
    // launch the group game with our teams; it hands control back when done
    CAA.group.start(M.teams, {
      timerOn: true,
      phaseSec: 12,
      onComplete: (ranked) => {
        // copy the scores back onto the meeting teams (by name)
        ranked.forEach((r) => {
          const t = M.teams.find((x) => x.name === r.name);
          if (t) t.score = r.score;
        });
        nextStage();
      }
    });
  }

  /* ---------------- Stage: Speaking game ---------------- */
  function speaking() {
    const src = (C().speakingPrompts && C().speakingPrompts.length) ? C().speakingPrompts : FALLBACK_PROMPTS;
    const deck = U().newSessionDeck(src, "meeting_speaking");
    const prompts = deck.draw(Math.min(6, src.length));
    let i = 0;

    function render() {
      U().show((scr) => {
        const h = U().h;
        header(scr, "🗣️ Speaking game");
        scoreboard(scr);
        const p = prompts[i];
        const card = h("div", { class: "gd-question" }, [
          h("div", { class: "topic-tag" }, ["Card " + (i + 1) + " / " + prompts.length]),
          h("div", { class: "q" }, [p.prompt]),
          h("div", { class: "section-sub" }, [
            h("button", { class: "speaker", title: "Listen", onclick: () => U().speak(p.prompt) }, ["🔊"])
          ])
        ]);

        // participation bonus points
        const panel = h("div", { class: "ref-panel" }, [
          h("div", { class: "label" }, ["Referee — participation bonus points:"])
        ]);
        const awards = h("div", { class: "award-grid" });
        M.teams.forEach((t) => {
          awards.appendChild(h("button", { class: "btn btn-ghost", onclick: () => { t.score += 2; render(); } }, ["➕2 " + t.name]));
        });
        panel.appendChild(awards);
        card.appendChild(panel);

        card.appendChild(h("div", { class: "row center mt-lg" }, [
          i > 0 ? h("button", { class: "btn btn-ghost", onclick: () => { i--; render(); } }, ["← Previous"]) : null,
          i < prompts.length - 1
            ? h("button", { class: "btn btn-primary", onclick: () => { i++; render(); } }, ["Next card →"])
            : h("button", { class: "btn btn-primary", onclick: nextStage }, ["Next stage ✓"])
        ]));
        scr.appendChild(card);
      });
    }
    render();
  }

  /* ---------------- Stage: Word review ---------------- */
  function review() {
    const words = (M.reviewWords && M.reviewWords.length)
      ? M.reviewWords
      : U().newSessionDeck(C().vocabulary, "meeting_review").draw(Math.min(8, (C().vocabulary || []).length));
    U().show((scr) => {
      const h = U().h;
      header(scr, "📚 Word review");
      scr.appendChild(h("p", { class: "section-sub" }, ["Let's go over the words of the session. Tap 🔊 to hear them again."]));
      const grid = h("div", { class: "options" });
      words.forEach((w) => {
        grid.appendChild(h("button", { class: "opt", onclick: () => U().speak(w.en) }, [
          w.emoji + " " + w.en + "  🔊"
        ]));
      });
      scr.appendChild(grid);
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: nextStage }, ["Go to the podium 🥇"])
      ]));
    });
  }

  /* ---------------- Final podium ---------------- */
  function finalPodium() {
    const ranked = M.teams.slice().sort((a, b) => b.score - a.score);
    U().sfx.win();
    U().confetti(3200);
    saveSeason(ranked);
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title", style: "text-align:center" }, ["🥇 End of the meeting — Podium"]));

      const order = [1, 0, 2];
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

      const full = h("div", { class: "scoreboard mt" });
      ranked.forEach((t, i) => {
        full.appendChild(h("div", { class: "score-chip" }, [
          h("div", { class: "name" }, [`${i + 1}. ${t.name}`]),
          h("div", { class: "pts" }, [String(t.score)])
        ]));
      });
      scr.appendChild(full);

      scr.appendChild(h("p", { class: "note" }, ["Well done to all the teams! 👏"]));
      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: setup }, ["New meeting"]),
        h("button", { class: "btn btn-ghost", onclick: U().goHome }, ["Home"])
      ]));
    }, { replace: true });
  }

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

  return { setup };
})();
