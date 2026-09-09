/**
 * Club Anglais Accra — Teaching & Google Forms Evaluation Module (js/teaching.js)
 * Fixed version: teacher joins Socket.IO room after form creation,
 * real-time submission updates work, student form is clean & professional.
 */

window.CAA = window.CAA || {};

CAA.teaching = (function () {
  let socket = null;
  let activeRole = 'teacher'; // 'teacher' | 'student'
  let currentRoom = null;
  let userStudent = { name: '', email: '', code: '' };
  let localQuestions = [];
  let studentAnswers = {}; // qIndex -> selectedOptionIndex (number)
  let liveSubmissions = [];
  let sessionTimerInterval = null;
  let sessionStartTime = null;
  let sessionDurationSeconds = 0;
  let pollInterval = null;   // Polling interval for teacher results refresh

  // ------------------------------------------------------------------
  // Default starter questions (used as demo / when no draft saved)
  // ------------------------------------------------------------------
  const defaultQuestions = [
    {
      category: "Gerund vs Infinitive",
      question: "I am really looking forward to _____ you at the conference in Accra.",
      options: ["see", "seeing", "to see", "seen"],
      correctIndex: 1,
      explanation: "Après 'look forward to', le 'to' est une préposition qui exige le gérondif (-ING) : 'look forward to seeing'."
    },
    {
      category: "Gerund vs Infinitive",
      question: "She avoided _____ about the sensitive budget issue during the team meeting.",
      options: ["talk", "talking", "to talk", "talked"],
      correctIndex: 1,
      explanation: "Le verbe 'avoid' est toujours suivi de la forme en -ING : 'avoid doing something'."
    },
    {
      category: "Prepositions",
      question: "Our next club session will take place _____ Monday _____ 6:30 PM.",
      options: ["in / at", "on / at", "at / on", "on / in"],
      correctIndex: 1,
      explanation: "'ON' pour les jours de la semaine (on Monday) et 'AT' pour les heures précises (at 6:30 PM)."
    },
    {
      category: "Prepositions",
      question: "They have lived _____ Accra _____ more than ten years now.",
      options: ["at / since", "in / for", "in / since", "at / for"],
      correctIndex: 1,
      explanation: "'IN' pour une ville ou un pays, 'FOR' pour exprimer une durée."
    },
    {
      category: "Phrasal Verbs",
      question: "Never give _____ on your dreams, even when challenges arise.",
      options: ["in", "off", "up", "out"],
      correctIndex: 2,
      explanation: "'Give up' signifie abandonner ou renoncer."
    },
    {
      category: "Conditional Sentences",
      question: "If I _____ you, I would take advantage of every speaking practice opportunity.",
      options: ["was", "were", "am", "have been"],
      correctIndex: 1,
      explanation: "Dans le 2ème conditionnel (situation imaginaire), le subjonctif 'were' est recommandé avec 'I'."
    }
  ];

  // ------------------------------------------------------------------
  // Socket.IO
  // ------------------------------------------------------------------
  function initSocket() {
    if (!socket && typeof io !== 'undefined') {
      try {
        socket = io({ reconnectionAttempts: 5, timeout: 5000 });
        setupSocketListeners();
      } catch (e) {
        console.warn('Socket connection note:', e);
      }
    }
    return socket;
  }

  function setupSocketListeners() {
    if (!socket) return;

    // When teacher receives a student submission in real-time
    socket.on('teaching_submission_received', (data) => {
      if (activeRole !== 'teacher') return;
      if (!data || !data.submission) return;
      // Only handle if it matches the current room
      if (data.code && currentRoom && data.code !== currentRoom.code) return;

      const sub = data.submission;
      const existingIdx = liveSubmissions.findIndex(s => s.email === sub.email);
      if (existingIdx >= 0) {
        liveSubmissions[existingIdx] = sub;
      } else {
        liveSubmissions.unshift(sub);
      }
      updateTeacherSubmissionsUI();
      showToast(`Nouvelle copie reçue : ${sub.name} — ${sub.score}/${sub.total} (${sub.percentage}%)`);
    });

    socket.on('teaching_form_closed', (data) => {
      if (activeRole === 'student') {
        showToast("L'enseignant a clôturé cette session d'évaluation.");
        const submitBtn = document.getElementById('submitFormBtn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Évaluation clôturée par l'enseignant";
          submitBtn.style.opacity = '0.5';
        }
      }
    });

    socket.on('teaching_error', (data) => {
      showToast(data.message || 'Une erreur est survenue.');
    });
  }

  // Teacher explicitly joins the Socket.IO room so it receives real-time events
  function teacherJoinSocketRoom(code) {
    if (socket && socket.connected) {
      socket.emit('teaching_teacher_watch', { code });
    } else {
      // Try again once connected
      if (socket) {
        socket.once('connect', () => {
          socket.emit('teaching_teacher_watch', { code });
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // Init & URL params
  // ------------------------------------------------------------------
  function init() {
    initSocket();

    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code') || urlParams.get('form');

    if (codeParam) {
      showStudentJoin(codeParam.toUpperCase().trim());
    } else {
      loadSavedTeacherDraft();
      showTeacherSetup();
    }
  }

  function loadSavedTeacherDraft() {
    try {
      const saved = localStorage.getItem('caa_teaching_form_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          localQuestions = parsed.questions;
          if (parsed.title) {
            const tInput = document.getElementById('sessionTitleInput');
            if (tInput) tInput.value = parsed.title;
          }
          if (parsed.teacherName) {
            const nameInput = document.getElementById('teacherNameInput');
            if (nameInput) nameInput.value = parsed.teacherName;
          }
          if (parsed.description) {
            const descInput = document.getElementById('sessionDescInput');
            if (descInput) descInput.value = parsed.description;
          }
          return;
        }
      }
    } catch (e) {}
    localQuestions = JSON.parse(JSON.stringify(defaultQuestions));
  }

  function saveTeacherDraft() {
    try {
      const title = (document.getElementById('sessionTitleInput') || {}).value || '';
      const teacherName = (document.getElementById('teacherNameInput') || {}).value || '';
      const description = (document.getElementById('sessionDescInput') || {}).value || '';
      localStorage.setItem('caa_teaching_form_draft', JSON.stringify({
        title, teacherName, description, questions: localQuestions
      }));
    } catch (e) {}
  }

  // ------------------------------------------------------------------
  // Teacher Form Builder
  // ------------------------------------------------------------------
  function addEmptyQuestion() {
    localQuestions.push({
      category: "Grammaire & Vocabulaire",
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: ""
    });
    renderTeacherQuestionsList();
    saveTeacherDraft();
  }

  function renderTeacherQuestionsList() {
    const listEl = document.getElementById('teacherQuestionsContainer');
    const countBadge = document.getElementById('teacherQCountBadge');
    if (countBadge) countBadge.textContent = `${localQuestions.length} question(s)`;
    if (!listEl) return;

    if (localQuestions.length === 0) {
      listEl.innerHTML = `
        <div class="empty-questions-card">
          <p>Aucune question dans ce formulaire pour le moment.</p>
          <button class="btn btn-primary btn-sm mt-sm" onclick="CAA.teaching.addEmptyQuestion()">+ Ajouter la première question</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = localQuestions.map((q, qIdx) => `
      <div class="q-builder-card" id="qCard_${qIdx}">
        <div class="q-card-top-bar">
          <div class="q-card-index-title">
            <span class="q-number-pill">Question ${qIdx + 1}</span>
            <input type="text" class="t-input-compact" value="${escapeHtml(q.category || 'Catégorie')}"
              placeholder="Catégorie (ex: Grammaire)" onchange="CAA.teaching.updateQField(${qIdx}, 'category', this.value)" />
          </div>
          <div class="q-card-actions">
            <button class="btn-action" title="Monter" onclick="CAA.teaching.moveQuestion(${qIdx}, -1)">↑</button>
            <button class="btn-action" title="Descendre" onclick="CAA.teaching.moveQuestion(${qIdx}, 1)">↓</button>
            <button class="btn-action btn-delete" title="Supprimer" onclick="CAA.teaching.deleteQuestion(${qIdx})">✕</button>
          </div>
        </div>

        <div class="form-group-t mt-sm">
          <label class="gform-field-label">Énoncé de la question :</label>
          <input type="text" class="t-input q-text-input" value="${escapeHtml(q.question)}"
            placeholder="Ex: I look forward to _____ you." oninput="CAA.teaching.updateQField(${qIdx}, 'question', this.value)" />
        </div>

        <div class="q-options-builder-grid">
          ${q.options.map((opt, optIdx) => `
            <div class="q-opt-input-row ${optIdx === q.correctIndex ? 'is-correct-row' : ''}">
              <label class="radio-correct-label" title="Cocher comme bonne réponse">
                <input type="radio" name="correctOpt_${qIdx}" ${optIdx === q.correctIndex ? 'checked' : ''}
                  onchange="CAA.teaching.setCorrectOption(${qIdx}, ${optIdx})" />
                <span class="opt-letter-tag">${['A', 'B', 'C', 'D'][optIdx]}</span>
              </label>
              <input type="text" class="t-input opt-text-input" value="${escapeHtml(opt)}"
                placeholder="Option ${['A', 'B', 'C', 'D'][optIdx]}" oninput="CAA.teaching.updateOptionField(${qIdx}, ${optIdx}, this.value)" />
            </div>
          `).join('')}
        </div>

        <div class="form-group-t mt-sm">
          <label class="gform-field-label">Explication pédagogique &amp; Règle grammaticale :</label>
          <textarea class="t-input t-textarea" rows="2"
            placeholder="Explication affichée lors de la correction automatique..."
            oninput="CAA.teaching.updateQField(${qIdx}, 'explanation', this.value)">${escapeHtml(q.explanation || '')}</textarea>
        </div>
      </div>
    `).join('');
  }

  function updateQField(qIdx, field, val) {
    if (localQuestions[qIdx]) {
      localQuestions[qIdx][field] = val;
      saveTeacherDraft();
    }
  }

  function updateOptionField(qIdx, optIdx, val) {
    if (localQuestions[qIdx] && localQuestions[qIdx].options) {
      localQuestions[qIdx].options[optIdx] = val;
      saveTeacherDraft();
    }
  }

  function setCorrectOption(qIdx, optIdx) {
    if (localQuestions[qIdx]) {
      localQuestions[qIdx].correctIndex = optIdx;
      saveTeacherDraft();
      renderTeacherQuestionsList();
    }
  }

  function deleteQuestion(qIdx) {
    localQuestions.splice(qIdx, 1);
    saveTeacherDraft();
    renderTeacherQuestionsList();
  }

  function moveQuestion(qIdx, dir) {
    const targetIdx = qIdx + dir;
    if (targetIdx < 0 || targetIdx >= localQuestions.length) return;
    const item = localQuestions.splice(qIdx, 1)[0];
    localQuestions.splice(targetIdx, 0, item);
    saveTeacherDraft();
    renderTeacherQuestionsList();
  }

  // ------------------------------------------------------------------
  // Publish / Create Form
  // ------------------------------------------------------------------
  async function createTeacherRoom() {
    const title = (document.getElementById('sessionTitleInput') || {}).value || "Évaluation d'Anglais";
    const teacherName = (document.getElementById('teacherNameInput') || {}).value || 'Formateur';
    const description = (document.getElementById('sessionDescInput') || {}).value || '';
    const timeLimitMinutes = parseInt((document.getElementById('timePerQSelect') || {}).value, 10) || 0;

    if (localQuestions.length === 0) {
      showToast('Veuillez ajouter au moins une question à votre formulaire.');
      return;
    }

    for (let i = 0; i < localQuestions.length; i++) {
      const q = localQuestions[i];
      if (!q.question || !q.question.trim()) {
        showToast(`La question #${i + 1} est vide. Veuillez saisir son énoncé.`);
        return;
      }
      if (q.options.some(opt => !opt || !opt.trim())) {
        showToast(`Toutes les options (A, B, C, D) de la question #${i + 1} doivent être renseignées.`);
        return;
      }
    }

    // Show loading state
    const launchBtn = document.querySelector('#teacherSetupView .btn-primary');
    if (launchBtn) { launchBtn.textContent = 'Publication en cours...'; launchBtn.disabled = true; }

    activeRole = 'teacher';
    liveSubmissions = [];
    sessionStartTime = Date.now();
    sessionDurationSeconds = timeLimitMinutes * 60;

    try {
      const res = await fetch('/api/teaching/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          teacherName: teacherName.trim(),
          timePerQuestion: timeLimitMinutes,
          questions: localQuestions
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          currentRoom = {
            code: data.code,
            title: title.trim(),
            description: description.trim(),
            teacherName: teacherName.trim(),
            timePerQuestion: timeLimitMinutes,
            questions: localQuestions,
            submissions: [],
            status: 'open'
          };

          // CRITICAL FIX: Make sure socket is ready, then join the Socket.IO room
          initSocket();
          if (socket) {
            if (socket.connected) {
              socket.emit('teaching_teacher_watch', { code: data.code });
            } else {
              socket.once('connect', () => {
                socket.emit('teaching_teacher_watch', { code: data.code });
              });
            }
          }

          renderTeacherLobby(currentRoom);
          startTeacherSessionTimer();
          startTeacherPolling(data.code);
          showToast(`Formulaire publié avec succès ! Code : ${data.code}`);
          return;
        }
      }
    } catch (err) {
      console.warn('REST API offline — fallback local:', err);
    }

    // Restore button
    if (launchBtn) { launchBtn.textContent = 'Lancer & Ouvrir l\'Évaluation'; launchBtn.disabled = false; }

    // Local fallback (no server)
    const code = 'TEA' + Math.floor(100 + Math.random() * 900);
    currentRoom = {
      code,
      title: title.trim(),
      description: description.trim(),
      teacherName: teacherName.trim(),
      timePerQuestion: timeLimitMinutes,
      questions: localQuestions,
      submissions: [],
      status: 'open'
    };

    renderTeacherLobby(currentRoom);
    startTeacherSessionTimer();
    showToast(`Formulaire créé localement. Code : ${code}`);
  }

  // ------------------------------------------------------------------
  // Polling: teacher refreshes submission list every 5s from REST API
  // ------------------------------------------------------------------
  function startTeacherPolling(code) {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      if (!currentRoom || currentRoom.code !== code) {
        clearInterval(pollInterval);
        return;
      }
      try {
        const res = await fetch(`/api/teaching/forms/${code}/results`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && Array.isArray(data.submissions)) {
            // Merge: keep local order but update with server truth
            liveSubmissions = data.submissions.slice().reverse();
            updateTeacherSubmissionsUI();
          }
        }
      } catch (e) { /* silent fail */ }
    }, 4000);
  }

  // ------------------------------------------------------------------
  // Session Timer (teacher side)
  // ------------------------------------------------------------------
  function startTeacherSessionTimer() {
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionStartTime = Date.now();

    function updateTimerDisplay() {
      const timerEl = document.getElementById('teacherLiveTimerDisplay');
      const progressTrack = document.getElementById('teacherTimerProgressFill');
      if (!timerEl) return;

      const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);

      if (sessionDurationSeconds > 0) {
        const remaining = Math.max(0, sessionDurationSeconds - elapsedSeconds);
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerEl.textContent = `Temps restant : ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const pct = Math.min(100, (elapsedSeconds / sessionDurationSeconds) * 100);
        if (progressTrack) progressTrack.style.width = `${pct}%`;

        if (remaining <= 0) {
          timerEl.textContent = "Temps écoulé — Session expirée";
          if (progressTrack) progressTrack.style.background = '#ef4444';
          clearInterval(sessionTimerInterval);
        }
      } else {
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        timerEl.textContent = `Durée écoulée : ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} (Illimité)`;
        if (progressTrack) progressTrack.style.width = '100%';
      }
    }

    updateTimerDisplay();
    sessionTimerInterval = setInterval(updateTimerDisplay, 1000);
  }

  // ------------------------------------------------------------------
  // Teacher Live Dashboard
  // ------------------------------------------------------------------
  function renderTeacherLobby(room) {
    hideAllScreens();
    const lobbyEl = document.getElementById('teacherLobbyView');
    if (!lobbyEl) return;
    lobbyEl.style.display = 'block';

    const el = id => document.getElementById(id);

    const shareUrl = `${window.location.origin}${window.location.pathname}?code=${room.code}`;

    if (el('teacherRoomCodeDisplay')) el('teacherRoomCodeDisplay').textContent = room.code;
    if (el('teacherLobbyTitle')) el('teacherLobbyTitle').textContent = room.title || "Formulaire d'évaluation";
    if (el('teacherLobbyTeacherName')) el('teacherLobbyTeacherName').textContent = room.teacherName || 'Formateur';
    if (el('teacherLobbyQCount')) el('teacherLobbyQCount').textContent = (room.questions || localQuestions).length;
    if (el('teacherShareUrlInput')) el('teacherShareUrlInput').value = shareUrl;

    const statusBadge = el('teacherSessionStatusBadge');
    if (statusBadge) {
      if (room.status === 'closed') {
        statusBadge.textContent = 'Session Clôturée';
        statusBadge.className = 'session-status-badge status-closed';
      } else {
        statusBadge.textContent = 'En cours — Ouvert aux réponses';
        statusBadge.className = 'session-status-badge status-active';
      }
    }

    const tabTeach = document.getElementById('tabTeacherBtn');
    const tabStu = document.getElementById('tabStudentBtn');
    if (tabTeach) tabTeach.classList.add('active');
    if (tabStu) tabStu.classList.remove('active');

    updateTeacherSubmissionsUI();
  }

  function updateTeacherSubmissionsUI() {
    const tbody = document.getElementById('teacherSubmissionsTableBody');
    const badge = document.getElementById('teacherSubmissionsCountBadge');
    const statSubCount = document.getElementById('statSubCount');
    const statAvgPct = document.getElementById('statAvgPct');
    const statSuccessRate = document.getElementById('statSuccessRate');

    const count = liveSubmissions.length;
    if (badge) badge.textContent = `${count} copie(s) reçue(s)`;
    if (statSubCount) statSubCount.textContent = String(count);

    const questions = (currentRoom && currentRoom.questions) ? currentRoom.questions : localQuestions;
    const totalQ = questions.length;

    if (count > 0) {
      const sumScores = liveSubmissions.reduce((s, sub) => s + (sub.score || 0), 0);
      const avg = (sumScores / count).toFixed(1);
      const avgPct = Math.round((parseFloat(avg) / Math.max(1, totalQ)) * 100);
      const passedCount = liveSubmissions.filter(s => (s.percentage !== undefined ? s.percentage : 0) >= 50).length;
      const successRate = Math.round((passedCount / count) * 100);

      if (statAvgPct) statAvgPct.textContent = `${avgPct}% (${avg}/${totalQ})`;
      if (statSuccessRate) statSuccessRate.textContent = `${successRate}% (${passedCount}/${count})`;
      renderClassMistakesAnalytics(questions, liveSubmissions);
    } else {
      if (statAvgPct) statAvgPct.textContent = '-';
      if (statSuccessRate) statSuccessRate.textContent = '-';
      const analyticsContainer = document.getElementById('classMistakesAnalyticsList');
      if (analyticsContainer) {
        analyticsContainer.innerHTML = `<div class="empty-analytics-msg">En attente de copies d'élèves pour analyser les questions les plus difficiles.</div>`;
      }
    }

    if (!tbody) return;

    if (count === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; color:var(--muted); padding:40px 20px;">
            En attente des premières soumissions. Partagez le lien ou le code aux élèves.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = liveSubmissions.map((s, idx) => {
      const pct = s.percentage !== undefined ? s.percentage : Math.round(((s.score || 0) / Math.max(1, s.total || totalQ)) * 100);
      const isPass = pct >= 60;
      const mistakesCount = s.mistakesCount !== undefined ? s.mistakesCount : (s.mistakes ? s.mistakes.length : (totalQ - (s.score || 0)));
      return `
        <tr>
          <td><strong>#${idx + 1}</strong></td>
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td><code style="font-size:0.85rem;">${escapeHtml(s.email)}</code></td>
          <td><strong>${s.score || 0} / ${s.total || totalQ}</strong></td>
          <td><span class="score-pill ${isPass ? 'badge-good' : 'badge-bad'}">${pct}%</span></td>
          <td style="text-align:right;">
            <button class="btn btn-outline btn-sm" onclick="CAA.teaching.inspectStudentCopy(${idx})">
              Voir la copie${mistakesCount > 0 ? ` (${mistakesCount} erreur${mistakesCount > 1 ? 's' : ''})` : ''}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderClassMistakesAnalytics(questions, submissions) {
    const container = document.getElementById('classMistakesAnalyticsList');
    if (!container || submissions.length === 0) return;

    const totalSubs = submissions.length;

    const qStats = questions.map((q, idx) => {
      let failCount = 0;
      submissions.forEach(sub => {
        const details = sub.detailedResults || [];
        if (details[idx] && !details[idx].isCorrect) {
          failCount++;
        } else if (sub.mistakes && sub.mistakes.some(m => m.qIndex === idx)) {
          failCount++;
        }
      });
      const failPct = Math.round((failCount / totalSubs) * 100);
      return { qIndex: idx, question: q.question, category: q.category, failCount, failPct };
    });

    qStats.sort((a, b) => b.failPct - a.failPct);

    container.innerHTML = qStats.map(stat => `
      <div class="class-q-stat-card ${stat.failPct >= 50 ? 'high-fail' : ''}">
        <div class="stat-q-header">
          <span class="stat-q-num">Q${stat.qIndex + 1}</span>
          <span class="stat-q-cat">${escapeHtml(stat.category || 'Général')}</span>
          <span class="stat-q-fail-badge ${stat.failPct >= 50 ? 'badge-bad' : 'badge-good'}">
            ${stat.failPct}% d'erreurs — ${stat.failCount}/${totalSubs} élèves
          </span>
        </div>
        <p class="stat-q-text">${escapeHtml(stat.question)}</p>
      </div>
    `).join('');
  }

  // ------------------------------------------------------------------
  // Teacher: Inspect student copy modal
  // ------------------------------------------------------------------
  function inspectStudentCopy(subIndex) {
    const sub = liveSubmissions[subIndex];
    if (!sub) return;

    const modal = document.getElementById('teacherStudentInspectModal');
    if (!modal) return;

    document.getElementById('modalStudentName').textContent = sub.name;
    document.getElementById('modalStudentEmail').textContent = sub.email;
    document.getElementById('modalStudentScore').textContent = `${sub.score} / ${sub.total || localQuestions.length} (${sub.percentage}%)`;

    const detailsContainer = document.getElementById('modalStudentAnswersList');
    const resultsToDisplay = sub.detailedResults || [];

    if (detailsContainer) {
      if (resultsToDisplay.length === 0) {
        detailsContainer.innerHTML = `
          <div class="empty-questions-card">
            <p>Score enregistré : <strong>${sub.score} / ${sub.total}</strong> (${sub.percentage}%).<br>
            Le détail des réponses n'est pas disponible pour cette copie (soumise hors connexion).</p>
          </div>
        `;
      } else {
        detailsContainer.innerHTML = resultsToDisplay.map((r, idx) => {
          const isRight = r.isCorrect;
          return `
            <div class="gform-result-card ${isRight ? 'success-card' : 'mistake-card'}">
              <div class="gform-card-status-bar ${isRight ? 'bar-ok' : 'bar-ko'}"></div>
              <div class="gform-result-header">
                <span class="status-tag ${isRight ? 'tag-ok' : 'tag-ko'}">
                  ${isRight ? 'Correct — +1 point' : 'Erreur — 0 point'}
                </span>
                <span class="gform-q-cat">${escapeHtml(r.category || 'Anglais')}</span>
              </div>
              <p class="gform-q-sentence"><strong>${idx + 1}. ${escapeHtml(r.question)}</strong></p>
              <div class="gform-answers-comparison">
                <div class="ans-box ${isRight ? 'ans-correct' : 'ans-user-wrong'}">
                  <span class="ans-label">Réponse de l'élève :</span>
                  <strong>${escapeHtml(r.userOptionText)}</strong>
                </div>
                ${!isRight ? `
                  <div class="ans-box ans-correct">
                    <span class="ans-label">Bonne réponse :</span>
                    <strong>${escapeHtml(r.correctOptionText)}</strong>
                  </div>
                ` : ''}
              </div>
              ${r.explanation ? `
                <div class="gform-explanation-box">
                  <strong>Règle grammaticale :</strong>
                  <p>${escapeHtml(r.explanation)}</p>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }
    }

    modal.style.display = 'flex';
  }

  function closeInspectModal() {
    const modal = document.getElementById('teacherStudentInspectModal');
    if (modal) modal.style.display = 'none';
  }

  // ------------------------------------------------------------------
  // Close / End evaluation
  // ------------------------------------------------------------------
  async function closeTeacherEvaluation() {
    if (!currentRoom) return;

    if (!confirm("Voulez-vous vraiment clôturer cette évaluation ?\nLes élèves ne pourront plus soumettre de nouvelles réponses.")) {
      return;
    }

    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    if (pollInterval) clearInterval(pollInterval);

    currentRoom.status = 'closed';

    try {
      await fetch(`/api/teaching/forms/${currentRoom.code}/close`, { method: 'POST' });
    } catch (e) {}

    renderTeacherLobby(currentRoom);
    showToast("Évaluation clôturée. Les notes sont verrouillées.");
  }

  // ------------------------------------------------------------------
  // CSV Export
  // ------------------------------------------------------------------
  function exportGradesCSV() {
    if (liveSubmissions.length === 0) {
      showToast("Aucune copie à exporter pour le moment.");
      return;
    }

    const totalQ = (currentRoom && currentRoom.questions) ? currentRoom.questions.length : localQuestions.length;
    const title = (currentRoom && currentRoom.title) ? currentRoom.title : 'Evaluation';
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `"${title.replace(/"/g, '""')}"\n`;
    csvContent += `"Code : ${(currentRoom || {}).code || ''}"\n\n`;
    csvContent += "Rang,Nom,Email,Score,Total,Pourcentage,Erreurs,Date de soumission\n";

    liveSubmissions.forEach((s, idx) => {
      const pct = s.percentage !== undefined ? s.percentage : Math.round(((s.score || 0) / Math.max(1, s.total || totalQ)) * 100);
      const mistakes = s.mistakesCount !== undefined ? s.mistakesCount : (s.mistakes ? s.mistakes.length : '');
      const row = [
        idx + 1,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        s.score || 0,
        s.total || totalQ,
        `${pct}%`,
        mistakes,
        `"${s.submittedAt || new Date().toISOString()}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `notes_${(currentRoom && currentRoom.code) || 'anglais'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Export CSV téléchargé.");
  }

  function copyRoomCode() {
    if (!currentRoom) return;
    navigator.clipboard && navigator.clipboard.writeText(currentRoom.code).then(() => {
      showToast(`Code ${currentRoom.code} copié dans le presse-papier !`);
    });
  }

  function copyShareUrl() {
    const shareUrlInput = document.getElementById('teacherShareUrlInput');
    if (shareUrlInput && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrlInput.value).then(() => {
        showToast('Lien direct copié ! Envoyez-le à vos élèves.');
      });
    }
  }

  function previewAsStudent() {
    showStudentJoin(currentRoom ? currentRoom.code : '');
    showToast('Mode aperçu élève activé.');
  }

  // ------------------------------------------------------------------
  // Student Flow: Registration -> Form -> Results
  // ------------------------------------------------------------------
  function showStudentJoin(prefilledCode) {
    hideAllScreens();
    const el = document.getElementById('studentJoinView');
    if (el) el.style.display = 'block';

    const tabStu = document.getElementById('tabStudentBtn');
    const tabTeach = document.getElementById('tabTeacherBtn');
    if (tabStu) tabStu.classList.add('active');
    if (tabTeach) tabTeach.classList.remove('active');

    const codeInput = document.getElementById('studentJoinCode');
    if (codeInput && prefilledCode) codeInput.value = prefilledCode;

    // If code is pre-filled, auto-load the form title from server
    if (prefilledCode) {
      fetchFormMeta(prefilledCode);
    }
  }

  async function fetchFormMeta(code) {
    try {
      const res = await fetch(`/api/teaching/forms/${code}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.form) {
          const titleEl = document.getElementById('studentFormDisplayTitle');
          const descEl = document.getElementById('studentFormDisplayDesc');
          if (titleEl) titleEl.textContent = data.form.title;
          if (descEl && data.form.description) descEl.textContent = data.form.description;
        }
      }
    } catch (e) {}
  }

  async function joinStudentRoom() {
    const nameInput = document.getElementById('studentJoinName');
    const emailInput = document.getElementById('studentJoinEmail');
    const codeInput = document.getElementById('studentJoinCode');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

    if (!name) {
      nameInput && nameInput.focus();
      showToast('Veuillez renseigner votre Nom complet.');
      return;
    }
    if (!email || !email.includes('@')) {
      emailInput && emailInput.focus();
      showToast('Veuillez renseigner une Adresse e-mail valide.');
      return;
    }

    userStudent = { name, email, code };
    activeRole = 'student';
    studentAnswers = {};

    // Show loading indicator
    const submitBtn = document.querySelector('#studentJoinView button[type="submit"]');
    if (submitBtn) { submitBtn.textContent = 'Chargement du formulaire...'; submitBtn.disabled = true; }

    if (code) {
      try {
        const res = await fetch(`/api/teaching/forms/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && data.form) {
            if (data.form.status === 'closed') {
              showToast("Cette évaluation a été clôturée par l'enseignant.");
              if (submitBtn) { submitBtn.textContent = 'Ouvrir le formulaire d\'évaluation →'; submitBtn.disabled = false; }
              return;
            }
            currentRoom = {
              code: data.form.code,
              title: data.form.title,
              description: data.form.description,
              teacherName: data.form.teacherName,
              questions: data.form.questions,
              status: 'open'
            };
            // Student joins the Socket.IO room to receive close event
            initSocket();
            if (socket) {
              if (socket.connected) {
                socket.emit('teaching_teacher_watch', { code });
              } else {
                socket.once('connect', () => socket.emit('teaching_teacher_watch', { code }));
              }
            }
            startContinuousStudentForm(data.form.questions);
            return;
          } else if (!data.ok) {
            showToast(data.error || `Formulaire "${code}" introuvable. Vérifiez le code.`);
            if (submitBtn) { submitBtn.textContent = 'Ouvrir le formulaire d\'évaluation →'; submitBtn.disabled = false; }
            return;
          }
        }
      } catch (e) {
        console.warn('Fetch form error:', e);
      }
    }

    if (submitBtn) { submitBtn.textContent = 'Ouvrir le formulaire d\'évaluation →'; submitBtn.disabled = false; }

    // Fallback: use local questions
    const questionsToUse = (currentRoom && currentRoom.questions && currentRoom.questions.length > 0)
      ? currentRoom.questions
      : localQuestions;

    startContinuousStudentForm(questionsToUse);
  }

  function startContinuousStudentForm(questions) {
    hideAllScreens();
    const formView = document.getElementById('studentFormView');
    if (!formView) return;
    formView.style.display = 'block';

    const g = id => document.getElementById(id);

    if (g('sFormActiveTitle')) g('sFormActiveTitle').textContent = (currentRoom && currentRoom.title) || 'Évaluation d\'Anglais';
    if (g('sFormActiveDesc')) g('sFormActiveDesc').textContent = (currentRoom && currentRoom.description) || 'Répondez à toutes les questions obligatoires.';
    if (g('sFormUserDisplay')) g('sFormUserDisplay').textContent = userStudent.name;
    if (g('sFormEmailDisplay')) g('sFormEmailDisplay').textContent = userStudent.email;

    updateFormProgressUI(0, questions.length);

    const container = document.getElementById('studentFormQuestionsList');
    if (!container) return;

    // Build clean Google Forms-style question cards
    container.innerHTML = questions.map((q, qIdx) => `
      <div class="gform-card" id="studentQCard_${qIdx}">
        <div class="gform-field-header">
          <div class="gform-q-number-title">
            <span class="gform-q-num">Question ${qIdx + 1} / ${questions.length}</span>
            <span class="gform-q-cat">${escapeHtml(q.category || 'Anglais')}</span>
          </div>
          <p class="gform-q-sentence"><strong>${escapeHtml(q.question)}</strong> <span class="required-star">*</span></p>
        </div>

        <div class="gform-options-radio-list" role="radiogroup" aria-label="Options de réponse">
          ${q.options.map((opt, optIdx) => `
            <label class="gform-radio-option" id="label_q${qIdx}_opt${optIdx}">
              <input type="radio" name="student_q_${qIdx}" value="${optIdx}"
                onchange="CAA.teaching.recordStudentChoice(${qIdx}, ${optIdx})" />
              <span class="radio-opt-marker">${['A', 'B', 'C', 'D'][optIdx]}</span>
              <span class="radio-opt-text">${escapeHtml(opt)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function recordStudentChoice(qIdx, optIdx) {
    studentAnswers[qIdx] = optIdx;

    // Remove error highlight
    const card = document.getElementById(`studentQCard_${qIdx}`);
    if (card) card.classList.remove('gform-card-unanswered');

    // Highlight selected option visually
    const qOptions = document.querySelectorAll(`input[name="student_q_${qIdx}"]`);
    qOptions.forEach((radio, i) => {
      const label = radio.closest('.gform-radio-option');
      if (label) {
        label.classList.toggle('gform-option-selected', i === optIdx);
      }
    });

    const totalQuestions = (currentRoom && currentRoom.questions) ? currentRoom.questions.length : localQuestions.length;
    updateFormProgressUI(Object.keys(studentAnswers).length, totalQuestions);
  }

  function updateFormProgressUI(answered, total) {
    const progressBar = document.getElementById('sFormProgressBar');
    const progressText = document.getElementById('sFormProgressText');
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${answered} / ${total} question(s) répondue(s) (${pct}%)`;
  }

  // ------------------------------------------------------------------
  // Automatic Calculation & Submission
  // ------------------------------------------------------------------
  async function submitContinuousForm() {
    const questions = (currentRoom && currentRoom.questions && currentRoom.questions.length > 0)
      ? currentRoom.questions
      : localQuestions;

    const total = questions.length;

    // Validate: all questions answered
    const unanswered = [];
    for (let i = 0; i < total; i++) {
      if (studentAnswers[i] === undefined) unanswered.push(i);
    }

    if (unanswered.length > 0) {
      unanswered.forEach(i => {
        const card = document.getElementById(`studentQCard_${i}`);
        if (card) card.classList.add('gform-card-unanswered');
      });
      const firstCard = document.getElementById(`studentQCard_${unanswered[0]}`);
      if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`${unanswered.length} question(s) sans réponse. Veuillez tout compléter.`);
      return;
    }

    // Disable submit button
    const submitBtn = document.getElementById('submitFormBtn');
    if (submitBtn) { submitBtn.textContent = 'Calcul des résultats en cours...'; submitBtn.disabled = true; }

    const roomCode = (currentRoom && currentRoom.code) ? currentRoom.code : userStudent.code;

    // 1. Try server-side grading (authoritative)
    if (roomCode) {
      try {
        const res = await fetch(`/api/teaching/forms/${roomCode}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userStudent.name,
            email: userStudent.email,
            answers: studentAnswers
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.ok) {
            renderStudentCalculatedResults(data);
            return;
          }
        } else if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || "L'évaluation a été clôturée par le formateur.");
          if (submitBtn) { submitBtn.textContent = 'Soumettre le formulaire & Calculer les résultats'; submitBtn.disabled = false; }
          return;
        }
      } catch (err) {
        console.warn('Server submission failed, using local grading:', err);
      }
    }

    // 2. Local grading fallback
    let score = 0;
    const detailedResults = [];
    const mistakes = [];

    for (let i = 0; i < total; i++) {
      const q = questions[i];
      const selectedIndex = studentAnswers[i] !== undefined ? studentAnswers[i] : -1;
      const isCorrect = (selectedIndex === q.correctIndex);
      if (isCorrect) score++;

      const resItem = {
        qIndex: i,
        category: q.category,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: selectedIndex,
        userOptionText: selectedIndex >= 0 ? q.options[selectedIndex] : 'Non répondu',
        correctOptionText: q.options[q.correctIndex],
        isCorrect: isCorrect,
        explanation: q.explanation
      };

      detailedResults.push(resItem);
      if (!isCorrect) mistakes.push(resItem);
    }

    const pct = Math.round((score / total) * 100);

    const submissionObj = {
      name: userStudent.name,
      email: userStudent.email,
      score, total,
      percentage: pct,
      mistakesCount: mistakes.length,
      mistakes,
      detailedResults,
      submittedAt: new Date().toISOString()
    };

    // Notify teacher via socket
    if (socket && socket.connected && roomCode) {
      socket.emit('teaching_submit_final_score', { code: roomCode, student: submissionObj });
    }

    renderStudentCalculatedResults(submissionObj);
  }

  // ------------------------------------------------------------------
  // Student Results View
  // ------------------------------------------------------------------
  function renderStudentCalculatedResults(data) {
    hideAllScreens();
    const reportEl = document.getElementById('studentFinalReportView');
    if (!reportEl) return;
    reportEl.style.display = 'block';

    const { score, totalQuestions, total, percentage, mistakes, detailedResults } = data;
    const totalCount = totalQuestions || total || localQuestions.length;

    const g = id => document.getElementById(id);
    if (g('sReportStudentName')) g('sReportStudentName').textContent = userStudent.name;
    if (g('sReportStudentEmail')) g('sReportStudentEmail').textContent = userStudent.email;
    if (g('sReportScoreBig')) g('sReportScoreBig').textContent = `${score} / ${totalCount}`;
    if (g('sReportPct')) g('sReportPct').textContent = `${percentage}%`;

    const subEl = g('sReportSub');
    const accentBar = g('reportAccentBar');

    if (percentage >= 80) {
      if (accentBar) accentBar.style.background = '#10b981';
      if (subEl) subEl.textContent = 'Excellent travail ! Vous maîtrisez parfaitement les règles et notions de cette évaluation.';
    } else if (percentage >= 50) {
      if (accentBar) accentBar.style.background = '#2563eb';
      if (subEl) subEl.textContent = 'Bon travail. Révisez les points ci-dessous pour perfectionner vos automatismes grammaticaux.';
    } else {
      if (accentBar) accentBar.style.background = '#ef4444';
      if (subEl) subEl.textContent = 'Consultez attentivement vos erreurs ci-dessous et mémorisez les règles associées pour progresser.';
    }

    // Mistakes Section
    const mistakesSection = g('mistakesSectionWrap');
    const mistakesList = g('sReportMistakesList');

    if (!mistakes || mistakes.length === 0) {
      if (mistakesSection) mistakesSection.style.display = 'none';
    } else {
      if (mistakesSection) mistakesSection.style.display = 'block';
      if (mistakesList) {
        mistakesList.innerHTML = mistakes.map(m => `
          <div class="gform-result-card mistake-card">
            <div class="gform-card-status-bar bar-ko"></div>
            <div class="gform-result-header">
              <span class="status-tag tag-ko">Erreur — Question ${m.qIndex + 1}</span>
              <span class="gform-q-cat">${escapeHtml(m.category || 'Grammaire')}</span>
            </div>
            <p class="gform-q-sentence"><strong>${escapeHtml(m.question)}</strong></p>
            <div class="gform-answers-comparison">
              <div class="ans-box ans-user-wrong">
                <span class="ans-label">Votre réponse :</span>
                <strong>${escapeHtml(m.userOptionText)}</strong>
              </div>
              <div class="ans-box ans-correct">
                <span class="ans-label">Bonne réponse attendue :</span>
                <strong>${escapeHtml(m.correctOptionText)}</strong>
              </div>
            </div>
            <div class="gform-explanation-box">
              <strong>Règle &amp; Explication :</strong>
              <p>${escapeHtml(m.explanation || 'Consultez votre fiche de révision.')}</p>
            </div>
          </div>
        `).join('');
      }
    }

    // All answers detailed
    const allList = g('sReportAllList');
    if (allList && detailedResults) {
      allList.innerHTML = detailedResults.map((r, idx) => {
        const isRight = r.isCorrect;
        return `
          <div class="gform-result-card ${isRight ? 'success-card' : 'mistake-card'}">
            <div class="gform-card-status-bar ${isRight ? 'bar-ok' : 'bar-ko'}"></div>
            <div class="gform-result-header">
              <span class="status-tag ${isRight ? 'tag-ok' : 'tag-ko'}">
                ${isRight ? 'Correct — +1 point' : 'Incorrect — 0 point'}
              </span>
              <span class="gform-q-cat">${escapeHtml(r.category || 'Anglais')}</span>
            </div>
            <p class="gform-q-sentence"><strong>${idx + 1}. ${escapeHtml(r.question)}</strong></p>
            <div class="gform-answers-comparison">
              <div class="ans-box ${isRight ? 'ans-correct' : 'ans-user-wrong'}">
                <span class="ans-label">Votre choix :</span>
                <strong>${escapeHtml(r.userOptionText)}</strong>
              </div>
              ${!isRight ? `
                <div class="ans-box ans-correct">
                  <span class="ans-label">Bonne réponse :</span>
                  <strong>${escapeHtml(r.correctOptionText)}</strong>
                </div>
              ` : ''}
            </div>
            ${r.explanation ? `
              <div class="gform-explanation-box">
                <strong>Explication :</strong>
                <p>${escapeHtml(r.explanation)}</p>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function downloadStudentReport() {
    window.print();
  }

  // ------------------------------------------------------------------
  // Navigation Helpers
  // ------------------------------------------------------------------
  function hideAllScreens() {
    ['teacherSetupView', 'teacherLobbyView', 'studentJoinView', 'studentFormView', 'studentFinalReportView'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function showTeacherSetup() {
    hideAllScreens();
    const el = document.getElementById('teacherSetupView');
    if (el) el.style.display = 'block';

    const tabTeach = document.getElementById('tabTeacherBtn');
    const tabStu = document.getElementById('tabStudentBtn');
    if (tabTeach) tabTeach.classList.add('active');
    if (tabStu) tabStu.classList.remove('active');

    if (localQuestions.length === 0) {
      localQuestions = JSON.parse(JSON.stringify(defaultQuestions));
    }
    renderTeacherQuestionsList();
  }

  // ------------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------------
  function showToast(msg) {
    let toast = document.getElementById('teaching-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'teaching-toast';
      toast.className = 'teaching-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  return {
    init,
    showTeacherSetup,
    showStudentJoin,
    addEmptyQuestion,
    updateQField,
    updateOptionField,
    setCorrectOption,
    deleteQuestion,
    moveQuestion,
    createTeacherRoom,
    previewAsStudent,
    copyRoomCode,
    copyShareUrl,
    closeTeacherEvaluation,
    inspectStudentCopy,
    closeInspectModal,
    exportGradesCSV,
    joinStudentRoom,
    recordStudentChoice,
    submitContinuousForm,
    downloadStudentReport
  };
})();
