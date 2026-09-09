/* =====================================================================
   stories.js — Accra English Club Interactive Reading Corner
   Modules : Bibliothèque d'histoires, Lecteur mot-à-mot interactif,
   Infobulle bilingue avec prononciation Web Speech API,
   Lecture audio intégrale avec surlignage dynamique,
   Mini-quiz de compréhension & Carnet de vocabulaire.
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.storiesModule = (function () {
  let currentStory = null;
  let activeUtterance = null;
  let isNarrating = false;
  let currentSentenceIdx = 0;
  let sentencesList = [];
  let narrationSpeed = 0.9;
  let savedWords = [];
  let currentFontSize = 1.15; // rem

  // Clé LocalStorage pour le carnet de vocabulaire
  const STORAGE_SAVED_WORDS = "caa_saved_words";

  function loadSavedWords() {
    try {
      const data = localStorage.getItem(STORAGE_SAVED_WORDS);
      savedWords = data ? JSON.parse(data) : [];
    } catch (e) {
      savedWords = [];
    }
  }

  function persistSavedWords() {
    try {
      localStorage.setItem(STORAGE_SAVED_WORDS, JSON.stringify(savedWords));
      updateSavedWordsCounter();
    } catch (e) {
      console.warn("Could not save words to localStorage", e);
    }
  }

  function updateSavedWordsCounter() {
    const el = document.getElementById("savedWordsCountBadge");
    if (el) el.textContent = savedWords.length;
    const btn = document.getElementById("btnOpenSavedWords");
    if (btn) btn.title = `${savedWords.length} mot(s) sauvegardé(s)`;
  }

  let isInitialized = false;

  // --- Initialisation de la Bibliothèque ---
  function init() {
    loadSavedWords();
    updateSavedWordsCounter();
    renderLibrary();
    if (isInitialized) return;
    isInitialized = true;
    setupEventListeners();
    setupPopover();
  }

  function renderLibrary(filterLevel = "", searchTerm = "") {
    const container = document.getElementById("storiesGrid");
    if (!container) return;

    const stories = window.CAA.stories || [];
    let filtered = stories;

    if (filterLevel) {
      filtered = filtered.filter(s => s.level.toLowerCase().includes(filterLevel.toLowerCase()));
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(q) ||
        (s.titleFr && s.titleFr.toLowerCase().includes(q)) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }

    // Mise à jour du compteur global d'histoires
    const badge = document.getElementById("badgeStories");
    if (badge) badge.textContent = stories.length;
    const statBadge = document.getElementById("statStories");
    if (statBadge) statBadge.textContent = stories.length;

    if (!filtered.length) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
          <p style="font-size: 1.1rem; margin-bottom: 8px;">Aucune histoire ne correspond à votre recherche.</p>
          <button class="btn btn-ghost btn-sm" onclick="CAA.storiesModule.resetFilters()">Réinitialiser les filtres</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(story => {
      const levelClass = story.level.toLowerCase().includes("a1") || story.level.toLowerCase().includes("a2")
        ? "level-a1a2"
        : (story.level.toLowerCase().includes("b1") ? "level-b1" : (story.level.toLowerCase().includes("b2") ? "level-b2" : "level-c1"));

      return `
        <div class="story-card" onclick="CAA.storiesModule.openStory('${story.id}')">
          <div class="story-card-badges">
            <span class="story-level-badge ${levelClass}">${story.level} · ${story.levelLabel}</span>
            <span class="story-time-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${story.readTime}
            </span>
          </div>

          <div class="story-cover-row">
            <div class="story-emoji-box">${story.coverEmoji || "📖"}</div>
            <div class="story-title-group">
              <h3>${story.title}</h3>
              <small>${story.titleFr || ""}</small>
            </div>
          </div>

          <p class="story-card-summary">${story.summary}</p>

          <div class="story-card-footer">
            <span class="story-category-tag">${story.category}</span>
            <button class="story-start-btn" title="Lire et écouter cette histoire">
              Lire l'histoire →
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  function resetFilters() {
    const levelSelect = document.getElementById("storyLevelFilter");
    if (levelSelect) levelSelect.value = "";
    const searchInput = document.getElementById("storySearchInput");
    if (searchInput) searchInput.value = "";
    renderLibrary();
  }

  // --- OUVERTURE ET LECTURE D'UNE HISTOIRE ---
  function openStory(storyId) {
    const stories = window.CAA.stories || [];
    currentStory = stories.find(s => s.id === storyId);
    if (!currentStory) return;

    // Stopper toute narration en cours
    stopNarration();

    // Basculer de la bibliothèque au lecteur
    const libView = document.getElementById("storiesLibraryView");
    const readerView = document.getElementById("storyReaderView");
    if (libView) libView.style.display = "none";
    if (readerView) {
      readerView.style.display = "block";
      readerView.scrollIntoView({ behavior: "smooth" });
    }

    // Remplir l'en-tête du lecteur
    const titleEl = document.getElementById("readerStoryTitle");
    if (titleEl) titleEl.textContent = currentStory.title;
    const subEl = document.getElementById("readerStorySub");
    if (subEl) subEl.textContent = `${currentStory.titleFr || ""} · Niveau ${currentStory.level} (${currentStory.levelLabel})`;

    // Construire le corps de texte interactif
    buildInteractiveStoryContent();

    // Préparer le mini-quiz de compréhension
    buildStoryQuiz();

    // Remplir le glossaire de l'histoire
    buildStoryGlossary();
  }

  function closeStoryReader() {
    stopNarration();
    const libView = document.getElementById("storiesLibraryView");
    const readerView = document.getElementById("storyReaderView");
    if (readerView) readerView.style.display = "none";
    if (libView) {
      libView.style.display = "block";
      libView.scrollIntoView({ behavior: "smooth" });
    }
    currentStory = null;
  }

  // Découpe et balise le texte de l'histoire mot par mot et phrase par phrase
  function buildInteractiveStoryContent() {
    const container = document.getElementById("storyBodyText");
    if (!container || !currentStory) return;

    container.style.fontSize = `${currentFontSize}rem`;
    sentencesList = [];
    currentSentenceIdx = 0;

    const paragraphs = currentStory.content || [];
    let globalSentIdx = 0;

    const html = paragraphs.map(pText => {
      // Découpe en phrases (approximatif mais efficace pour l'anglais)
      const rawSentences = pText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [pText];

      const sentencesHtml = rawSentences.map(sent => {
        const trimmed = sent.trim();
        if (!trimmed) return "";

        const sIdx = globalSentIdx++;
        sentencesList.push(trimmed);

        // Découper la phrase en tokens (mots avec tirets ou apostrophes internes, ponctuation et espaces)
        const tokens = trimmed.match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*|[.,!?"“”«»;:()—–]+|\s+|[^\s\w]/g) || [trimmed];
        const tokensHtml = tokens.map(tok => {
          if (!tok || !tok.trim()) return tok; // espace ou vide
          if (/^[.,!?"“”«»;:()—–\s]+$/.test(tok)) return tok; // ponctuation

          // C'est un mot ! Vérifier s'il est dans le vocabulaire
          const clean = tok.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z'-]/g, "");
          const hasVocab = (currentStory.vocabulary && (currentStory.vocabulary[clean] || currentStory.vocabulary[clean.replace(/s$/, "")])) ||
                           (window.CAA.enFrDict && (window.CAA.enFrDict[clean] || window.CAA.enFrDict[clean.replace(/s$/, "")]));

          return `<span class="story-word ${hasVocab ? "has-vocab" : ""}" data-word="${escapeHtml(tok)}" data-clean="${escapeHtml(clean)}">${escapeHtml(tok)}</span>`;
        }).join("");

        return `<span class="story-sentence" id="story-sent-${sIdx}" data-idx="${sIdx}">${tokensHtml}</span> `;
      }).join(" ");

      return `<p class="story-paragraph">${sentencesHtml}</p>`;
    }).join("");

    let fullHtml = html;
    if (currentStory.moral) {
      fullHtml += `
        <div class="story-moral-card">
          <div class="moral-badge">🌟 Moral of the Story · La Morale</div>
          <p class="moral-text-en">“${escapeHtml(currentStory.moral)}”</p>
          ${currentStory.moralFr ? `<p class="moral-text-fr">« ${escapeHtml(currentStory.moralFr)} »</p>` : ""}
          <div style="margin-top:12px;">
            <button class="btn btn-ghost btn-sm" onclick="CAA.storiesModule.speakSingleWord('${escapeHtml(currentStory.moral).replace(/'/g, "\\'")}')" style="font-size:0.82rem;">
              🔊 Écouter la morale en anglais
            </button>
          </div>
        </div>
      `;
    }

    container.innerHTML = fullHtml;

    // Attacher les événements aux mots interactifs
    attachWordEvents();
  }

  // --- GESTION DE L'INFOBULLE (WORD POPOVER) ---
  let popoverEl = null;
  let activeWordElement = null;
  let popoverHideTimer = null;

  function setupPopover() {
    popoverEl = document.getElementById("storyWordPopover");
    if (!popoverEl) return;

    popoverEl.addEventListener("mouseenter", () => {
      if (popoverHideTimer) clearTimeout(popoverHideTimer);
    });

    popoverEl.addEventListener("mouseleave", () => {
      hidePopoverDelayed();
    });

    // Clics extérieurs pour fermer
    document.addEventListener("click", (e) => {
      if (popoverEl && popoverEl.style.display === "block") {
        if (!popoverEl.contains(e.target) && !e.target.classList.contains("story-word")) {
          hidePopover();
        }
      }
    });
  }

  function attachWordEvents() {
    const words = document.querySelectorAll(".story-word");
    words.forEach(el => {
      el.addEventListener("mouseenter", (e) => {
        if (popoverHideTimer) clearTimeout(popoverHideTimer);
        showWordPopover(el);
      });

      el.addEventListener("mouseleave", () => {
        hidePopoverDelayed();
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        showWordPopover(el);
        // Sur mobile ou clic direct, prononcer automatiquement le mot
        const word = el.getAttribute("data-word");
        speakSingleWord(word);
      });
    });
  }

  function showWordPopover(wordEl) {
    if (!popoverEl || !currentStory) return;

    activeWordElement = wordEl;
    document.querySelectorAll(".story-word.word-active").forEach(w => w.classList.remove("word-active"));
    wordEl.classList.add("word-active");

    const raw = wordEl.getAttribute("data-word") || "";
    const clean = wordEl.getAttribute("data-clean") || raw.toLowerCase();

    // Recherche de la définition (dans l'histoire ou dans le dictionnaire global)
    const info = window.CAA.lookupStoryWord(clean, currentStory.vocabulary);

    // Remplir l'infobulle
    document.getElementById("popoverWord").textContent = raw;
    document.getElementById("popoverIpa").textContent = info.ipa || "";
    document.getElementById("popoverPos").textContent = info.pos || "mot";
    
    const transEl = document.getElementById("popoverTranslation");
    const tipEl = document.getElementById("popoverTip");
    if (transEl) {
      transEl.textContent = info.fr || "Vocabulaire anglais";
    }
    if (tipEl) {
      tipEl.textContent = info.tip || `Exemple : ${raw}`;
    }

    // Si le mot est marqué pour enrichissement asynchrone, interroger en tâche de fond
    if (info.pendingTranslate) {
      fetchLiveTranslation(clean, raw, wordEl);
    }

    // Bouton Prononciation
    const speakBtn = document.getElementById("popoverSpeakBtn");
    if (speakBtn) {
      speakBtn.onclick = (e) => {
        e.stopPropagation();
        speakSingleWord(raw, speakBtn);
      };
    }

    // Bouton Sauvegarder dans le carnet
    const saveBtn = document.getElementById("popoverSaveBtn");
    if (saveBtn) {
      const isAlreadySaved = savedWords.some(w => w.word.toLowerCase() === clean);
      saveBtn.classList.toggle("saved", isAlreadySaved);
      saveBtn.innerHTML = isAlreadySaved 
        ? `⭐ Enregistré dans le carnet` 
        : `☆ Sauvegarder ce mot`;

      saveBtn.onclick = (e) => {
        e.stopPropagation();
        toggleSaveWord(raw, info);
        const updatedStatus = savedWords.some(w => w.word.toLowerCase() === clean);
        saveBtn.classList.toggle("saved", updatedStatus);
        saveBtn.innerHTML = updatedStatus 
          ? `⭐ Enregistré dans le carnet` 
          : `☆ Sauvegarder ce mot`;
      };
    }

    // Positionnement intelligent
    popoverEl.style.display = "block";
    const rect = wordEl.getBoundingClientRect();
    const popRect = popoverEl.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (popRect.width / 2);

    // Vérifier si ça déborde en bas
    if (top + popRect.height > window.innerHeight - 10) {
      top = rect.top - popRect.height - 8;
    }

    // Vérifier les bords horizontaux
    if (left < 10) left = 10;
    if (left + popRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popRect.width - 10;
    }

    popoverEl.style.top = `${Math.max(10, top)}px`;
    popoverEl.style.left = `${left}px`;
  }

  function hidePopover() {
    if (popoverEl) popoverEl.style.display = "none";
    if (activeWordElement) {
      activeWordElement.classList.remove("word-active");
      activeWordElement = null;
    }
  }

  function hidePopoverDelayed() {
    popoverHideTimer = setTimeout(() => {
      hidePopover();
    }, 280);
  }

  // Requête asynchrone pour les mots non trouvés dans le dictionnaire statique
  async function fetchLiveTranslation(clean, raw, wordEl) {
    if (!clean) return;
    
    // Si déjà présent dans dynamicDict
    if (window.CAA.dynamicDict && window.CAA.dynamicDict[clean] && window.CAA.dynamicDict[clean].fr) {
      updatePopoverIfActive(wordEl, window.CAA.dynamicDict[clean]);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|fr`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
          let trans = data.responseData.translatedText.trim();
          if (trans && !trans.toLowerCase().includes("mymemory") && trans.toLowerCase() !== clean.toLowerCase()) {
            const entry = {
              word: clean,
              fr: trans.toLowerCase(),
              pos: "mot",
              ipa: "",
              tip: `Traduction : ${trans}`
            };
            if (!window.CAA.dynamicDict) window.CAA.dynamicDict = {};
            window.CAA.dynamicDict[clean] = entry;
            try {
              localStorage.setItem("caa_dynamic_dict_v2", JSON.stringify(window.CAA.dynamicDict));
            } catch(e){}

            updatePopoverIfActive(wordEl, entry);
          }
        }
      }
    } catch(err) {
      // Échec réseau ou timeout, le fallback statique reste affiché
    }
  }

  function updatePopoverIfActive(wordEl, entry) {
    if (activeWordElement === wordEl && popoverEl && popoverEl.style.display === "block") {
      const transEl = document.getElementById("popoverTranslation");
      const tipEl = document.getElementById("popoverTip");
      if (transEl && entry.fr) transEl.textContent = entry.fr;
      if (tipEl && entry.tip) tipEl.textContent = entry.tip;
    }
  }

  // --- PRONONCIATION D'UN MOT UNIQUE ---
  function speakSingleWord(word, btnEl) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const cleanWord = word.replace(/[^a-zA-Z' -]/g, "").trim();
    if (!cleanWord) return;

    const utt = new SpeechSynthesisUtterance(cleanWord);
    utt.lang = "en-US";
    utt.rate = narrationSpeed;

    if (btnEl) btnEl.classList.add("speaking-active");
    utt.onend = () => { if (btnEl) btnEl.classList.remove("speaking-active"); };
    utt.onerror = () => { if (btnEl) btnEl.classList.remove("speaking-active"); };

    window.speechSynthesis.speak(utt);
  }

  // --- NARRATION COMPLÈTE DE L'HISTOIRE ---
  function toggleNarration() {
    if (isNarrating) {
      pauseNarration();
    } else {
      startNarration();
    }
  }

  function startNarration() {
    if (!("speechSynthesis" in window)) {
      alert("La synthèse vocale n'est pas disponible sur ce navigateur.");
      return;
    }

    isNarrating = true;
    updateAudioControlsUI(true);
    speakSentenceAt(currentSentenceIdx);
  }

  function pauseNarration() {
    isNarrating = false;
    window.speechSynthesis.cancel();
    updateAudioControlsUI(false);
    clearSentenceHighlights();
  }

  function stopNarration() {
    isNarrating = false;
    currentSentenceIdx = 0;
    window.speechSynthesis.cancel();
    updateAudioControlsUI(false);
    clearSentenceHighlights();
  }

  function speakSentenceAt(idx) {
    if (!isNarrating || idx >= sentencesList.length) {
      stopNarration();
      const statusEl = document.getElementById("narrationStatusText");
      if (statusEl) statusEl.textContent = "Lecture terminée.";
      return;
    }

    currentSentenceIdx = idx;
    const text = sentencesList[idx];

    // Mettre en surbrillance visuelle la phrase
    highlightSentence(idx);

    const statusEl = document.getElementById("narrationStatusText");
    if (statusEl) statusEl.textContent = `Lecture : phrase ${idx + 1} / ${sentencesList.length}`;

    window.speechSynthesis.cancel();
    activeUtterance = new SpeechSynthesisUtterance(text);
    activeUtterance.lang = "en-US";
    activeUtterance.rate = narrationSpeed;

    activeUtterance.onend = () => {
      if (isNarrating) {
        speakSentenceAt(idx + 1);
      }
    };

    activeUtterance.onerror = () => {
      if (isNarrating) {
        speakSentenceAt(idx + 1);
      }
    };

    window.speechSynthesis.speak(activeUtterance);
  }

  function highlightSentence(idx) {
    clearSentenceHighlights();
    const sentEl = document.getElementById(`story-sent-${idx}`);
    if (sentEl) {
      sentEl.classList.add("active-narration");
      sentEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function clearSentenceHighlights() {
    document.querySelectorAll(".story-sentence.active-narration").forEach(el => {
      el.classList.remove("active-narration");
    });
  }

  function updateAudioControlsUI(playing) {
    const btn = document.getElementById("btnPlayStoryAudio");
    if (btn) {
      btn.innerHTML = playing 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Écouter l'histoire complète`;
    }
  }

  // --- CARNET DE MOTS (SAVED WORDS) ---
  function toggleSaveWord(word, info) {
    const clean = word.toLowerCase().replace(/[^a-z'-]/g, "");
    const idx = savedWords.findIndex(w => w.word.toLowerCase() === clean);

    if (idx >= 0) {
      savedWords.splice(idx, 1);
    } else {
      savedWords.push({
        word: word,
        clean: clean,
        fr: info.fr || "Vocabulaire",
        ipa: info.ipa || "",
        pos: info.pos || "mot",
        tip: info.tip || "",
        date: new Date().toLocaleDateString("fr-FR")
      });
    }
    persistSavedWords();
  }

  function openSavedWordsModal() {
    const modal = document.getElementById("savedWordsModal");
    const body = document.getElementById("savedWordsList");
    if (!modal || !body) return;

    if (!savedWords.length) {
      body.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: var(--muted);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">📚</div>
          <p style="font-weight: 700; font-size: 1.05rem; margin-bottom: 6px;">Votre carnet de vocabulaire est vide</p>
          <p style="font-size: 0.9rem;">En lisant une histoire, cliquez sur n'importe quel mot puis sur <strong>« Sauvegarder ce mot »</strong> pour le réviser ici !</p>
        </div>
      `;
    } else {
      body.innerHTML = savedWords.map((item, idx) => `
        <div class="saved-word-item">
          <div class="saved-word-info">
            <strong>${escapeHtml(item.word)}</strong>
            ${item.ipa ? `<span style="font-family:monospace;font-size:0.8rem;color:var(--muted);">${escapeHtml(item.ipa)}</span>` : ""}
            <span>→ ${escapeHtml(item.fr)}</span>
          </div>
          <div class="saved-word-actions">
            <button class="btn btn-ghost btn-sm" onclick="CAA.storiesModule.speakSingleWord('${escapeHtml(item.word)}')" title="Écouter la prononciation">
              🔊
            </button>
            <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="CAA.storiesModule.removeSavedWord(${idx})" title="Supprimer du carnet">
              ✕
            </button>
          </div>
        </div>
      `).join("");
    }

    modal.style.display = "flex";
  }

  function removeSavedWord(index) {
    if (index >= 0 && index < savedWords.length) {
      savedWords.splice(index, 1);
      persistSavedWords();
      openSavedWordsModal();
    }
  }

  function closeSavedWordsModal() {
    const modal = document.getElementById("savedWordsModal");
    if (modal) modal.style.display = "none";
  }

  // --- MINI-QUIZ DE FIN D'HISTOIRE ---
  function buildStoryQuiz() {
    const container = document.getElementById("storyQuizContainer");
    if (!container || !currentStory) return;

    const quiz = currentStory.quiz || [];
    if (!quiz.length) {
      container.innerHTML = "";
      return;
    }

    let quizHtml = `
      <div class="story-quiz-section">
        <div class="story-quiz-header">
          <div>
            <h3>🎯 Défi de Compréhension</h3>
            <p style="color:var(--muted);font-size:0.88rem;margin:4px 0 0;">Testez votre compréhension de l'histoire en 3 questions rapides.</p>
          </div>
          <span class="quiz-score-pill" id="storyQuizScoreBadge" style="display:none;font-weight:800;padding:6px 14px;border-radius:20px;background:#dcfce7;color:#15803d;"></span>
        </div>
    `;

    quiz.forEach((q, qIdx) => {
      quizHtml += `
        <div class="quiz-q-card" id="quiz-q-card-${qIdx}">
          <div class="quiz-q-title">Question ${qIdx + 1} : ${escapeHtml(q.question)}</div>
          <div class="quiz-choices-grid">
            ${q.options.map((opt, optIdx) => `
              <button class="quiz-choice-pill" onclick="CAA.storiesModule.answerQuiz(${qIdx}, ${optIdx})">
                ${escapeHtml(opt)}
              </button>
            `).join("")}
          </div>
          <div class="quiz-explanation-box" id="quiz-exp-${qIdx}">
            💡 <strong>Explication :</strong> ${escapeHtml(q.explanation)}
          </div>
        </div>
      `;
    });

    quizHtml += `</div>`;
    container.innerHTML = quizHtml;
  }

  function answerQuiz(qIdx, selectedOptIdx) {
    if (!currentStory || !currentStory.quiz || !currentStory.quiz[qIdx]) return;
    const qData = currentStory.quiz[qIdx];
    const card = document.getElementById(`quiz-q-card-${qIdx}`);
    if (!card) return;

    const buttons = card.querySelectorAll(".quiz-choice-pill");
    buttons.forEach((btn, idx) => {
      btn.classList.add("locked");
      if (idx === qData.answer) {
        btn.classList.add("correct");
      } else if (idx === selectedOptIdx) {
        btn.classList.add("wrong");
      }
    });

    const exp = document.getElementById(`quiz-exp-${qIdx}`);
    if (exp) exp.style.display = "block";

    // Vérifier si toutes les questions ont été répondues
    checkQuizCompletion();
  }

  function checkQuizCompletion() {
    const quiz = currentStory.quiz || [];
    const total = quiz.length;
    let answered = 0;
    let score = 0;

    quiz.forEach((q, idx) => {
      const card = document.getElementById(`quiz-q-card-${idx}`);
      if (card && card.querySelector(".quiz-choice-pill.locked")) {
        answered++;
        if (card.querySelector(`.quiz-choice-pill.correct.wrong`) === null && card.querySelector(`.quiz-choice-pill.correct`)) {
          // Si l'option correcte a été sélectionnée sans faute
          const correctBtn = card.querySelectorAll(".quiz-choice-pill")[q.answer];
          if (correctBtn && !card.querySelector(".quiz-choice-pill.wrong")) {
            score++;
          }
        }
      }
    });

    if (answered === total) {
      const badge = document.getElementById("storyQuizScoreBadge");
      if (badge) {
        badge.style.display = "inline-block";
        badge.textContent = `Score final : ${score} / ${total}`;
      }
      if (score === total && window.CAA && window.CAA.util && window.CAA.util.confetti) {
        window.CAA.util.confetti(1800);
      }
    }
  }

  // --- GLOSSAIRE DE L'HISTOIRE ---
  function buildStoryGlossary() {
    const container = document.getElementById("storyGlossaryGrid");
    if (!container || !currentStory) return;

    const vocab = currentStory.vocabulary || {};
    const keys = Object.keys(vocab);

    if (!keys.length) {
      container.innerHTML = "<p style='color:var(--muted);'>Glossaire standard disponible dans le texte.</p>";
      return;
    }

    container.innerHTML = keys.map(k => {
      const item = vocab[k];
      return `
        <div style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <strong style="color:var(--ink);">${escapeHtml(k)}</strong>
            ${item.ipa ? `<span style="font-size:0.8rem;color:var(--muted);font-family:monospace;margin-left:6px;">${escapeHtml(item.ipa)}</span>` : ""}
            <div style="font-size:0.85rem;color:#059669;font-weight:600;margin-top:2px;">${escapeHtml(item.fr)}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="CAA.storiesModule.speakSingleWord('${escapeHtml(k)}')" title="Écouter la prononciation">
            🔊
          </button>
        </div>
      `;
    }).join("");
  }

  // --- CONFIGURATION DES ÉCOUTEURS D'ÉVÉNEMENTS ---
  function setupEventListeners() {
    // Filtre de niveau
    const levelFilter = document.getElementById("storyLevelFilter");
    if (levelFilter) {
      levelFilter.addEventListener("change", () => {
        const searchVal = document.getElementById("storySearchInput")?.value || "";
        renderLibrary(levelFilter.value, searchVal);
      });
    }

    // Barre de recherche
    const searchInput = document.getElementById("storySearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const levelVal = document.getElementById("storyLevelFilter")?.value || "";
        renderLibrary(levelVal, searchInput.value);
      });
    }

    // Bouton retour du lecteur
    const backBtn = document.getElementById("btnBackToStories");
    if (backBtn) {
      backBtn.addEventListener("click", closeStoryReader);
    }

    // Bouton de lecture audio intégrale
    const playBtn = document.getElementById("btnPlayStoryAudio");
    if (playBtn) {
      playBtn.addEventListener("click", toggleNarration);
    }

    const stopBtn = document.getElementById("btnStopStoryAudio");
    if (stopBtn) {
      stopBtn.addEventListener("click", stopNarration);
    }

    // Sélecteur de vitesse de narration
    const speedSelect = document.getElementById("storySpeedSelect");
    if (speedSelect) {
      speedSelect.addEventListener("change", () => {
        narrationSpeed = parseFloat(speedSelect.value) || 0.9;
      });
    }

    // Contrôles de taille de police
    const fontPlus = document.getElementById("btnFontPlus");
    if (fontPlus) {
      fontPlus.addEventListener("click", () => {
        if (currentFontSize < 1.6) currentFontSize += 0.1;
        const container = document.getElementById("storyBodyText");
        if (container) container.style.fontSize = `${currentFontSize}rem`;
      });
    }

    const fontMinus = document.getElementById("btnFontMinus");
    if (fontMinus) {
      fontMinus.addEventListener("click", () => {
        if (currentFontSize > 0.95) currentFontSize -= 0.1;
        const container = document.getElementById("storyBodyText");
        if (container) container.style.fontSize = `${currentFontSize}rem`;
      });
    }

    // Carnet de vocabulaire modal
    const openSavedBtn = document.getElementById("btnOpenSavedWords");
    if (openSavedBtn) {
      openSavedBtn.addEventListener("click", openSavedWordsModal);
    }

    const closeSavedBtn = document.getElementById("btnCloseSavedWordsModal");
    if (closeSavedBtn) {
      closeSavedBtn.addEventListener("click", closeSavedWordsModal);
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    init,
    renderLibrary,
    resetFilters,
    openStory,
    closeStoryReader,
    speakSingleWord,
    toggleNarration,
    stopNarration,
    answerQuiz,
    openSavedWordsModal,
    closeSavedWordsModal,
    removeSavedWord
  };
})();
