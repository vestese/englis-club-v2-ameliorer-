/* =====================================================================
   editor.js — Visual content editor (no coding needed)
   Edits: Grand Défi, Vocabulary, Grammar, Anagrams, Charades,
          Spelling Words, Gages, Wheel Challenges, Speaking Prompts, Gifts.
   Import: JSON (merge, preview), .txt (line-by-line, target selector),
           PDF (via js/vendor/pdf.min.js).
   RULE: import = ADD only, never overwrite/delete existing data.
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.editor = (function () {
  const U = () => CAA.util;
  const C = () => CAA.content;

  function save() { U().store.set("content", C()); }

  /* ================================================================
     Editor menu
     ================================================================   function menu() {
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["Manage content"]));
      scr.appendChild(h("p", { class: "section-sub" }, [
        "Add or edit words and questions — no coding needed."
      ]));

      const cards = [
        { t: "The Big Challenge", s: "Topics & questions", go: gdTopics },
        { t: "Vocabulary", s: "Words, emojis & categories", go: vocabList },
        { t: "Grammar", s: "Fill-in-the-blank sentences", go: grammarList },
        { t: "Phrasal Verbs", s: "Verb + meaning questions", go: phrasalList },
        { t: "Anagrams", s: "Words to unscramble", go: anagramList },
        { t: "Spelling Words", s: "Tiered spelling challenge", go: spellingList },
        { t: "Charades", s: "Words & categories to mime", go: charadesList },
        { t: "Gages", s: "Forfeits & challenges", go: gagesList },
        { t: "Wheel Challenges", s: "Spin-the-wheel tasks", go: wheelList },
        { t: "Speaking Prompts", s: "Conversation starter cards", go: promptsList },
        { t: "Mystery Gifts", s: "Surprise effects on the board", go: giftsList }
      ];
      const grid = h("div", { class: "editor-cards" });
      cards.forEach((c) => {
        grid.appendChild(h("div", { class: "choice", onclick: c.go }, [
          h("h4", {}, [c.t]),
          h("small", {}, [c.s])
        ]));
      });
      scr.appendChild(grid);

      /* ---- Import toolbar ---- */
      scr.appendChild(h("h3", { class: "section-title", style: "font-size:1.2rem;margin-top:30px" }, ["Import content"]));
      const jsonInput = h("input", {
        type: "file", accept: ".json,application/json", class: "hidden-file",
        onchange: (e) => importJSONFile(e.target.files[0])
      });
      const txtInput = h("input", {
        type: "file", accept: ".txt,text/plain", class: "hidden-file",
        onchange: (e) => importTXTFile(e.target.files[0])
      });
      const pdfInput = h("input", {
        type: "file", accept: ".pdf,application/pdf", class: "hidden-file",
        onchange: (e) => importPDFFile(e.target.files[0])
      });

      scr.appendChild(h("div", { class: "editor-toolbar" }, [
        h("button", { class: "btn btn-ghost", onclick: () => jsonInput.click() }, ["Import JSON pack"]),
        h("button", { class: "btn btn-ghost", onclick: () => txtInput.click() }, ["Import .txt file"]),
        h("button", { class: "btn btn-ghost", onclick: () => pdfInput.click() }, ["Import PDF"]),
        jsonInput, txtInput, pdfInput
      ]));

      /* ---- Save toolbar ---- */
      scr.appendChild(h("h3", { class: "section-title", style: "font-size:1.2rem;margin-top:24px" }, ["Save & share"]));
      scr.appendChild(h("div", { class: "editor-toolbar" }, [
        h("button", { class: "btn btn-ghost", onclick: exportJSON }, ["Export pack (.json)"]),
        h("button", { class: "btn btn-ghost", onclick: downloadContentJS }, ["Make permanent (content.js)"]),
        h("button", { class: "btn btn-ghost", onclick: resetDefault }, ["Reset to defaults"])
      ]));
      scr.appendChild(h("p", { class: "save-hint" }, [
        "Your changes are saved automatically in this browser. ",
        "Use \"Export\" or \"Make permanent\" to keep them across devices."
      ]));
    });
  }

  /* ================================================================
     THE BIG CHALLENGE
     ================================================================ */
  function gdTopics() {
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🏆 The Big Challenge — topics"]));
      scr.appendChild(h("p", { class: "section-sub" }, ["Choose a topic to edit, or add one."]));
      const list = h("div", { class: "editor-list" });
      C().grandDefi.forEach((t, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [t.emoji + " " + t.topic]),
            h("div", { class: "muted" }, [t.questions.length + " question(s)"])
          ]),
          h("button", { class: "icon-btn", onclick: () => gdQuestions(idx) }, ["✏️ Questions"]),
          h("button", { class: "icon-btn", onclick: () => gdTopicForm(idx) }, ["Rename"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete the topic "${t.topic}" and its questions?`, () => {
                C().grandDefi.splice(idx, 1); save(); gdTopics();
              });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => gdTopicForm(null) }, ["➕ New topic"])
      ]));
    });
  }

  function gdTopicForm(idx) {
    const isNew = idx === null;
    const t = isNew ? { topic: "", emoji: "⭐", questions: [] } : C().grandDefi[idx];
    let name = t.topic, emoji = t.emoji;
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New topic" : "Rename topic"]));
      const card = h("div", { class: "form-card" }, [
        field("Topic name", textInput(name, (v) => (name = v))),
        field("Emoji (icon)", textInput(emoji, (v) => (emoji = v))),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!name.trim()) { U().alertBox("Give the topic a name."); return; }
              if (isNew) C().grandDefi.push({ topic: name.trim(), emoji: emoji.trim() || "⭐", questions: [] });
              else { t.topic = name.trim(); t.emoji = emoji.trim() || "⭐"; }
              save(); gdTopics();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: gdTopics }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  function gdQuestions(topicIdx) {
    const topic = C().grandDefi[topicIdx];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [topic.emoji + " " + topic.topic]));
      scr.appendChild(h("p", { class: "section-sub" }, ["Questions sorted by points. 🎁 = mystery gift cell."]));
      const sorted = topic.questions.map((q, i) => ({ q, i })).sort((a, b) => a.q.points - b.q.points);
      const list = h("div", { class: "editor-list" });
      sorted.forEach(({ q, i }) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("span", { class: "pts-badge" }, [String(q.points)]),
          q.gift ? h("span", { class: "gift-badge" }, ["🎁"]) : null,
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [q.q]),
            h("div", { class: "muted" }, ["Answer: " + q.answer])
          ]),
          h("button", { class: "icon-btn", onclick: () => gdQuestionForm(topicIdx, i) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox("Delete this question?", () => { topic.questions.splice(i, 1); save(); gdQuestions(topicIdx); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        topic.questions.length < 20
          ? h("button", { class: "btn btn-primary", onclick: () => gdQuestionForm(topicIdx, null) }, ["➕ New question"])
          : h("p", { class: "note" }, ["This topic already has 20 questions (maximum)."])
      ]));
    });
  }

  function gdQuestionForm(topicIdx, qIdx) {
    const topic = C().grandDefi[topicIdx];
    const isNew = qIdx === null;
    const src = isNew
      ? { q: "", choices: ["", "", ""], answer: "", points: nextFreePoints(topic), gift: false }
      : U().clone(topic.questions[qIdx]);
    let qText = src.q;
    let choices = src.choices.slice();
    let correctIdx = Math.max(0, choices.indexOf(src.answer));
    let points = src.points;
    let gift = !!src.gift;

    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New question" : "Edit question"]));
      const card = h("div", { class: "form-card" });
      card.appendChild(field("Question", textArea(qText, (v) => (qText = v))));
      const choicesWrap = h("div");
      function renderChoices() {
        choicesWrap.innerHTML = "";
        choicesWrap.appendChild(h("label", { style: "color:var(--muted);font-weight:600;font-size:.9rem" }, ["Answers (tick the correct one)"]));
        choices.forEach((c, i) => {
          const row = h("div", { class: "choice-edit" }, [
            h("label", { class: "radio-lbl" }, [
              h("input", {
                type: "radio", name: "correct", checked: correctIdx === i ? "" : null,
                onchange: () => (correctIdx = i)
              }),
              "correct"
            ]),
            h("input", {
              type: "text", value: c, placeholder: "Answer " + (i + 1),
              oninput: (e) => (choices[i] = e.target.value)
            }),
            choices.length > 2
              ? h("button", {
                class: "icon-btn danger", onclick: () => {
                  choices.splice(i, 1);
                  if (correctIdx >= choices.length) correctIdx = 0;
                  renderChoices();
                }
              }, ["✕"])
              : null
          ]);
          choicesWrap.appendChild(row);
        });
        if (choices.length < 4) {
          choicesWrap.appendChild(h("button", { class: "icon-btn", onclick: () => { choices.push(""); renderChoices(); } }, ["➕ Add an answer"]));
        }
      }
      renderChoices();
      card.appendChild(h("div", { class: "form-row" }, [choicesWrap]));
      const sel = h("select", { onchange: (e) => (points = parseInt(e.target.value, 10)) });
      const taken = topic.questions.filter((_, i) => i !== qIdx).map((q) => q.points);
      for (let p = 100; p <= 2000; p += 100) {
        if (taken.indexOf(p) !== -1 && p !== points) continue;
        sel.appendChild(h("option", { value: String(p), selected: p === points ? "" : null }, [String(p) + " points"]));
      }
      card.appendChild(field("Value (points)", sel));
      card.appendChild(h("div", { class: "chk-row" }, [
        h("input", { type: "checkbox", id: "giftchk", checked: gift ? "" : null, onchange: (e) => (gift = e.target.checked) }),
        h("label", { for: "giftchk" }, ["🎁 Mystery gift cell"])
      ]));
      card.appendChild(h("div", { class: "row mt" }, [
        h("button", { class: "btn btn-primary", onclick: submit }, ["Save"]),
        h("button", { class: "btn btn-ghost", onclick: () => gdQuestions(topicIdx) }, ["Cancel"])
      ]));
      scr.appendChild(card);
      function submit() {
        const cleanChoices = choices.map((c) => c.trim()).filter(Boolean);
        if (!qText.trim()) return U().alertBox("Write the question.");
        if (cleanChoices.length < 2) return U().alertBox("You need at least 2 answers.");
        if (correctIdx >= choices.length || !choices[correctIdx].trim())
          return U().alertBox("Tick a correct answer (not empty).");
        const answer = choices[correctIdx].trim();
        const rec = { q: qText.trim(), choices: cleanChoices, answer: answer, points: points };
        if (gift) rec.gift = true;
        if (isNew) topic.questions.push(rec);
        else topic.questions[qIdx] = rec;
        save(); gdQuestions(topicIdx);
      }
    });
  }

  function nextFreePoints(topic) {
    const taken = topic.questions.map((q) => q.points);
    for (let p = 100; p <= 2000; p += 100) if (taken.indexOf(p) === -1) return p;
    return 100;
  }

  /* ================================================================
     VOCABULARY
     ================================================================ */
  function vocabList() {
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🧩 Vocabulary"]));
      scr.appendChild(h("p", { class: "section-sub" }, [C().vocabulary.length + " word(s)."]));
      const list = h("div", { class: "editor-list" });
      C().vocabulary.forEach((w, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("span", { class: "pts-badge" }, [w.emoji]),
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [w.en]),
            h("div", { class: "muted" }, [w.cat || ""])
          ]),
          h("button", { class: "icon-btn", onclick: () => vocabForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete "${w.en}"?`, () => { C().vocabulary.splice(idx, 1); save(); vocabList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => vocabForm(null) }, ["➕ New word"])
      ]));
    });
  }

  function vocabForm(idx) {
    const isNew = idx === null;
    const w = isNew ? { en: "", emoji: "⭐", cat: "", level: "easy", fr: "", meaning: "" } : U().clone(C().vocabulary[idx]);
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New word" : "Edit word"]));
      const levelSel = h("select", { onchange: (e) => (w.level = e.target.value) });
      ["beginner", "easy", "medium"].forEach((lv) => {
        levelSel.appendChild(h("option", { value: lv, selected: (w.level || "easy") === lv ? "" : null }, [lv]));
      });
      const card = h("div", { class: "form-card" }, [
        field("English word", textInput(w.en, (v) => (w.en = v))),
        field("Emoji", textInput(w.emoji, (v) => (w.emoji = v))),
        field("Category (e.g. food, family)", textInput(w.cat, (v) => (w.cat = v))),
        field("Level", levelSel),
        field("French translation", textInput(w.fr || "", (v) => (w.fr = v))),
        field("Simple meaning (A1/A2 definition)", textInput(w.meaning || "", (v) => (w.meaning = v))),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!w.en.trim()) return U().alertBox("Fill in the word.");
              const rec = {
                en: w.en.trim(), emoji: (w.emoji || "⭐").trim(), cat: (w.cat || "").trim(),
                level: w.level || "easy", fr: (w.fr || "").trim(), meaning: (w.meaning || "").trim()
              };
              if (isNew) C().vocabulary.push(rec); else C().vocabulary[idx] = rec;
              save(); vocabList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: vocabList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     IRREGULAR VERBS
     ================================================================ */
  function irregularList() {
    const arr = C().irregularVerbs || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🔁 Irregular Verbs"]));
      scr.appendChild(h("p", { class: "section-sub" }, [arr.length + " verb(s)." ]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((item, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [item.verb]),
            h("div", { class: "muted" }, ["past: " + (item.past || "") + " · participle: " + (item.participle || "")])
          ]),
          h("button", { class: "icon-btn", onclick: () => irregularForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete "${item.verb}"?`, () => { arr.splice(idx, 1); save(); irregularList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => irregularForm(null) }, ["➕ New irregular verb"])
      ]));
    });
  }

  function irregularForm(idx) {
    const isNew = idx === null;
    const arr = C().irregularVerbs || [];
    const src = isNew ? { verb: "", past: "", participle: "", meaning: "", fr: "" } : U().clone(arr[idx]);
    let verb = src.verb || "";
    let past = src.past || "";
    let participle = src.participle || "";
    let meaning = src.meaning || "";
    let fr = src.fr || "";
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New irregular verb" : "Edit irregular verb"]));
      const card = h("div", { class: "form-card" }, [
        field("Base verb", textInput(verb, (v) => (verb = v))),
        field("Past simple", textInput(past, (v) => (past = v))),
        field("Past participle", textInput(participle, (v) => (participle = v))),
        field("Meaning in English", textInput(meaning, (v) => (meaning = v))),
        field("Meaning in French", textInput(fr, (v) => (fr = v))),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!verb.trim()) return U().alertBox("Enter the verb.");
              if (!past.trim() || !participle.trim()) return U().alertBox("Add the past simple and past participle.");
              if (!C().irregularVerbs) C().irregularVerbs = [];
              const rec = { verb: verb.trim(), past: past.trim(), participle: participle.trim(), meaning: meaning.trim(), fr: fr.trim() };
              if (isNew) C().irregularVerbs.push(rec); else C().irregularVerbs[idx] = rec;
              save(); irregularList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: irregularList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     PHRASAL VERBS
     ================================================================ */
  function phrasalList() {
    const arr = C().phrasalVerbs || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🔗 Phrasal Verbs"]));
      scr.appendChild(h("p", { class: "section-sub" }, [arr.length + " item(s). Match the verb to its meaning."]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((item, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [item.verb]),
            h("div", { class: "muted" }, [item.meaning || item.fr || ""])
          ]),
          h("button", { class: "icon-btn", onclick: () => phrasalForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete "${item.verb}"?`, () => { arr.splice(idx, 1); save(); phrasalList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => phrasalForm(null) }, ["➕ New phrasal verb"])
      ]));
    });
  }

  function phrasalForm(idx) {
    const isNew = idx === null;
    const arr = C().phrasalVerbs || [];
    const src = isNew ? { verb: "", meaning: "", fr: "" } : U().clone(arr[idx]);
    let verb = src.verb || "";
    let meaning = src.meaning || "";
    let fr = src.fr || "";
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New phrasal verb" : "Edit phrasal verb"]));
      const card = h("div", { class: "form-card" }, [
        field("Verb / expression", textInput(verb, (v) => (verb = v))),
        field("Meaning in English", textInput(meaning, (v) => (meaning = v))),
        field("Meaning in French", textInput(fr, (v) => (fr = v))),
        h("p", { class: "save-hint", style: "text-align:left" }, ["Example: \"look after\" · \"To take care of someone\" · \"S'occuper de\""]),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!verb.trim()) return U().alertBox("Enter the phrasal verb.");
              if (!meaning.trim() && !fr.trim()) return U().alertBox("Add at least one meaning (EN or FR).");
              if (!C().phrasalVerbs) C().phrasalVerbs = [];
              const rec = { verb: verb.trim(), meaning: meaning.trim(), fr: fr.trim() };
              if (isNew) C().phrasalVerbs.push(rec); else C().phrasalVerbs[idx] = rec;
              save(); phrasalList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: phrasalList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     GRAMMAR
     ================================================================ */
  function grammarList() {
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["✍️ Grammar"]));
      scr.appendChild(h("p", { class: "section-sub" }, [
        C().grammar.length + " sentence(s). Use ___ for the blank to fill."
      ]));
      const list = h("div", { class: "editor-list" });
      C().grammar.forEach((g, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [g.sentence]),
            h("div", { class: "muted" }, ["Answer: " + g.answer + "  ·  " + (g.cat || "")])
          ]),
          h("button", { class: "icon-btn", onclick: () => grammarForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox("Delete this sentence?", () => { C().grammar.splice(idx, 1); save(); grammarList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => grammarForm(null) }, ["➕ New sentence"])
      ]));
    });
  }

  function grammarForm(idx) {
    const isNew = idx === null;
    const g = isNew
      ? { sentence: "", options: ["", "", ""], answer: "", cat: "", fr: "", meaning: "" }
      : U().clone(C().grammar[idx]);
    let options = g.options.slice();
    let correctIdx = Math.max(0, options.indexOf(g.answer));
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New sentence" : "Edit sentence"]));
      const card = h("div", { class: "form-card" });
      card.appendChild(field("Sentence (put ___ for the blank)", textInput(g.sentence, (v) => (g.sentence = v))));
      const optWrap = h("div");
      function renderOpts() {
        optWrap.innerHTML = "";
        optWrap.appendChild(h("label", { style: "color:var(--muted);font-weight:600;font-size:.9rem" }, ["Options (tick the correct one)"]));
        options.forEach((o, i) => {
          optWrap.appendChild(h("div", { class: "choice-edit" }, [
            h("label", { class: "radio-lbl" }, [
              h("input", { type: "radio", name: "gcorrect", checked: correctIdx === i ? "" : null, onchange: () => (correctIdx = i) }),
              "correct"
            ]),
            h("input", { type: "text", value: o, placeholder: "Option " + (i + 1), oninput: (e) => (options[i] = e.target.value) }),
            options.length > 2 ? h("button", {
              class: "icon-btn danger", onclick: () => {
                options.splice(i, 1); if (correctIdx >= options.length) correctIdx = 0; renderOpts();
              }
            }, ["✕"]) : null
          ]));
        });
        if (options.length < 4) optWrap.appendChild(h("button", { class: "icon-btn", onclick: () => { options.push(""); renderOpts(); } }, ["➕ Add an option"]));
      }
      renderOpts();
      card.appendChild(h("div", { class: "form-row" }, [optWrap]));
      card.appendChild(field("Grammar point (e.g. articles)", textInput(g.cat, (v) => (g.cat = v))));
      card.appendChild(field("French hint", textInput(g.fr || "", (v) => (g.fr = v))));
      card.appendChild(field("Meaning hint", textInput(g.meaning || "", (v) => (g.meaning = v))));
      card.appendChild(h("div", { class: "row mt" }, [
        h("button", {
          class: "btn btn-primary", onclick: () => {
            const clean = options.map((o) => o.trim()).filter(Boolean);
            if (!g.sentence.includes("___")) return U().alertBox("The sentence must contain ___ (the blank).");
            if (clean.length < 2) return U().alertBox("You need at least 2 options.");
            if (correctIdx >= options.length || !options[correctIdx].trim()) return U().alertBox("Tick a correct answer.");
            const rec = {
              sentence: g.sentence.trim(),
              options: clean,
              answer: options[correctIdx].trim(),
              cat: (g.cat || "").trim(),
              fr: (g.fr || "").trim(),
              meaning: (g.meaning || "").trim()
            };
            if (isNew) C().grammar.push(rec); else C().grammar[idx] = rec;
            save(); grammarList();
          }
        }, ["Save"]),
        h("button", { class: "btn btn-ghost", onclick: grammarList }, ["Cancel"])
      ]));
      scr.appendChild(card);
    });
  }

  /* ================================================================
     ANAGRAMS
     ================================================================ */
  function anagramList() {
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🔤 Anagrams"]));
      scr.appendChild(h("p", { class: "section-sub" }, [
        C().anagramWords.length + " word(s) to unscramble."
      ]));
      const list = h("div", { class: "editor-list" });
      C().anagramWords.forEach((word, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow strong" }, [word]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete "${word}"?`, () => { C().anagramWords.splice(idx, 1); save(); anagramList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      let newWord = "";
      scr.appendChild(h("div", { class: "form-card mt-lg" }, [
        field("Add an English word (UPPERCASE recommended)", textInput("", (v) => (newWord = v))),
        h("div", { class: "row" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              const w = newWord.trim().toUpperCase();
              if (w.length < 3) return U().alertBox("Choose a word of at least 3 letters.");
              C().anagramWords.push(w); save(); anagramList();
            }
          }, ["➕ Add"])
        ])
      ]));
    });
  }

  /* ================================================================
     SPELLING WORDS (NEW)
     ================================================================ */
  function spellingList() {
    const arr = C().spellingWords || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🐝 Spelling Words"]));
      scr.appendChild(h("p", { class: "section-sub" }, [arr.length + " word(s). Tiers: easy / medium / hard."]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((item, idx) => {
        const word = typeof item === "string" ? item : item.word;
        const tier = typeof item === "object" ? (item.tier || "medium") : "medium";
        const tierColor = tier === "easy" ? "#34d399" : tier === "hard" ? "#fb7185" : "#60a5fa";
        list.appendChild(h("div", { class: "list-item" }, [
          h("span", { class: "pts-badge", style: "background:" + tierColor + ";color:#12132a" }, [tier]),
          h("div", { class: "grow strong" }, [word]),
          h("button", { class: "icon-btn", onclick: () => spellingForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete "${word}"?`, () => { arr.splice(idx, 1); save(); spellingList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => spellingForm(null) }, ["➕ New spelling word"])
      ]));
    });
  }

  function spellingForm(idx) {
    const arr = C().spellingWords || [];
    const isNew = idx === null;
    const src = isNew ? { word: "", tier: "medium" }
      : (typeof arr[idx] === "string" ? { word: arr[idx], tier: "medium" } : U().clone(arr[idx]));
    let word = src.word, tier = src.tier || "medium";
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New spelling word" : "Edit spelling word"]));
      const tierSel = h("select", { onchange: (e) => (tier = e.target.value) });
      ["easy", "medium", "hard"].forEach((t) => {
        tierSel.appendChild(h("option", { value: t, selected: t === tier ? "" : null }, [t]));
      });
      const card = h("div", { class: "form-card" }, [
        field("Word", textInput(word, (v) => (word = v))),
        field("Difficulty tier", tierSel),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!word.trim()) return U().alertBox("Enter a word.");
              const rec = { word: word.trim(), tier: tier };
              if (!C().spellingWords) C().spellingWords = [];
              if (isNew) C().spellingWords.push(rec); else C().spellingWords[idx] = rec;
              save(); spellingList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: spellingList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     CHARADES (NEW)
     ================================================================ */
  function charadesList() {
    const arr = C().charades || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🎭 Charades"]));
      scr.appendChild(h("p", { class: "section-sub" }, [arr.length + " word(s) to mime."]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((item, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("span", { class: "pts-badge" }, [item.cat || "?"]),
          h("div", { class: "grow strong" }, [item.word]),
          h("button", { class: "icon-btn", onclick: () => charadesForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete "${item.word}"?`, () => { arr.splice(idx, 1); save(); charadesList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => charadesForm(null) }, ["➕ New charades word"])
      ]));
    });
  }

  function charadesForm(idx) {
    const arr = C().charades || [];
    const isNew = idx === null;
    const src = isNew ? { word: "", cat: "Action" } : U().clone(arr[idx]);
    let word = src.word, cat = src.cat || "Action";
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New charades word" : "Edit charades word"]));
      const catSel = h("select", { onchange: (e) => (cat = e.target.value) });
      ["Action", "Animal", "Job", "Object", "Sport", "Nature", "Food", "Other"].forEach((c) => {
        catSel.appendChild(h("option", { value: c, selected: c === cat ? "" : null }, [c]));
      });
      const card = h("div", { class: "form-card" }, [
        field("Word or phrase to mime", textInput(word, (v) => (word = v))),
        field("Category", catSel),
        h("p", { class: "save-hint", style: "text-align:left" }, ['Examples: "A cat", "Swimming", "A doctor", "Playing football"']),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!word.trim()) return U().alertBox("Enter a word or phrase.");
              const rec = { word: word.trim(), cat: cat };
              if (!C().charades) C().charades = [];
              if (isNew) C().charades.push(rec); else C().charades[idx] = rec;
              save(); charadesList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: charadesList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     GAGES (NEW)
     ================================================================ */
  function gagesList() {
    const arr = C().gages || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["😅 Gages (Forfeits)"]));
      scr.appendChild(h("p", { class: "section-sub" }, [arr.length + " forfeit(s)."]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((gage, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow" }, [h("div", { class: "strong" }, [gage])]),
          h("button", { class: "icon-btn", onclick: () => gageForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox("Delete this forfeit?", () => { arr.splice(idx, 1); save(); gagesList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => gageForm(null) }, ["➕ New forfeit"])
      ]));
    });
  }

  function gageForm(idx) {
    const arr = C().gages || [];
    const isNew = idx === null;
    let text = isNew ? "" : arr[idx];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New forfeit" : "Edit forfeit"]));
      const card = h("div", { class: "form-card" }, [
        field("Forfeit description (in English)", textArea(text, (v) => (text = v))),
        h("p", { class: "save-hint", style: "text-align:left" }, ['Example: "Sing a song in English for 20 seconds."']),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!text.trim()) return U().alertBox("Enter the forfeit text.");
              if (!C().gages) C().gages = [];
              if (isNew) C().gages.push(text.trim()); else C().gages[idx] = text.trim();
              save(); gagesList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: gagesList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     WHEEL CHALLENGES (NEW)
     ================================================================ */
  function wheelList() {
    const arr = C().wheelChallenges || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🎡 Wheel Challenges"]));
      scr.appendChild(h("p", { class: "section-sub" }, [arr.length + " challenge(s). Title + task description."]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((ch, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [ch.title]),
            h("div", { class: "muted" }, [ch.task])
          ]),
          h("button", { class: "icon-btn", onclick: () => wheelForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox(`Delete "${ch.title}"?`, () => { arr.splice(idx, 1); save(); wheelList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => wheelForm(null) }, ["➕ New challenge"])
      ]));
    });
  }

  function wheelForm(idx) {
    const arr = C().wheelChallenges || [];
    const isNew = idx === null;
    const src = isNew ? { title: "", task: "" } : U().clone(arr[idx]);
    let title = src.title, task = src.task;
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New wheel challenge" : "Edit challenge"]));
      const card = h("div", { class: "form-card" }, [
        field("Title (short)", textInput(title, (v) => (title = v))),
        field("Task description (what the team must do)", textArea(task, (v) => (task = v))),
        h("p", { class: "save-hint", style: "text-align:left" },
          ['Example title: "5 animals" — task: "Name 5 animals in English in 15 seconds."']),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!title.trim()) return U().alertBox("Enter a title.");
              if (!task.trim()) return U().alertBox("Enter the task description.");
              const rec = { title: title.trim(), task: task.trim() };
              if (!C().wheelChallenges) C().wheelChallenges = [];
              if (isNew) C().wheelChallenges.push(rec); else C().wheelChallenges[idx] = rec;
              save(); wheelList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: wheelList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     SPEAKING PROMPTS (NEW)
     ================================================================ */
  function promptsList() {
    const arr = C().speakingPrompts || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🗣️ Speaking Prompts"]));
      scr.appendChild(h("p", { class: "section-sub" }, [arr.length + " prompt(s). Conversation starter cards."]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((prompt, idx) => {
        list.appendChild(h("div", { class: "list-item" }, [
          h("div", { class: "grow strong" }, [prompt]),
          h("button", { class: "icon-btn", onclick: () => promptForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox("Delete this prompt?", () => { arr.splice(idx, 1); save(); promptsList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => promptForm(null) }, ["➕ New prompt"])
      ]));
    });
  }

  function promptForm(idx) {
    const arr = C().speakingPrompts || [];
    const isNew = idx === null;
    let text = isNew ? "" : arr[idx];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New speaking prompt" : "Edit prompt"]));
      const card = h("div", { class: "form-card" }, [
        field("Conversation prompt (in English)", textArea(text, (v) => (text = v))),
        h("p", { class: "save-hint", style: "text-align:left" },
          ['Example: "Tell us about your favourite food. Where is it from?"']),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!text.trim()) return U().alertBox("Enter the prompt text.");
              if (!C().speakingPrompts) C().speakingPrompts = [];
              if (isNew) C().speakingPrompts.push(text.trim()); else C().speakingPrompts[idx] = text.trim();
              save(); promptsList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: promptsList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     MYSTERY GIFTS (NEW)
     ================================================================ */
  function giftsList() {
    const arr = C().gifts || [];
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, ["🎁 Mystery Gifts"]));
      scr.appendChild(h("p", { class: "section-sub" }, [
        arr.length + " gift(s). Triggered when a 🎁 question is answered correctly."
      ]));
      const list = h("div", { class: "editor-list" });
      arr.forEach((gift, idx) => {
        const badge = gift.good ? "✅" : "💥";
        list.appendChild(h("div", { class: "list-item" }, [
          h("span", { class: "pts-badge" }, [badge + " " + (gift.tier || "minor")]),
          h("div", { class: "grow" }, [
            h("div", { class: "strong" }, [gift.label]),
            h("div", { class: "muted" }, [
              "Effect: " + (gift.effect || (gift.delta ? (gift.delta > 0 ? "+" : "") + gift.delta + " pts" : "none"))
            ])
          ]),
          h("button", { class: "icon-btn", onclick: () => giftForm(idx) }, ["✏️"]),
          h("button", {
            class: "icon-btn danger", onclick: () => {
              U().confirmBox("Delete this gift?", () => { arr.splice(idx, 1); save(); giftsList(); });
            }
          }, ["🗑️"])
        ]));
      });
      scr.appendChild(list);
      scr.appendChild(h("div", { class: "row mt-lg" }, [
        h("button", { class: "btn btn-primary", onclick: () => giftForm(null) }, ["➕ New gift"])
      ]));
    });
  }

  function giftForm(idx) {
    const arr = C().gifts || [];
    const isNew = idx === null;
    const src = isNew ? { label: "", good: true, tier: "minor", effect: "", delta: 0 } : U().clone(arr[idx]);
    let label = src.label, good = src.good !== false, tier = src.tier || "minor";
    let effect = src.effect || "", delta = src.delta || 0;
    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h("h2", { class: "section-title" }, [isNew ? "New mystery gift" : "Edit gift"]));
      const tierSel = h("select", { onchange: (e) => (tier = e.target.value) });
      ["minor", "major"].forEach((t) =>
        tierSel.appendChild(h("option", { value: t, selected: t === tier ? "" : null }, [t])));
      const effectSel = h("select", { onchange: (e) => (effect = e.target.value) });
      [
        ["(none — use point delta)", ""],
        ["Swap scores", "swap"],
        ["Steal 35% from leader", "steal"],
        ["Bankrupt (reset to 0)", "bankrupt"],
        ["Freeze next turn", "freeze"],
        ["Double or Nothing", "double_or_nothing"],
        ["Penalise leader, share to others", "leader_target"],
        ["Reverse all rankings", "reverse"]
      ].forEach(([lbl, val]) =>
        effectSel.appendChild(h("option", { value: val, selected: val === effect ? "" : null }, [lbl])));
      const card = h("div", { class: "form-card" }, [
        field("Gift label (shown on screen)", textInput(label, (v) => (label = v))),
        h("div", { class: "chk-row" }, [
          h("input", { type: "checkbox", id: "giftGoodChk", checked: good ? "" : null, onchange: (e) => (good = e.target.checked) }),
          h("label", { for: "giftGoodChk" }, ["✅ Good gift (green) — uncheck for bad gift (red)"])
        ]),
        field("Tier", tierSel),
        field("Special effect", effectSel),
        field("Point delta (e.g. 100 or -50, used only if no special effect)", textInput(String(delta), (v) => (delta = parseInt(v) || 0))),
        h("div", { class: "row mt" }, [
          h("button", {
            class: "btn btn-primary", onclick: () => {
              if (!label.trim()) return U().alertBox("Enter the gift label.");
              const rec = { label: label.trim(), good: good, tier: tier };
              if (effect) rec.effect = effect;
              else if (delta) rec.delta = delta;
              if (!C().gifts) C().gifts = [];
              if (isNew) C().gifts.push(rec); else C().gifts[idx] = rec;
              save(); giftsList();
            }
          }, ["Save"]),
          h("button", { class: "btn btn-ghost", onclick: giftsList }, ["Cancel"])
        ])
      ]);
      scr.appendChild(card);
    });
  }

  /* ================================================================
     IMPORT / EXPORT / PERMANENCE / RESET
     ================================================================ */

  /* ---- Export ---- */
  function exportJSON() {
    U().downloadFile("accra-english-content.json", JSON.stringify(C(), null, 2), "application/json");
  }

  /* ---- Import JSON (extended, merge-only) ---- */
  const IMPORTABLE_KEYS = [
    "vocabulary", "grandDefi", "grammar", "irregularVerbs", "phrasalVerbs", "anagramWords",
    "spellingWords", "charades", "gages", "wheelChallenges",
    "speakingPrompts", "gifts"
  ];

  function importJSONFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) {
        U().alertBox("Invalid JSON file."); return;
      }
      const preview = [];
      IMPORTABLE_KEYS.forEach((key) => {
        if (data[key] && Array.isArray(data[key]) && data[key].length)
          preview.push({ key, count: data[key].length });
      });
      if (!preview.length) { U().alertBox("No recognizable content found in this JSON file."); return; }

      showImportPreview(preview, () => {
        IMPORTABLE_KEYS.forEach((key) => {
          if (!data[key] || !Array.isArray(data[key])) return;
          if (!C()[key]) C()[key] = [];
          mergeByKey(data[key], key);
        });
        save();
        U().alertBox("✅ Import complete! Content has been merged (nothing was overwritten).");
        menu();
      });
    };
    reader.readAsText(file);
  }

  function mergeByKey(incoming, key) {
    const pool = C()[key];
    if (key === "vocabulary") {
      const existing = new Set(pool.map((w) => w.en.toLowerCase()));
      incoming.forEach((w) => { if (w.en && !existing.has(w.en.toLowerCase())) pool.push(w); });
    } else if (key === "anagramWords") {
      const existing = new Set(pool.map((w) => w.toUpperCase()));
      incoming.forEach((w) => { if (w && !existing.has(w.toUpperCase())) pool.push(w); });
    } else if (key === "gages" || key === "speakingPrompts") {
      const existing = new Set(pool.map((s) => s.trim().toLowerCase()));
      incoming.forEach((s) => { if (s && !existing.has(s.trim().toLowerCase())) pool.push(s); });
    } else if (key === "spellingWords") {
      const existing = new Set(pool.map((w) => (typeof w === "string" ? w : w.word).toLowerCase()));
      incoming.forEach((w) => {
        const word = typeof w === "string" ? w : w.word;
        if (word && !existing.has(word.toLowerCase())) pool.push(w);
      });
    } else if (key === "charades") {
      const existing = new Set(pool.map((w) => w.word.toLowerCase()));
      incoming.forEach((w) => { if (w.word && !existing.has(w.word.toLowerCase())) pool.push(w); });
    } else if (key === "wheelChallenges") {
      const existing = new Set(pool.map((c) => c.title.toLowerCase()));
      incoming.forEach((c) => { if (c.title && !existing.has(c.title.toLowerCase())) pool.push(c); });
    } else if (key === "gifts") {
      const existing = new Set(pool.map((g) => g.label.toLowerCase()));
      incoming.forEach((g) => { if (g.label && !existing.has(g.label.toLowerCase())) pool.push(g); });
    } else if (key === "irregularVerbs") {
      const existing = new Set(pool.map((v) => v.verb.toLowerCase()));
      incoming.forEach((v) => { if (v.verb && !existing.has(v.verb.toLowerCase())) pool.push(v); });
    } else if (key === "phrasalVerbs") {
      const existing = new Set(pool.map((v) => v.verb.toLowerCase()));
      incoming.forEach((v) => { if (v.verb && !existing.has(v.verb.toLowerCase())) pool.push(v); });
    } else if (key === "grammar") {
      const existing = new Set(pool.map((g) => g.sentence.toLowerCase()));
      incoming.forEach((g) => { if (g.sentence && !existing.has(g.sentence.toLowerCase())) pool.push(g); });
    } else if (key === "grandDefi") {
      incoming.forEach((newTopic) => {
        const found = pool.find((t) => t.topic.toLowerCase() === newTopic.topic.toLowerCase());
        if (!found) {
          pool.push(newTopic);
        } else {
          const existingPts = new Set(found.questions.map((q) => q.points));
          (newTopic.questions || []).forEach((q) => {
            if (!existingPts.has(q.points)) found.questions.push(q);
          });
        }
      });
    }
  }

  function showImportPreview(preview, onConfirm) {
    const h = U().h;
    const overlay = h("div", { class: "modal-back" });
    const modal = h("div", { class: "modal", style: "max-width:460px" });
    modal.appendChild(h("h3", {}, ["📥 Import preview"]));
    modal.appendChild(h("p", { class: "section-sub" }, ["The following will be ADDED (not overwritten):"]));
    const ul = h("ul", { style: "margin:12px 0;padding-left:20px;line-height:2" });
    preview.forEach(({ key, count }) => ul.appendChild(h("li", {}, [count + " item(s) → " + key])));
    modal.appendChild(ul);
    modal.appendChild(h("p", { class: "note" }, ["Duplicates (same word / same sentence) will be skipped."]));
    const row = h("div", { class: "row center mt" });
    row.appendChild(h("button", { class: "btn btn-primary", onclick: () => { overlay.remove(); onConfirm(); } }, ["✅ Confirm & import"]));
    row.appendChild(h("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, ["Cancel"]));
    modal.appendChild(row);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /* ---- Import .txt ---- */
  const TXT_TARGETS = [
    { key: "vocabulary", label: "Vocabulary  (word | fr | cat | level | emoji | meaning)" },
    { key: "spellingWords", label: "Spelling Words  (word | tier)" },
    { key: "irregularVerbs", label: "Irregular Verbs  (verb | past | participle | meaning | fr)" },
    { key: "phrasalVerbs", label: "Phrasal Verbs  (verb | meaning | fr)" },
    { key: "charades", label: "Charades  (word | cat)" },
    { key: "anagramWords", label: "Anagrams  (one word per line)" },
    { key: "gages", label: "Gages  (one forfeit per line)" },
    { key: "speakingPrompts", label: "Speaking Prompts  (one prompt per line)" },
    { key: "wheelChallenges", label: "Wheel Challenges  (title | task)" }
  ];

  function importTXTFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) { U().alertBox("The file is empty."); return; }
      showTxtImport(lines);
    };
    reader.readAsText(file);
  }

  function showTxtImport(lines) {
    const h = U().h;
    let targetKey = "vocabulary";
    const selectedLines = new Array(lines.length).fill(true);

    U().show((scr) => {
      scr.appendChild(h("h2", { class: "section-title" }, ["📄 Import text / PDF lines"]));
      scr.appendChild(h("p", { class: "section-sub" }, [
        lines.length + " line(s) found. Tick the ones you want, choose the target, then confirm."
      ]));

      /* Format hint */
      const hintBox = h("div", { class: "save-hint", style: "margin-bottom:12px" });
      const targSel = h("select", {
        onchange: (e) => {
          targetKey = e.target.value;
          const tgt = TXT_TARGETS.find((t) => t.key === targetKey);
          hintBox.textContent = tgt ? "Format: " + tgt.label : "";
        }
      });
      TXT_TARGETS.forEach(({ key, label }) => {
        targSel.appendChild(h("option", { value: key }, [label]));
      });
      const tgt0 = TXT_TARGETS[0];
      hintBox.textContent = "Format: " + tgt0.label;

      scr.appendChild(h("div", { class: "form-card" }, [field("Import as", targSel), hintBox]));

      /* Checkboxes */
      const listDiv = h("div", { class: "editor-list", style: "margin-top:16px" });
      const checkboxes = [];
      lines.forEach((line, i) => {
        const chk = h("input", { type: "checkbox", checked: "", onchange: (e) => (selectedLines[i] = e.target.checked) });
        checkboxes.push(chk);
        listDiv.appendChild(h("div", { class: "list-item" }, [
          h("label", { class: "radio-lbl", style: "gap:10px" }, [chk, h("span", { class: "grow" }, [line])])
        ]));
      });
      scr.appendChild(listDiv);

      scr.appendChild(h("div", { class: "row center mt" }, [
        h("button", {
          class: "btn btn-ghost", onclick: () => {
            selectedLines.fill(true); checkboxes.forEach((c) => (c.checked = true));
          }
        }, ["Select all"]),
        h("button", {
          class: "btn btn-ghost", onclick: () => {
            selectedLines.fill(false); checkboxes.forEach((c) => (c.checked = false));
          }
        }, ["Select none"])
      ]));

      scr.appendChild(h("div", { class: "row center mt-lg" }, [
        h("button", {
          class: "btn btn-primary", onclick: () => {
            const chosen = lines.filter((_, i) => selectedLines[i]);
            if (!chosen.length) { U().alertBox("Select at least one line."); return; }
            parseTxtAndConfirm(chosen, targetKey);
          }
        }, ["▶ Preview & confirm"]),
        h("button", { class: "btn btn-ghost", onclick: menu }, ["Cancel"])
      ]));
    });
  }

  function parseTxtAndConfirm(lines, targetKey) {
    const h = U().h;
    const parsed = [];
    const errors = [];

    lines.forEach((line, i) => {
      const parts = line.split("|").map((p) => p.trim());
      try {
        if (targetKey === "vocabulary") {
          const [en, fr, cat, level, emoji, meaning] = parts;
          if (!en) throw new Error("missing word");
          parsed.push({
            en, emoji: emoji || "⭐", cat: cat || "general",
            level: level || "easy", fr: fr || "", meaning: meaning || ""
          });
        } else if (targetKey === "spellingWords") {
          const [word, tier] = parts;
          if (!word) throw new Error("missing word");
          parsed.push({ word, tier: tier || "medium" });
        } else if (targetKey === "irregularVerbs") {
          const [verb, past, participle, meaning, fr] = parts;
          if (!verb) throw new Error("missing verb");
          parsed.push({ verb, past: past || "", participle: participle || "", meaning: meaning || "", fr: fr || "" });
        } else if (targetKey === "phrasalVerbs") {
          const [verb, meaning, fr] = parts;
          if (!verb) throw new Error("missing verb");
          parsed.push({ verb, meaning: meaning || "", fr: fr || "" });
        } else if (targetKey === "charades") {
          const [word, cat] = parts;
          if (!word) throw new Error("missing word");
          parsed.push({ word, cat: cat || "Action" });
        } else if (targetKey === "wheelChallenges") {
          const [title, task] = parts;
          if (!title || !task) throw new Error("need: title | task");
          parsed.push({ title, task });
        } else {
          if (!parts[0]) throw new Error("empty line");
          parsed.push(targetKey === "anagramWords" ? parts[0].toUpperCase() : parts[0]);
        }
      } catch (e) {
        errors.push("Line " + (i + 1) + ": \"" + line + "\" — " + e.message);
      }
    });

    const overlay = h("div", { class: "modal-back" });
    const modal = h("div", { class: "modal", style: "max-width:500px;max-height:80vh;overflow-y:auto" });
    modal.appendChild(h("h3", {}, ["📄 Confirm import"]));
    modal.appendChild(h("p", { class: "section-sub" }, [
      parsed.length + " item(s) will be ADDED to \"" + targetKey + "\"."
    ]));

    if (errors.length) {
      modal.appendChild(h("p", { class: "note", style: "color:#fb7185" }, [
        "⚠️ " + errors.length + " line(s) skipped:"
      ]));
      const errList = h("ul", { style: "font-size:.85rem;color:var(--muted);margin:4px 0 12px;padding-left:18px" });
      errors.forEach((e) => errList.appendChild(h("li", {}, [e])));
      modal.appendChild(errList);
    }

    const previewList = h("div", { class: "editor-list", style: "max-height:200px;overflow-y:auto" });
    parsed.forEach((item) => {
      const txt = typeof item === "string" ? item : Object.values(item).join(" · ");
      previewList.appendChild(h("div", { class: "list-item" }, [h("div", { class: "grow" }, [txt])]));
    });
    modal.appendChild(previewList);

    const row = h("div", { class: "row center mt" });
    row.appendChild(h("button", {
      class: "btn btn-primary", onclick: () => {
        overlay.remove();
        mergeParsedItems(parsed, targetKey);
        U().alertBox("✅ " + parsed.length + " item(s) added to \"" + targetKey + "\". Nothing was overwritten.");
        menu();
      }
    }, ["✅ Confirm & add"]));
    row.appendChild(h("button", { class: "btn btn-ghost", onclick: () => overlay.remove() }, ["Cancel"]));
    modal.appendChild(row);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function mergeParsedItems(items, key) {
    if (!C()[key]) C()[key] = [];
    mergeByKey(items, key);
  }

  /* ---- Import PDF ---- */
  function importPDFFile(file) {
    if (!file) return;
    if (typeof pdfjsLib === "undefined") {
      U().alertBox(
        "PDF import requires pdf.js.\n\n" +
        "1. Download pdf.min.js from https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.min.mjs\n" +
        "2. Place it in js/vendor/pdf.min.js\n" +
        "3. Add <script src=\"js/vendor/pdf.min.js\"></script> to index.html BEFORE editor.js\n" +
        "4. Also download the worker: pdf.worker.min.js → js/vendor/pdf.worker.min.js\n" +
        "5. Add in index.html: pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';\n\n" +
        "Once set up, PDF import will extract text line by line for you to review."
      );
      return;
    }
    const url = URL.createObjectURL(file);
    const allLines = [];
    pdfjsLib.getDocument(url).promise.then((doc) => {
      const total = doc.numPages;
      let done = 0;
      const pagePromises = [];
      for (let p = 1; p <= total; p++) {
        pagePromises.push(
          doc.getPage(p).then((page) =>
            page.getTextContent().then((tc) => {
              tc.items.forEach((item) => { if (item.str && item.str.trim()) allLines.push(item.str.trim()); });
            })
          )
        );
      }
      Promise.all(pagePromises).then(() => {
        URL.revokeObjectURL(url);
        if (!allLines.length) { U().alertBox("No text found in this PDF. Make sure it is not a scanned image."); return; }
        showTxtImport(allLines);
      });
    }).catch(() => {
      URL.revokeObjectURL(url);
      U().alertBox("Could not read the PDF. Make sure it contains selectable text (not just a scanned image).");
    });
  }

  /* ================================================================
     Permanence / Reset
     ================================================================ */
  function downloadContentJS() {
    const text =
      "/* Accra English Club content — generated by the editor.\n" +
      "   Replace the file content/content.js with this one to make\n" +
      "   your changes permanent. */\n\n" +
      "window.CAA = window.CAA || {};\n\n" +
      "CAA.content = " + JSON.stringify(C(), null, 2) + ";\n";
    U().downloadFile("content.js", text, "text/javascript");
    U().alertBox("File \"content.js\" downloaded. Put it in the \"content\" folder (replace the old one) to keep your changes permanently.");
  }

  function resetDefault() {
    U().confirmBox("Go back to the original content? All your changes in this browser will be lost.", () => {
      CAA.content = U().clone(CAA.defaultContent);
      U().store.set("content", null);
      U().alertBox("Content reset.");
      menu();
    });
  }

  /* ================================================================
     Form helpers
     ================================================================ */
  function field(label, inputEl) {
    return U().h("div", { class: "form-row" }, [U().h("label", {}, [label]), inputEl]);
  }
  function textInput(value, onInput) {
    return U().h("input", { type: "text", value: value || "", oninput: (e) => onInput(e.target.value) });
  }
  function textArea(value, onInput) {
    return U().h("textarea", { rows: "2", oninput: (e) => onInput(e.target.value) }, [value || ""]);
  }

  return { menu };
})();
