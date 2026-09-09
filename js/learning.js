/**
 * Club Anglais Accra — Learning Hub Interactive Logic
 * Modules: PDF Lessons & Viewer, Grammar & Preposition Exercises,
 * Phrasal Verbs Hub, Pronunciation Workshop, Irregular Verbs, Vocabulary.
 */

document.addEventListener('DOMContentLoaded', () => {

  // Global Content Access
  const content = (window.CAA && window.CAA.content) || {};
  const vocabulary = content.vocabulary || [];
  const pronunciationWords = content.pronunciationWords || [];
  const phrasalVerbs = content.phrasalVerbs || [];
  const irregularVerbs = content.irregularVerbs || [];
  const grammar = content.grammar || [];

  // Speech Synthesis Helper with configurable rate
  let currentAudioRate = 0.9;
  const audioRateSelect = document.getElementById('audioRateSelect');
  if (audioRateSelect) {
    audioRateSelect.addEventListener('change', () => {
      currentAudioRate = parseFloat(audioRateSelect.value) || 0.9;
    });
  }

  function speakWord(text, btnElement, lang = 'en-US') {
    if (!('speechSynthesis' in window)) {
      alert('La synthèse vocale n\'est pas supportée sur ce navigateur.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = currentAudioRate;

    if (btnElement) {
      btnElement.classList.add('speaking-active');
    }

    const resetBtn = () => {
      if (btnElement) btnElement.classList.remove('speaking-active');
    };

    utterance.onend = resetBtn;
    utterance.onerror = resetBtn;

    window.speechSynthesis.speak(utterance);
  }

  // --- STATS & COUNTERS ---
  function updateCounters(lessonCount = 0) {
    const el = id => document.getElementById(id);
    if (el('statVocab')) el('statVocab').textContent = vocabulary.length;
    if (el('statPron')) el('statPron').textContent = pronunciationWords.length;
    if (el('statPhrasal')) el('statPhrasal').textContent = phrasalVerbs.length;
    if (el('statIrregular')) el('statIrregular').textContent = irregularVerbs.length;
    if (el('statGrammar')) el('statGrammar').textContent = grammar.length;
    if (el('statLessons')) el('statLessons').textContent = lessonCount;
    if (el('statStories')) el('statStories').textContent = (window.CAA && window.CAA.stories ? window.CAA.stories.length : 5);

    if (el('badgeVocab')) el('badgeVocab').textContent = vocabulary.length;
    if (el('badgePron')) el('badgePron').textContent = pronunciationWords.length;
    if (el('badgePhrasal')) el('badgePhrasal').textContent = phrasalVerbs.length;
    if (el('badgeIrregular')) el('badgeIrregular').textContent = irregularVerbs.length;
    if (el('badgeGrammar')) el('badgeGrammar').textContent = grammar.length;
    if (el('badgeLessons')) el('badgeLessons').textContent = lessonCount;
    if (el('badgeStories')) el('badgeStories').textContent = (window.CAA && window.CAA.stories ? window.CAA.stories.length : 5);
  }

  // --- TAB NAVIGATION SYSTEM (LAZY RENDERING FOR MAXIMUM SPEED) ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const renderedTabs = new Set();

  function renderTabContent(tabId) {
    if (tabId === 'stories') {
      if (window.CAA && window.CAA.storiesModule) {
        window.CAA.storiesModule.init();
      }
    } else if (tabId === 'lessons') {
      renderStarterSheets();
      fetchLessons();
    } else if (tabId === 'grammar') {
      renderGrammar();
    } else if (tabId === 'phrasal') {
      renderPhrasal();
    } else if (tabId === 'pron') {
      renderPron();
    } else if (tabId === 'irregular') {
      renderIrregular();
    } else if (tabId === 'vocab') {
      renderVocab();
    }
    renderedTabs.add(tabId);
  }

  function switchTab(tabId) {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    tabPanels.forEach(panel => {
      if (panel.id === `panel-${tabId}`) {
        panel.style.display = 'block';
        panel.classList.add('fade-in');
      } else {
        panel.style.display = 'none';
        panel.classList.remove('fade-in');
      }
    });

    // Lazy load the tab content only on first visit
    if (!renderedTabs.has(tabId)) {
      renderTabContent(tabId);
    }

    sessionStorage.setItem('activeLearningTab', tabId);
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  const urlParamTab = new URLSearchParams(window.location.search).get('tab');
  const initialTab = urlParamTab || sessionStorage.getItem('activeLearningTab') || 'stories';

  // =========================================================================
  // MODULE 1: COURS & FICHES PDF (UPLOAD, DOWNLOAD, PREVIEW, STARTER SHEETS)
  // =========================================================================
  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');
  const lessonsGrid = document.getElementById('lessonsGrid');
  const lessonsSearch = document.getElementById('lessonsSearch');
  const lessonsFilterCat = document.getElementById('lessonsFilterCat');
  const lessonFileInput = document.getElementById('lessonFile');
  const dropZone = document.getElementById('dropZone');
  const dropText = document.getElementById('dropText');
  const starterSheetsGrid = document.getElementById('starterSheetsGrid');

  // Modal PDF Elements
  const pdfModal = document.getElementById('pdfModal');
  const pdfModalTitle = document.getElementById('pdfModalTitle');
  const pdfModalDownloadBtn = document.getElementById('pdfModalDownloadBtn');
  const pdfModalCloseBtn = document.getElementById('pdfModalCloseBtn');
  const pdfViewerFrame = document.getElementById('pdfViewerFrame');

  let allLessonsList = [];

  // Fiches de révision prédéfinies du club (génératrices de documents riches)
  const starterSheets = [
    {
      id: "starter_gerund",
      title: "Gérondif (-ING) vs Infinitif (TO) : Le Guide Ultime",
      cat: "Grammaire",
      level: "Tous niveaux",
      pages: "3 pages",
      icon: "",
      summary: "Quand utiliser -ING ou TO ? Verbes suivis du gérondif (enjoy, avoid, suggest), infinitif (decide, hope), et verbes à double sens (stop, remember, forget).",
      generateContent: () => generateGerundHtml()
    },
    {
      id: "starter_prepositions",
      title: "Guide Essentiel des Prépositions (In, On, At, By...)",
      cat: "Prépositions",
      level: "Débutant & Intermédiaire",
      pages: "3 pages",
      icon: "",
      summary: "Règles claires pour ne plus confondre IN, ON et AT (temps, lieu, expressions idiomatiques, good at, afraid of...).",
      generateContent: () => generatePrepositionsHtml()
    },
    {
      id: "starter_phrasal",
      title: "Top 50 des Phrasal Verbs Indispensables",
      cat: "Phrasal Verbs",
      level: "Tous niveaux",
      pages: "4 pages",
      icon: "",
      summary: "Les 50 verbes à particule les plus utilisés en anglais avec traductions françaises, contextes et exemples.",
      generateContent: () => generatePhrasalHtml()
    },
    {
      id: "starter_business",
      title: "Anglais Professionnel : Réunions, Emails & Négociations",
      cat: "Business English",
      level: "Intermédiaire & Avancé",
      pages: "4 pages",
      icon: "",
      summary: "Formules clés pour rédiger des emails percutants, animer des réunions d'affaires et négocier avec aisance.",
      generateContent: () => generateBusinessHtml()
    },
    {
      id: "starter_modals",
      title: "Verbes Modaux & Conditionnels (If, Must, Should Have...)",
      cat: "Grammaire",
      level: "Tous niveaux",
      pages: "3 pages",
      icon: "",
      summary: "Maîtrisez must vs have to, should have + participe passé, et les 4 types de conditionnels (0, 1, 2, 3).",
      generateContent: () => generateModalsHtml()
    },
    {
      id: "starter_tenses",
      title: "Tableau Récapitulatif des Temps de l'Anglais",
      cat: "Grammaire",
      level: "Tous niveaux",
      pages: "3 pages",
      icon: "",
      summary: "Present Simple vs Continuous, Past Simple vs Present Perfect, Future et Conditionnels en un coup d'œil.",
      generateContent: () => generateTensesHtml()
    },
    {
      id: "starter_irregular",
      title: "Verbes Irréguliers Classés par Familles de Sons",
      cat: "Verbes Irréguliers",
      level: "Tous niveaux",
      pages: "3 pages",
      icon: "",
      summary: "Mémorisez 3x plus vite grâce aux familles phonétiques : i-a-u (sing/sang/sung), ow-ew-own (know/knew/known), invariables (cut/cut/cut)...",
      generateContent: () => generateIrregularFamiliesHtml()
    },
    {
      id: "starter_pronunciation",
      title: "Guide Phonétique : Les 30 Pièges de l'Oral",
      cat: "Prononciation",
      level: "Tous niveaux",
      pages: "3 pages",
      icon: "",
      summary: "Lettres muettes (Knife, Island), sons TH (/θ/ et /ð/), le cauchemar -OUGH et l'accent tonique.",
      generateContent: () => generatePronunciationHtml()
    }
  ];

  // Drag and drop events for PDF upload
  if (dropZone && lessonFileInput) {
    dropZone.addEventListener('click', () => lessonFileInput.click());

    lessonFileInput.addEventListener('change', () => {
      if (lessonFileInput.files.length) {
        const file = lessonFileInput.files[0];
        dropText.innerHTML = `✅ Fichier sélectionné : <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} Mo)`;
        dropZone.classList.add('file-ready');
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length) {
        lessonFileInput.files = files;
        const file = files[0];
        dropText.innerHTML = `✅ Fichier déposé : <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} Mo)`;
        dropZone.classList.add('file-ready');
      }
    });
  }

  // Local Storage Fallback for Lessons
  function getLocalLessons() {
    try {
      return JSON.parse(localStorage.getItem('caa_local_lessons') || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalLessons(list) {
    try {
      localStorage.setItem('caa_local_lessons', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage full or unavailable', e);
    }
  }

  // Fetch Lessons from Server (with Google Drive & Local Fallback)
  const lessonsFilterSource = document.getElementById('lessonsFilterSource');
  const btnSyncGDrive = document.getElementById('btnSyncGDrive');
  const lessonsSubHeader = document.getElementById('lessonsSubHeader');
  const gdriveNotice = document.getElementById('gdriveNotice');

  function fetchLessons(forceSync = false) {
    if (btnSyncGDrive && forceSync) {
      btnSyncGDrive.textContent = '⏳ Synchronisation...';
      btnSyncGDrive.disabled = true;
    }

    const endpoint = forceSync ? '/api/gdrive/sync' : '/api/lessons';

    fetch(endpoint)
      .then(r => {
        if (!r.ok) throw new Error('API unavailable');
        return r.json();
      })
      .then(data => {
        const serverLessons = data.lessons || data.files || [];
        const localLessons = getLocalLessons();
        
        // Merge without duplicates
        const map = new Map();
        serverLessons.forEach(l => map.set(l.id || l.driveFileId || l.filename, l));
        localLessons.forEach(l => {
          if (!map.has(l.id || l.filename)) map.set(l.id || l.filename, l);
        });

        allLessonsList = Array.from(map.values());
        updateCounters(allLessonsList.length);

        const gdCount = allLessonsList.filter(l => l.isGoogleDrive).length;
        const locCount = allLessonsList.length - gdCount;

        if (lessonsSubHeader) {
          lessonsSubHeader.textContent = `${gdCount} cours Google Drive officiel(s) · ${locCount} document(s) local(aux)`;
        }

        // Si aucun cours Google Drive n'est récupéré, vérifier le diagnostic
        if (gdCount === 0 && gdriveNotice) {
          fetch('/api/gdrive/diagnose')
            .then(res => res.json())
            .then(diagData => {
              const diag = diagData.diagnosis || {};
              if (diag.action_required && !diag.folder_accessible) {
                gdriveNotice.style.display = 'block';
                gdriveNotice.innerHTML = `
                  <strong>⚠️ Action requise pour afficher vos cours Google Drive :</strong><br>
                  Le compte de service doit avoir l'accès à votre dossier Drive.<br>
                  1. Ouvrez votre dossier : <a href="${diag.folder_url}" target="_blank" style="color:#78350f;font-weight:bold;text-decoration:underline;">Ouvrir le dossier Google Drive ↗</a><br>
                  2. Cliquez sur le bouton <strong>« Partager »</strong> (Share) en haut à droite.<br>
                  3. Ajoutez l'adresse email suivante : <code>${diag.client_email}</code> avec les droits <strong>Lecteur</strong> (Viewer).<br>
                  4. Revenez ici et cliquez sur <strong>« Actualiser Google Drive »</strong>.
                `;
              } else if (diag.folder_accessible && diag.folder_files_count === 0) {
                gdriveNotice.style.display = 'block';
                gdriveNotice.innerHTML = `
                  <strong>ℹ️ Dossier Google Drive connecté et accessible, mais aucun fichier n'a été trouvé.</strong><br>
                  Déposez vos cours ou fiches PDF dans le dossier Google Drive partagé pour qu'ils s'affichent automatiquement ici.
                `;
              } else {
                gdriveNotice.style.display = 'none';
              }
            })
            .catch(() => {});
        } else if (gdriveNotice) {
          gdriveNotice.style.display = 'none';
        }

        renderLessons();
      })
      .catch(() => {
        // Fallback to local storage
        allLessonsList = getLocalLessons();
        updateCounters(allLessonsList.length);
        if (lessonsSubHeader) {
          lessonsSubHeader.textContent = `${allLessonsList.length} cours disponibles en local`;
        }
        renderLessons();
      })
      .finally(() => {
        if (btnSyncGDrive) {
          btnSyncGDrive.textContent = 'Actualiser Google Drive';
          btnSyncGDrive.disabled = false;
        }
      });
  }

  if (btnSyncGDrive) {
    btnSyncGDrive.addEventListener('click', () => fetchLessons(true));
  }

  // Render Lessons List
  function renderLessons() {
    const q = (lessonsSearch ? lessonsSearch.value : '').toLowerCase().trim();
    const cat = lessonsFilterCat ? lessonsFilterCat.value : '';
    const source = lessonsFilterSource ? lessonsFilterSource.value : '';

    const filtered = allLessonsList.filter(item => {
      const titleMatch = !q || (item.title && item.title.toLowerCase().includes(q)) || (item.filename && item.filename.toLowerCase().includes(q));
      const catMatch = !cat || item.category === cat;
      const sourceMatch = !source || (source === 'gdrive' && item.isGoogleDrive) || (source === 'local' && !item.isGoogleDrive);
      return titleMatch && catMatch && sourceMatch;
    });

    if (!lessonsGrid) return;
    lessonsGrid.innerHTML = '';

    if (filtered.length === 0) {
      lessonsGrid.innerHTML = `
        <div class="empty-lessons-box">
          <span class="empty-icon">📂</span>
          <p>Aucun cours ne correspond à vos critères de recherche.</p>
          <small>Changez les filtres ou synchronisez avec Google Drive !</small>
        </div>
      `;
      return;
    }

    filtered.forEach(lesson => {
      const card = document.createElement('div');
      card.className = `lesson-card-item ${lesson.isGoogleDrive ? 'lesson-card-gdrive' : ''}`;

      const iconBox = document.createElement('div');
      iconBox.className = 'lesson-card-icon';
      iconBox.textContent = lesson.isGoogleDrive ? '📁' : '📕';

      const infoBox = document.createElement('div');
      infoBox.className = 'lesson-card-info';

      const title = document.createElement('h4');
      title.className = 'lesson-card-title';
      title.textContent = lesson.title || lesson.filename;

      const meta = document.createElement('div');
      meta.className = 'lesson-card-meta';

      if (lesson.isGoogleDrive) {
        const gdBadge = document.createElement('span');
        gdBadge.className = 'badge badge-gdrive';
        gdBadge.textContent = 'Drive Officiel';
        meta.appendChild(gdBadge);
      } else {
        const localBadge = document.createElement('span');
        localBadge.className = 'badge badge-local';
        localBadge.textContent = 'Local';
        meta.appendChild(localBadge);
      }

      if (lesson.category) {
        const catBadge = document.createElement('span');
        catBadge.className = 'badge badge-cat';
        catBadge.textContent = lesson.category;
        meta.appendChild(catBadge);
      }

      if (lesson.level) {
        const lvlBadge = document.createElement('span');
        lvlBadge.className = 'badge badge-level';
        lvlBadge.textContent = lesson.level;
        meta.appendChild(lvlBadge);
      }

      if (lesson.size) {
        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'meta-text';
        sizeSpan.textContent = `💾 ${lesson.size}`;
        meta.appendChild(sizeSpan);
      }

      if (lesson.createdAt) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'meta-text';
        dateSpan.textContent = `📅 ${lesson.createdAt}`;
        meta.appendChild(dateSpan);
      }

      infoBox.appendChild(title);
      infoBox.appendChild(meta);

      const actionsBox = document.createElement('div');
      actionsBox.className = 'lesson-card-actions';

      // Preview Button (opens PDF modal)
      const previewBtn = document.createElement('button');
      previewBtn.className = 'btn-action btn-preview';
      previewBtn.innerHTML = 'Consulter';
      previewBtn.title = 'Aperçu dans la visionneuse intégrée';
      previewBtn.addEventListener('click', () => {
        openPdfPreview(lesson);
      });

      // Direct Download Button
      const downloadBtn = document.createElement('a');
      downloadBtn.className = 'btn-action btn-download';
      downloadBtn.innerHTML = 'Télécharger';
      downloadBtn.title = 'Télécharger directement le document';

      const fileUrl = lesson.downloadUrl || lesson.dataUrl || ('/uploads/' + encodeURIComponent(lesson.filename));
      downloadBtn.href = fileUrl;
      downloadBtn.download = lesson.filename || 'cours_anglais.pdf';
      downloadBtn.target = '_blank';

      actionsBox.appendChild(previewBtn);
      actionsBox.appendChild(downloadBtn);

      // Google Drive Web Link button if available
      if (lesson.webViewLink) {
        const driveLinkBtn = document.createElement('a');
        driveLinkBtn.className = 'btn-action btn-drive-ext';
        driveLinkBtn.innerHTML = 'Drive ↗';
        driveLinkBtn.href = lesson.webViewLink;
        driveLinkBtn.target = '_blank';
        driveLinkBtn.rel = 'noopener noreferrer';
        driveLinkBtn.title = 'Ouvrir directement dans Google Drive';
        actionsBox.appendChild(driveLinkBtn);
      }

      // Delete Button only for local uploads
      if (!lesson.isGoogleDrive) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-action btn-delete';
        deleteBtn.innerHTML = 'Supprimer';
        deleteBtn.title = 'Supprimer ce cours local';
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Voulez-vous vraiment supprimer le cours "${lesson.title}" ?`)) {
            deleteLesson(lesson);
          }
        });
        actionsBox.appendChild(deleteBtn);
      }

      card.appendChild(iconBox);
      card.appendChild(infoBox);
      card.appendChild(actionsBox);

      lessonsGrid.appendChild(card);
    });
  }

  // Delete Lesson handler (local only)
  function deleteLesson(lesson) {
    fetch('/api/lessons/' + encodeURIComponent(lesson.filename), { method: 'DELETE' })
      .then(r => r.json())
      .catch(() => {})
      .finally(() => {
        const local = getLocalLessons().filter(l => (l.id || l.filename) !== (lesson.id || lesson.filename));
        saveLocalLessons(local);
        allLessonsList = allLessonsList.filter(l => (l.id || l.filename) !== (lesson.id || lesson.filename));
        updateCounters(allLessonsList.length);
        renderLessons();
      });
  }

  // Open PDF in Modal Viewer
  function openPdfPreview(lesson) {
    if (!pdfModal) return;
    if (pdfModalTitle) pdfModalTitle.textContent = lesson.title || lesson.filename;

    const fileUrl = lesson.previewUrl || lesson.dataUrl || ('/uploads/' + encodeURIComponent(lesson.filename));
    const downloadUrl = lesson.downloadUrl || lesson.dataUrl || ('/uploads/' + encodeURIComponent(lesson.filename));

    if (pdfModalDownloadBtn) {
      pdfModalDownloadBtn.href = downloadUrl;
      pdfModalDownloadBtn.download = lesson.filename || 'cours_anglais.pdf';
    }

    if (pdfViewerFrame) {
      pdfViewerFrame.src = fileUrl;
    }
    pdfModal.style.display = 'flex';
  }

  // Close PDF Modal
  if (pdfModalCloseBtn) {
    pdfModalCloseBtn.addEventListener('click', () => {
      pdfModal.style.display = 'none';
      pdfViewerFrame.src = 'about:blank';
    });
  }
  if (pdfModal) {
    pdfModal.addEventListener('click', (e) => {
      if (e.target === pdfModal) {
        pdfModal.style.display = 'none';
        pdfViewerFrame.src = 'about:blank';
      }
    });
  }

  // Upload Form Submission
  uploadForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fileEl = document.getElementById('lessonFile');
    const titleEl = document.getElementById('lessonTitle');
    const catEl = document.getElementById('lessonCat');
    const levelEl = document.getElementById('lessonLevel');
    const submitBtn = document.getElementById('uploadSubmitBtn');

    if (!fileEl.files || !fileEl.files.length) {
      uploadStatus.className = 'upload-status error';
      uploadStatus.textContent = '❌ Veuillez sélectionner un fichier PDF.';
      return;
    }

    const file = fileEl.files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      uploadStatus.className = 'upload-status error';
      uploadStatus.textContent = '❌ Seuls les fichiers .pdf sont autorisés.';
      return;
    }

    submitBtn.disabled = true;
    uploadStatus.className = 'upload-status info';
    uploadStatus.textContent = '⏳ Téléversement du document en cours...';

    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', titleEl.value.trim() || file.name.replace('.pdf', ''));
    fd.append('category', catEl.value);
    fd.append('level', levelEl.value);

    fetch('/api/lessons/upload', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.lesson) {
          uploadStatus.className = 'upload-status success';
          uploadStatus.textContent = '✅ Cours PDF téléversé avec succès !';
          uploadForm.reset();
          if (dropText) dropText.innerHTML = `Glissez-déposez votre fichier PDF ici ou <strong>cliquez pour parcourir</strong>`;
          if (dropZone) dropZone.classList.remove('file-ready');
          fetchLessons();
        } else {
          throw new Error(data.error || 'Échec de téléversement');
        }
      })
      .catch((err) => {
        console.warn('Server upload error, falling back to local reader', err);
        // Fallback: Read as Data URL and save to local storage
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target.result;
          const localItem = {
            id: 'local_' + Date.now(),
            filename: file.name,
            title: titleEl.value.trim() || file.name.replace('.pdf', ''),
            category: catEl.value,
            level: levelEl.value,
            size: `${(file.size / 1024).toFixed(1)} Ko`,
            createdAt: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            dataUrl: base64Data
          };

          const localList = getLocalLessons();
          localList.unshift(localItem);
          saveLocalLessons(localList);

          uploadStatus.className = 'upload-status success';
          uploadStatus.textContent = '✅ Cours enregistré localement avec succès !';
          uploadForm.reset();
          if (dropText) dropText.innerHTML = `Glissez-déposez votre fichier PDF ici ou <strong>cliquez pour parcourir</strong>`;
          if (dropZone) dropZone.classList.remove('file-ready');
          fetchLessons();
        };
        reader.readAsDataURL(file);
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  if (lessonsSearch) lessonsSearch.addEventListener('input', renderLessons);
  if (lessonsFilterCat) lessonsFilterCat.addEventListener('change', renderLessons);
  if (lessonsFilterSource) lessonsFilterSource.addEventListener('change', renderLessons);

  // Render Starter Sheets
  function renderStarterSheets() {
    starterSheetsGrid.innerHTML = '';
    starterSheets.forEach(sheet => {
      const card = document.createElement('div');
      card.className = 'starter-sheet-card';

      const top = document.createElement('div');
      top.className = 'starter-sheet-top';

      const tag = document.createElement('span');
      tag.className = 'starter-sheet-tag';
      tag.textContent = sheet.cat;

      top.appendChild(tag);

      const title = document.createElement('h4');
      title.className = 'starter-sheet-title';
      title.textContent = sheet.title;

      const summary = document.createElement('p');
      summary.className = 'starter-sheet-desc';
      summary.textContent = sheet.summary;

      const footer = document.createElement('div');
      footer.className = 'starter-sheet-footer';

      const pages = document.createElement('span');
      pages.className = 'starter-sheet-pages';
      pages.textContent = `${sheet.pages} • ${sheet.level}`;

      const btn = document.createElement('button');
      btn.className = 'btn-starter-view';
      btn.textContent = 'Consulter la fiche';
      btn.addEventListener('click', () => {
        openStarterSheetViewer(sheet);
      });

      footer.appendChild(pages);
      footer.appendChild(btn);

      card.appendChild(top);
      card.appendChild(title);
      card.appendChild(summary);
      card.appendChild(footer);

      starterSheetsGrid.appendChild(card);
    });
  }

  // Open Starter Sheet in Viewer Modal
  function openStarterSheetViewer(sheet) {
    pdfModalTitle.textContent = `Fiche Pratique — ${sheet.title}`;
    const docHtml = sheet.generateContent();
    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    pdfModalDownloadBtn.href = blobUrl;
    pdfModalDownloadBtn.download = `${sheet.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    pdfViewerFrame.src = blobUrl;
    pdfModal.style.display = 'flex';
  }

  // HTML Content Generators for Starter Sheets
  function generateGerundHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Gérondif (-ING) vs Infinitif (TO) — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #d97706; border-bottom: 3px solid #f59e0b; padding-bottom: 8px; }
        h2 { color: #0284c7; margin-top: 24px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.95rem; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        th { background: #f1f5f9; color: #0f172a; }
        strong { color: #0f172a; }
        .highlight { color: #b45309; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>🎯 Gérondif (-ING) vs Infinitif (TO) : Le Guide Ultime</h1>
      <p><em>Club Anglais Accra — Fiche de Grammaire Essentielle</em></p>

      <h2>1. Verbes suivis OBLIGATOIREMENT du Gérondif (-ING)</h2>
      <div class="box">
        <p>Après ces verbes, le verbe suivant prend TOUJOURS la terminaison <strong>-ING</strong> :</p>
        <ul>
          <li><strong>Enjoy :</strong> I <span class="highlight">enjoy reading</span> novels in English.</li>
          <li><strong>Avoid :</strong> She <span class="highlight">avoided answering</span> difficult questions.</li>
          <li><strong>Mind :</strong> Would you <span class="highlight">mind closing</span> the window?</li>
          <li><strong>Suggest :</strong> He <span class="highlight">suggested taking</span> the express train.</li>
          <li><strong>Finish :</strong> Have you <span class="highlight">finished writing</span> your report?</li>
          <li><strong>Look forward to :</strong> I am <span class="highlight">looking forward to seeing</span> you soon!</li>
        </ul>
      </div>

      <h2>2. Verbes suivis OBLIGATOIREMENT de l'Infinitif (TO + Base)</h2>
      <div class="box">
        <p>Après ces verbes, utilisez l'infinitif avec <strong>TO</strong> :</p>
        <ul>
          <li><strong>Decide :</strong> We <span class="highlight">decided to travel</span> to Accra this weekend.</li>
          <li><strong>Hope :</strong> I <span class="highlight">hope to pass</span> the English test.</li>
          <li><strong>Plan :</strong> They <span class="highlight">plan to launch</span> a new project.</li>
          <li><strong>Afford :</strong> I cannot <span class="highlight">afford to buy</span> this luxury car.</li>
          <li><strong>Promise :</strong> He <span class="highlight">promised to help</span> us with our presentation.</li>
          <li><strong>Refuse :</strong> She <span class="highlight">refused to give up</span>.</li>
        </ul>
      </div>

      <h2>3. Verbes avec Changement de Sens Radical ! ⚠️</h2>
      <table>
        <tr><th>Verbe</th><th>Avec -ING (Gérondif)</th><th>Avec TO (Infinitif)</th></tr>
        <tr>
          <td><strong>STOP</strong></td>
          <td><em>I stopped smoking.</em><br>(J'ai arrêté définitivement la cigarette)</td>
          <td><em>I stopped to smoke.</em><br>(Je me suis arrêté en chemin pour fumer)</td>
        </tr>
        <tr>
          <td><strong>REMEMBER</strong></td>
          <td><em>I remember visiting Accra.</em><br>(J'ai le souvenir d'avoir visité Accra dans le passé)</td>
          <td><em>Remember to lock the door!</em><br>(N'oublie pas de verrouiller la porte - action future)</td>
        </tr>
        <tr>
          <td><strong>FORGET</strong></td>
          <td><em>I will never forget meeting you.</em><br>(Je n'oublierai jamais notre rencontre passée)</td>
          <td><em>Don't forget to call me!</em><br>(N'oublie pas de m'appeler - devoir à faire)</td>
        </tr>
      </table>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Master Every Nuance!</p>
    </body></html>`;
  }

  function generateBusinessHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Anglais Professionnel — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #0284c7; border-bottom: 3px solid #0ea5e9; padding-bottom: 8px; }
        h2 { color: #0369a1; margin-top: 24px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; border-radius: 8px; padding: 14px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.95rem; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        th { background: #f0f9ff; color: #0c4a6e; }
        strong { color: #0c4a6e; }
      </style>
    </head>
    <body>
      <h1>💼 Anglais Professionnel : Réunions, Emails & Négociations</h1>
      <p><em>Club Anglais Accra — Guide de Communication Professionnelle</em></p>

      <h2>1. Rédaction d'Emails Professionnels</h2>
      <table>
        <tr><th>Situation</th><th>Formule Professionnelle Recommandée</th></tr>
        <tr><td>Objet clair</td><td><em>Action Required: Q3 Financial Report Review</em></td></tr>
        <tr><td>Pièce jointe</td><td><em>Please find attached the updated document for your review.</em></td></tr>
        <tr><td>Suivi / Relance</td><td><em>I am following up on our previous conversation regarding...</em></td></tr>
        <tr><td>Disponibilité</td><td><em>Please let me know if this time works for you.</em></td></tr>
        <tr><td>Conclusion polie</td><td><em>Best regards, / Sincerely,</em></td></tr>
      </table>

      <h2>2. Animer & Participer à une Réunion (Meetings)</h2>
      <div class="box">
        <ul>
          <li><strong>Ouvrir la séance :</strong> "Thank you all for joining. Let's look at today's agenda."</li>
          <li><strong>Donner son avis :</strong> "From my perspective, this strategy will increase our market reach."</li>
          <li><strong>Interrompre poliment :</strong> "May I quickly add something to this point?"</li>
          <li><strong>Demander des clarifications :</strong> "Could you please elaborate on the timeline?"</li>
          <li><strong>Conclure avec plan d'action :</strong> "Let's summarize the key action points and deadlines."</li>
        </ul>
      </div>

      <h2>3. L'Art de la Négociation (Negotiation & Compromise)</h2>
      <div class="box">
        <ul>
          <li><strong>Proposer un accord :</strong> "We are willing to consider your offer under the condition that..."</li>
          <li><strong>Trouver un terrain d'entente :</strong> "Let's reach a win-win compromise that benefits both sides."</li>
          <li><strong>Refuser avec diplomatie :</strong> "I understand your point, however that is slightly above our allocated budget."</li>
        </ul>
      </div>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Professional Fluency Made Simple!</p>
    </body></html>`;
  }

  function generateModalsHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Modaux & Conditionnels — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #7c3aed; border-bottom: 3px solid #8b5cf6; padding-bottom: 8px; }
        h2 { color: #5b21b6; margin-top: 24px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 14px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.95rem; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        th { background: #f5f3ff; color: #3b0764; }
        strong { color: #3b0764; }
      </style>
    </head>
    <body>
      <h1>🛡️ Verbes Modaux & Conditionnels (If, Must, Should Have...)</h1>
      <p><em>Club Anglais Accra — Maîtrise des Nuances</em></p>

      <h2>1. Must vs Have to vs Should</h2>
      <table>
        <tr><th>Modal</th><th>Sens</th><th>Exemple</th></tr>
        <tr><td><strong>MUST</strong></td><td>Obligation forte / personnelle ou certitude logique</td><td>You must wear a seatbelt. / He is not here, he must be sick.</td></tr>
        <tr><td><strong>HAVE TO</strong></td><td>Obligation externe (loi, règles de l'entreprise)</td><td>I have to wake up at 6 AM for work.</td></tr>
        <tr><td><strong>SHOULD</strong></td><td>Conseil, recommandation</td><td>You should drink more water and rest.</td></tr>
        <tr><td><strong>SHOULD HAVE + PP</strong></td><td>Regret ou reproche sur le passé</td><td>You should have told me earlier! (Tu aurais dû me prévenir)</td></tr>
        <tr><td><strong>MUST HAVE + PP</strong></td><td>Déduction quasi certaine sur le passé</td><td>The roads are wet, it must have rained last night.</td></tr>
      </table>

      <h2>2. Les 4 Types de Conditionnels (0, 1, 2, 3)</h2>
      <table>
        <tr><th>Type</th><th>Structure</th><th>Usage</th><th>Exemple</th></tr>
        <tr><td><strong>Type 0</strong></td><td>If + Present, Present</td><td>Vérité scientifique / réflexe</td><td>If you heat water to 100°C, it boils.</td></tr>
        <tr><td><strong>Type 1</strong></td><td>If + Present, Will + Base</td><td>Futur probable</td><td>If it rains tomorrow, we will stay inside.</td></tr>
        <tr><td><strong>Type 2</strong></td><td>If + Past Simple, Would + Base</td><td>Imaginaire / conseil (irréel présent)</td><td>If I were rich, I would travel around the world.</td></tr>
        <tr><td><strong>Type 3</strong></td><td>If + Past Perfect, Would have + PP</td><td>Regret passé (irréel du passé)</td><td>If I had studied harder, I would have passed the exam.</td></tr>
      </table>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Think in English!</p>
    </body></html>`;
  }

  function generateIrregularFamiliesHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Familles de Verbes Irréguliers — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #059669; border-bottom: 3px solid #10b981; padding-bottom: 8px; }
        h2 { color: #047857; margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.95rem; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #ecfdf5; color: #064e3b; }
        strong { color: #064e3b; }
      </style>
    </head>
    <body>
      <h1>🔄 Verbes Irréguliers Classés par Familles de Sons</h1>
      <p><em>Club Anglais Accra — Mémorisation Phonétique Accélérée</em></p>

      <h2>1. Famille I - A - U (Changement de voyelle)</h2>
      <table>
        <tr><th>Base</th><th>Prétérit (Past)</th><th>Participe Passé</th><th>Sens en Français</th></tr>
        <tr><td><strong>Sing</strong></td><td>sang</td><td>sung</td><td>Chanter</td></tr>
        <tr><td><strong>Ring</strong></td><td>rang</td><td>rung</td><td>Sonner / Téléphoner</td></tr>
        <tr><td><strong>Drink</strong></td><td>drank</td><td>drunk</td><td>Boire</td></tr>
        <tr><td><strong>Begin</strong></td><td>began</td><td>begun</td><td>Commencer</td></tr>
        <tr><td><strong>Swim</strong></td><td>swam</td><td>swum</td><td>Nager</td></tr>
      </table>

      <h2>2. Famille OW - EW - OWN</h2>
      <table>
        <tr><th>Base</th><th>Prétérit (Past)</th><th>Participe Passé</th><th>Sens en Français</th></tr>
        <tr><td><strong>Know</strong></td><td>knew</td><td>known</td><td>Savoir / Connaître</td></tr>
        <tr><td><strong>Grow</strong></td><td>grew</td><td>grown</td><td>Grandir / Cultiver</td></tr>
        <tr><td><strong>Throw</strong></td><td>threw</td><td>thrown</td><td>Jeter / Lancer</td></tr>
        <tr><td><strong>Blow</strong></td><td>blew</td><td>blown</td><td>Souffler</td></tr>
        <tr><td><strong>Fly</strong></td><td>flew</td><td>flown</td><td>Voler (dans l'air)</td></tr>
      </table>

      <h2>3. Famille Les 100% Invariables (3 formes identiques)</h2>
      <table>
        <tr><th>Base</th><th>Prétérit (Past)</th><th>Participe Passé</th><th>Sens en Français</th></tr>
        <tr><td><strong>Cut</strong></td><td>cut</td><td>cut</td><td>Couper</td></tr>
        <tr><td><strong>Put</strong></td><td>put</td><td>put</td><td>Mettre / Poser</td></tr>
        <tr><td><strong>Let</strong></td><td>let</td><td>let</td><td>Laisser / Permettre</td></tr>
        <tr><td><strong>Cost</strong></td><td>cost</td><td>cost</td><td>Coûter</td></tr>
        <tr><td><strong>Hit</strong></td><td>hit</td><td>hit</td><td>Frapper / Toucher</td></tr>
        <tr><td><strong>Set</strong></td><td>set</td><td>set</td><td>Fixer / Configurer</td></tr>
      </table>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Learn Smarter, Not Harder!</p>
    </body></html>`;
  }

  // HTML Content Generators for Starter Sheets
  function generatePrepositionsHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Fiche Prépositions — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #d97706; border-bottom: 3px solid #f59e0b; padding-bottom: 8px; }
        h2 { color: #0284c7; margin-top: 24px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px; margin: 16px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        th { background: #f1f5f9; color: #0f172a; }
        .badge { background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-weight: bold; }
        strong { color: #0f172a; }
      </style>
    </head>
    <body>
      <h1>🎯 Guide Essentiel des Prépositions (In, On, At)</h1>
      <p><em>Club Anglais Accra — Fiche de Révision & d'Apprentissage Rapide</em></p>

      <h2>1. Prépositions de Temps (Time)</h2>
      <table>
        <tr><th>Préposition</th><th>Usage</th><th>Exemples Clés</th></tr>
        <tr><td><strong>AT</strong> (Précis)</td><td>Heure précise, moments de la journée</td><td>at 8:00 AM, at noon, at midnight, at the weekend</td></tr>
        <tr><td><strong>ON</strong> (Jours & Dates)</td><td>Jours de la semaine, dates complètes</td><td>on Monday, on July 4th, on my birthday, on Sunday morning</td></tr>
        <tr><td><strong>IN</strong> (Longues périodes)</td><td>Mois, saisons, années, siècles, durée future</td><td>in July, in summer, in 2026, in 5 minutes</td></tr>
      </table>

      <h2>2. Prépositions de Lieu (Place)</h2>
      <table>
        <tr><th>Préposition</th><th>Usage</th><th>Exemples Clés</th></tr>
        <tr><td><strong>AT</strong> (Point précis / Lieu d'activité)</td><td>Point exact, arrêt, carrefour</td><td>at the bus stop, at the station, at home, at work</td></tr>
        <tr><td><strong>ON</strong> (Surface / Ligne)</td><td>Posé sur une surface, rue, mur, sol</td><td>on the table, on the wall, on Oxford Street</td></tr>
        <tr><td><strong>IN</strong> (Espace fermé / Ville / Pays)</td><td>Dans un contenant, une pièce, une ville</td><td>in the box, in the room, in Accra, in Ghana</td></tr>
      </table>

      <h2>3. Prépositions Idiomatiques & Verbes</h2>
      <div class="box">
        <ul>
          <li><strong>Good at / Bad at :</strong> She is very good <em>at</em> maths.</li>
          <li><strong>Afraid of :</strong> He is afraid <em>of</em> snakes.</li>
          <li><strong>Depend on :</strong> Everything depends <em>on</em> you.</li>
          <li><strong>Interested in :</strong> I am interested <em>in</em> learning English.</li>
          <li><strong>Look for (chercher) vs Look after (garder) :</strong> I am looking <em>for</em> my keys.</li>
        </ul>
      </div>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Keep Practicing!</p>
    </body></html>`;
  }

  function generatePhrasalHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Top 50 Phrasal Verbs — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #2563eb; border-bottom: 3px solid #3b82f6; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.95rem; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #eff6ff; color: #1e3a8a; }
        tr:nth-child(even) { background: #f8fafc; }
        strong { color: #1d4ed8; }
      </style>
    </head>
    <body>
      <h1>⚡ Top 50 Phrasal Verbs Indispensables</h1>
      <p><em>Club Anglais Accra — Référence Rapide</em></p>
      <table>
        <tr><th>Phrasal Verb</th><th>Français</th><th>Signification en Anglais</th></tr>
        <tr><td><strong>Give up</strong></td><td>Abandonner</td><td>To stop trying</td></tr>
        <tr><td><strong>Look after</strong></td><td>S'occuper de</td><td>To take care of someone</td></tr>
        <tr><td><strong>Look for</strong></td><td>Chercher</td><td>To try to find</td></tr>
        <tr><td><strong>Turn on / off</strong></td><td>Allumer / Éteindre</td><td>Start or stop a device</td></tr>
        <tr><td><strong>Take off</strong></td><td>Enlever / Décoller</td><td>Remove clothes OR plane leaving</td></tr>
        <tr><td><strong>Put on</strong></td><td>Enfiler un vêtement</td><td>To dress yourself</td></tr>
        <tr><td><strong>Run out of</strong></td><td>Être à court de</td><td>To use all of something</td></tr>
        <tr><td><strong>Get along with</strong></td><td>Bien s'entendre</td><td>Have a good relationship</td></tr>
        <tr><td><strong>Break down</strong></td><td>Tomber en panne</td><td>Stop working (engine/machine)</td></tr>
        <tr><td><strong>Carry on</strong></td><td>Continuer</td><td>To keep doing something</td></tr>
        <tr><td><strong>Find out</strong></td><td>Découvrir / apprendre</td><td>To discover new info</td></tr>
        <tr><td><strong>Look forward to</strong></td><td>Avoir hâte de</td><td>Feel excited about the future</td></tr>
        <tr><td><strong>Set up</strong></td><td>Créer / installer</td><td>To establish a business/system</td></tr>
        <tr><td><strong>Work out</strong></td><td>Résoudre / s'entraîner</td><td>Solve a problem OR exercise</td></tr>
        <tr><td><strong>Hang out</strong></td><td>Passer du temps ensemble</td><td>Spend casual time with friends</td></tr>
      </table>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Speak Like a Native!</p>
    </body></html>`;
  }

  function generateTensesHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Tableau des Temps — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #059669; border-bottom: 3px solid #10b981; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.95rem; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        th { background: #ecfdf5; color: #065f46; }
        tr:nth-child(even) { background: #f8fafc; }
        strong { color: #047857; }
      </style>
    </head>
    <body>
      <h1>⏳ Tableau Récapitulatif des Temps en Anglais</h1>
      <p><em>Club Anglais Accra — Synthèse de Conjugaison</em></p>
      <table>
        <tr><th>Temps</th><th>Structure</th><th>Quand l'utiliser ?</th><th>Exemple</th></tr>
        <tr><td><strong>Present Simple</strong></td><td>S + Base (+s à la 3e pers.)</td><td>Habitudes, vérités générales</td><td>He plays football every Sunday.</td></tr>
        <tr><td><strong>Present Continuous</strong></td><td>S + am/is/are + V-ing</td><td>Action en cours maintenant</td><td>She is studying English right now.</td></tr>
        <tr><td><strong>Past Simple</strong></td><td>S + V-ed (ou verbe irrégulier)</td><td>Action terminée dans le passé daté</td><td>I visited Kumasi last year.</td></tr>
        <tr><td><strong>Present Perfect</strong></td><td>S + have/has + Participe Passé</td><td>Lien entre passé et présent, expérience</td><td>I have already seen that movie.</td></tr>
        <tr><td><strong>Past Continuous</strong></td><td>S + was/were + V-ing</td><td>Action en cours interrompue dans le passé</td><td>They were sleeping when the phone rang.</td></tr>
        <tr><td><strong>Future Simple</strong></td><td>S + will + Base</td><td>Décision spontanée, prédiction</td><td>We will travel tomorrow.</td></tr>
        <tr><td><strong>Conditional 1</strong></td><td>If + Present, Will + Base</td><td>Situation réelle et probable</td><td>If it rains, we will stay home.</td></tr>
        <tr><td><strong>Conditional 2</strong></td><td>If + Past, Would + Base</td><td>Hypothèse imaginaire / conseil</td><td>If I had money, I would buy a car.</td></tr>
      </table>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Master Your Tenses!</p>
    </body></html>`;
  }

  function generatePronunciationHtml() {
    return `<!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Guide Prononciation — Accra English Club</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
        h1 { color: #7c3aed; border-bottom: 3px solid #8b5cf6; padding-bottom: 8px; }
        h2 { color: #6d28d9; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #f5f3ff; color: #4c1d95; }
        .ipa { font-family: monospace; color: #7c3aed; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>🗣️ Guide Phonétique : Les Pièges de l'Oral</h1>
      <p><em>Club Anglais Accra — Les pièges majeurs pour francophones</em></p>

      <h2>1. Les Lettres Muettes (Silent Letters)</h2>
      <table>
        <tr><th>Mot</th><th>IPA</th><th>Erreur fréquente</th><th>Bonne prononciation</th></tr>
        <tr><td><strong>Knife</strong></td><td class="ipa">/naɪf/</td><td>Prononcer le K</td><td>Dire "nife"</td></tr>
        <tr><td><strong>Island</strong></td><td class="ipa">/ˈaɪlənd/</td><td>Prononcer le S</td><td>Dire "eye-land"</td></tr>
        <tr><td><strong>Doubt</strong></td><td class="ipa">/daʊt/</td><td>Prononcer le B</td><td>Rime avec "out"</td></tr>
        <tr><td><strong>Castle</strong></td><td class="ipa">/ˈkæsəl/</td><td>Prononcer le T</td><td>Dire "cas-sel"</td></tr>
        <tr><td><strong>Receipt</strong></td><td class="ipa">/rɪˈsiːt/</td><td>Prononcer le P</td><td>Dire "ri-seet"</td></tr>
      </table>

      <h2>2. Le Cauchemar "-OUGH"</h2>
      <table>
        <tr><th>Mot</th><th>IPA</th><th>Son</th><th>Astuce</th></tr>
        <tr><td><strong>Though</strong></td><td class="ipa">/ðəʊ/</td><td>"oh"</td><td>Comme dans "go"</td></tr>
        <tr><td><strong>Through</strong></td><td class="ipa">/θruː/</td><td>"oo"</td><td>Comme dans "blue"</td></tr>
        <tr><td><strong>Tough</strong></td><td class="ipa">/tʌf/</td><td>"uff"</td><td>Rime avec "stuff"</td></tr>
        <tr><td><strong>Cough</strong></td><td class="ipa">/kɒf/</td><td>"off"</td><td>Rime avec "off"</td></tr>
      </table>

      <h2>3. Les Deux Sons TH (/θ/ vs /ð/)</h2>
      <p>Placez la pointe de votre langue entre vos incisives :</p>
      <ul>
        <li><strong>Sourd /θ/ (air sans vibration) :</strong> Think, Three, Tooth, Thank you.</li>
        <li><strong>Sonore /ð/ (cordes vocales qui vibrent) :</strong> This, That, Weather, Brother.</li>
      </ul>
      <p style="text-align:center; margin-top:30px; color:#64748b;">🇬🇭 Accra English Club — Clear Speech is Power!</p>
    </body></html>`;
  }

  // =========================================================================
  // MODULE 2: EXERCICES DE GRAMMAIRE (PRATIQUE & DÉFI QUIZ)
  // =========================================================================
  const grammarContainer = document.getElementById('grammarContainer');
  const grammarCountText = document.getElementById('grammarCountText');
  const resetGrammarBtn = document.getElementById('resetGrammarBtn');
  const modePracticeBtn = document.getElementById('modePracticeBtn');
  const modeQuizBtn = document.getElementById('modeQuizBtn');
  const grammarQuizView = document.getElementById('grammarQuizView');
  const grammarCatPills = document.querySelectorAll('#grammarCatPills .cat-pill');

  // Quiz Modal Elements
  const quizResultModal = document.getElementById('quizResultModal');
  const quizResultEmoji = document.getElementById('quizResultEmoji');
  const quizResultTitle = document.getElementById('quizResultTitle');
  const quizResultSub = document.getElementById('quizResultSub');
  const quizFinalScore = document.getElementById('quizFinalScore');
  const quizScoreLabel = document.getElementById('quizScoreLabel');
  const quizRetryBtn = document.getElementById('quizRetryBtn');
  const quizBackPracticeBtn = document.getElementById('quizBackPracticeBtn');

  let activeGrammarCat = '';
  let activeGrammarMode = 'practice'; // 'practice' or 'quiz'

  // Filter Pills Selection
  grammarCatPills.forEach(pill => {
    pill.addEventListener('click', () => {
      grammarCatPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeGrammarCat = pill.dataset.cat || '';
      
      if (activeGrammarMode === 'practice') {
        renderGrammar();
      } else {
        startGrammarQuiz();
      }
    });
  });

  // Switch between Practice & Timed Quiz Mode
  modePracticeBtn.addEventListener('click', () => {
    activeGrammarMode = 'practice';
    modePracticeBtn.classList.add('active');
    modeQuizBtn.classList.remove('active');
    grammarContainer.style.display = 'block';
    grammarQuizView.style.display = 'none';
    renderGrammar();
  });

  modeQuizBtn.addEventListener('click', () => {
    activeGrammarMode = 'quiz';
    modeQuizBtn.classList.add('active');
    modePracticeBtn.classList.remove('active');
    grammarContainer.style.display = 'none';
    grammarQuizView.style.display = 'block';
    startGrammarQuiz();
  });

  function getFilteredGrammarList() {
    return grammar.filter(item => {
      if (!activeGrammarCat) return true;
      const cat = (item.cat || '').toLowerCase();
      if (activeGrammarCat === 'prepositions') {
        return cat.includes('preposition');
      }
      if (activeGrammarCat === 'phrasal verbs') {
        return cat.includes('phrasal');
      }
      if (activeGrammarCat === 'tenses') {
        return cat.includes('present') || cat.includes('past') || cat.includes('future') || cat.includes('conditional') || cat.includes('verb to be');
      }
      if (activeGrammarCat === 'modal verbs') {
        return cat.includes('modal');
      }
      if (activeGrammarCat === 'articles') {
        return cat.includes('article') || cat.includes('quantifier') || cat.includes('plural') || cat.includes('pronoun');
      }
      return cat === activeGrammarCat;
    });
  }

  // Render Practice Mode Exercises
  function renderGrammar() {
    const list = getFilteredGrammarList();
    grammarCountText.textContent = `${list.length} exercice${list.length > 1 ? 's' : ''} disponible${list.length > 1 ? 's' : ''}`;

    grammarContainer.innerHTML = '';
    if (list.length === 0) {
      grammarContainer.innerHTML = '<div class="empty-lessons-box"><p>Aucun exercice trouvé pour cette catégorie.</p></div>';
      return;
    }

    list.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'grammar-card';

      const header = document.createElement('div');
      header.className = 'grammar-card-top';

      const badge = document.createElement('span');
      badge.className = 'grammar-cat-badge';
      badge.textContent = item.cat ? item.cat.toUpperCase() : 'GRAMMAIRE';

      const audioBtn = document.createElement('button');
      audioBtn.className = 'grammar-audio-btn';
      audioBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      audioBtn.title = 'Écouter la phrase';
      audioBtn.addEventListener('click', () => {
        const full = item.sentence.replace('___', item.answer);
        speakWord(full, audioBtn);
      });

      header.appendChild(badge);
      header.appendChild(audioBtn);

      const sentence = document.createElement('h3');
      sentence.className = 'grammar-sentence';
      const formattedSentence = item.sentence.replace('___', `<span class="blank-spot" id="blank-${idx}">___</span>`);
      sentence.innerHTML = formattedSentence;

      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'grammar-options';

      const feedback = document.createElement('div');
      feedback.className = 'grammar-feedback-box';
      feedback.style.display = 'none';

      (item.options || []).forEach(optText => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.textContent = optText;

        btn.addEventListener('click', () => {
          optionsDiv.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('correct', 'wrong'));
          const blankSpan = document.getElementById(`blank-${idx}`);

          const isRight = optText.toLowerCase().trim() === item.answer.toLowerCase().trim();
          if (isRight) {
            btn.classList.add('correct');
            feedback.className = 'grammar-feedback-box success-box';
            feedback.style.display = 'block';
            feedback.innerHTML = `
              <div class="feedback-header"><strong>Bravo ! Réponse exacte.</strong></div>
              <div class="feedback-explanation"><em>Explication :</em> ${item.meaning || item.fr || `L'option correcte est <strong>${item.answer}</strong>.`}</div>
            `;
            if (blankSpan) blankSpan.textContent = optText;
            speakWord(item.sentence.replace('___', optText), audioBtn);
          } else {
            btn.classList.add('wrong');
            feedback.className = 'grammar-feedback-box error-box';
            feedback.style.display = 'block';
            feedback.innerHTML = `
              <div class="feedback-header"><strong>Réponse incorrecte.</strong></div>
              <div class="feedback-explanation">Essayez une autre option ! <em>Indice :</em> ${item.fr || 'Relisez attentivement la phrase.'}</div>
            `;
            if (blankSpan) blankSpan.textContent = '___';
          }
        });

        optionsDiv.appendChild(btn);
      });

      card.appendChild(header);
      card.appendChild(sentence);
      card.appendChild(optionsDiv);
      card.appendChild(feedback);

      grammarContainer.appendChild(card);
    });
  }

  resetGrammarBtn.addEventListener('click', () => {
    renderGrammar();
  });

  // --- QUIZ CHRONO LOGIC ---
  let quizQuestions = [];
  let quizCurrentIndex = 0;
  let quizScore = 0;
  let quizTimerInterval = null;
  let quizTimeLeft = 30;

  const quizProgress = document.getElementById('quizProgress');
  const quizTimer = document.getElementById('quizTimer');
  const quizScoreEl = document.getElementById('quizScore');
  const quizCatTag = document.getElementById('quizCatTag');
  const quizSentence = document.getElementById('quizSentence');
  const quizOptions = document.getElementById('quizOptions');
  const quizFeedback = document.getElementById('quizFeedback');
  const nextQuizBtn = document.getElementById('nextQuizBtn');
  const quitQuizBtn = document.getElementById('quitQuizBtn');

  function startGrammarQuiz() {
    clearInterval(quizTimerInterval);
    const pool = getFilteredGrammarList();
    if (pool.length === 0) {
      alert('Pas assez de questions disponibles pour lancer un quiz dans cette catégorie.');
      return;
    }

    // Pick 10 random questions
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    quizQuestions = shuffled.slice(0, Math.min(10, shuffled.length));
    quizCurrentIndex = 0;
    quizScore = 0;
    quizScoreEl.textContent = '0 pts';

    loadQuizQuestion();
  }

  function loadQuizQuestion() {
    clearInterval(quizTimerInterval);
    if (quizCurrentIndex >= quizQuestions.length) {
      finishGrammarQuiz();
      return;
    }

    const q = quizQuestions[quizCurrentIndex];
    quizProgress.textContent = `${quizCurrentIndex + 1} / ${quizQuestions.length}`;
    quizCatTag.textContent = (q.cat || 'Grammaire').toUpperCase();
    quizSentence.innerHTML = q.sentence.replace('___', '<span class="quiz-blank">___</span>');
    quizOptions.innerHTML = '';
    quizFeedback.innerHTML = '';
    quizFeedback.className = 'quiz-feedback';
    nextQuizBtn.style.display = 'none';

    quizTimeLeft = 25;
    quizTimer.textContent = `${quizTimeLeft}s`;
    quizTimer.classList.remove('danger');

    quizTimerInterval = setInterval(() => {
      quizTimeLeft--;
      quizTimer.textContent = `${quizTimeLeft}s`;
      if (quizTimeLeft <= 7) quizTimer.classList.add('danger');
      if (quizTimeLeft <= 0) {
        clearInterval(quizTimerInterval);
        handleQuizTimeout();
      }
    }, 1000);

    (q.options || []).forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        clearInterval(quizTimerInterval);
        quizOptions.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);

        const isCorrect = opt.toLowerCase().trim() === q.answer.toLowerCase().trim();
        if (isCorrect) {
          btn.classList.add('correct');
          const ptsEarned = 10 + Math.max(0, quizTimeLeft);
          quizScore += ptsEarned;
          quizScoreEl.textContent = `${quizScore} pts`;
          quizFeedback.className = 'quiz-feedback ok';
          quizFeedback.innerHTML = `<strong>Excellent !</strong> (+${ptsEarned} pts) — ${q.meaning || q.fr || ''}`;
          speakWord(q.sentence.replace('___', opt));
        } else {
          btn.classList.add('wrong');
          quizFeedback.className = 'quiz-feedback no';
          quizFeedback.innerHTML = `<strong>Réponse attendue :</strong> ${q.answer} — ${q.meaning || q.fr || ''}`;
        }
        nextQuizBtn.style.display = 'inline-block';
      });

      quizOptions.appendChild(btn);
    });
  }

  function handleQuizTimeout() {
    const q = quizQuestions[quizCurrentIndex];
    quizOptions.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
    quizFeedback.className = 'quiz-feedback no';
    quizFeedback.innerHTML = `<strong>Temps écoulé !</strong> La bonne réponse était : <strong>${q.answer}</strong>`;
    nextQuizBtn.style.display = 'inline-block';
  }

  nextQuizBtn.addEventListener('click', () => {
    quizCurrentIndex++;
    loadQuizQuestion();
  });

  quitQuizBtn.addEventListener('click', () => {
    if (confirm('Voulez-vous quitter le quiz en cours ?')) {
      clearInterval(quizTimerInterval);
      modePracticeBtn.click();
    }
  });

  function finishGrammarQuiz() {
    clearInterval(quizTimerInterval);
    const total = quizQuestions.length;
    const maxScore = total * 35;
    const percentage = Math.round((quizScore / maxScore) * 100);

    quizFinalScore.textContent = `${quizScore} pts`;
    quizScoreLabel.textContent = `${percentage}% d'efficacité`;

    if (percentage >= 80) {
      quizResultTitle.textContent = 'Champion de Grammaire !';
      quizResultSub.textContent = 'Performance remarquable ! Vos notions de grammaire et prépositions sont au top.';
    } else if (percentage >= 50) {
      quizResultTitle.textContent = 'Très bon travail !';
      quizResultSub.textContent = 'Bonne maîtrise ! Révisez les quelques erreurs pour viser le sans-faute.';
    } else {
      quizResultTitle.textContent = 'Continuez à vous entraîner !';
      quizResultSub.textContent = 'Consultez les fiches de cours PDF pour consolider les règles essentielles.';
    }

    quizResultModal.style.display = 'flex';
  }

  quizRetryBtn.addEventListener('click', () => {
    quizResultModal.style.display = 'none';
    startGrammarQuiz();
  });

  quizBackPracticeBtn.addEventListener('click', () => {
    quizResultModal.style.display = 'none';
    modePracticeBtn.click();
  });

  // =========================================================================
  // MODULE 3: PHRASAL VERBS HUB
  // =========================================================================
  const phrasalGrid = document.getElementById('phrasalGrid');
  const phrasalSearch = document.getElementById('phrasalSearch');
  const phrasalParticleFilter = document.getElementById('phrasalParticleFilter');
  const phrasalRandomAudioBtn = document.getElementById('phrasalRandomAudioBtn');

  function renderPhrasal() {
    const q = (phrasalSearch.value || '').toLowerCase().trim();
    const particle = phrasalParticleFilter.value.toLowerCase().trim();

    const filtered = phrasalVerbs.filter(item => {
      const verb = (item.verb || item.phrase || '').toLowerCase();
      const fr = (item.fr || '').toLowerCase();
      const meaning = (item.meaning || item.en || '').toLowerCase();

      const matchesSearch = !q || verb.includes(q) || fr.includes(q) || meaning.includes(q);
      const matchesParticle = !particle || verb.split(' ').includes(particle);

      return matchesSearch && matchesParticle;
    });

    phrasalGrid.innerHTML = '';
    if (filtered.length === 0) {
      phrasalGrid.innerHTML = '<div class="empty-lessons-box"><p>Aucun Phrasal Verb trouvé pour cette recherche.</p></div>';
      return;
    }

    filtered.forEach(item => {
      const verbText = item.verb || item.phrase || '';
      const card = document.createElement('div');
      card.className = 'phrasal-card';

      const verbEl = document.createElement('h3');
      verbEl.className = 'phrasal-verb';
      verbEl.textContent = verbText;

      const speakBtn = document.createElement('button');
      speakBtn.className = 'vocab-speak-btn';
      speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      speakBtn.title = 'Écouter la prononciation';
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakWord(verbText, speakBtn);
      });
      verbEl.appendChild(speakBtn);

      const frEl = document.createElement('div');
      frEl.className = 'phrasal-fr';
      frEl.textContent = item.fr || '';

      const meaningEl = document.createElement('div');
      meaningEl.className = 'phrasal-meaning';
      meaningEl.textContent = item.meaning || item.en || '';

      card.appendChild(verbEl);
      card.appendChild(frEl);
      card.appendChild(meaningEl);

      phrasalGrid.appendChild(card);
    });
  }

  phrasalSearch.addEventListener('input', renderPhrasal);
  phrasalParticleFilter.addEventListener('change', renderPhrasal);

  if (phrasalRandomAudioBtn) {
    phrasalRandomAudioBtn.addEventListener('click', () => {
      if (phrasalVerbs.length === 0) return;
      const rand = phrasalVerbs[Math.floor(Math.random() * phrasalVerbs.length)];
      speakWord(`${rand.verb}. ${rand.meaning || ''}`, phrasalRandomAudioBtn);
      // Auto-filter or highlight
      phrasalSearch.value = rand.verb;
      renderPhrasal();
    });
  }

  // =========================================================================
  // MODULE 4: PRONONCIATION & PIÈGES PHONÉTIQUES
  // =========================================================================
  const pronGrid = document.getElementById('pronGrid');
  const pronSearch = document.getElementById('pronSearch');
  const pronTrapFilter = document.getElementById('pronTrapFilter');

  function renderPron() {
    const q = (pronSearch.value || '').toLowerCase().trim();
    const selectedTrap = (pronTrapFilter.value || '').toLowerCase().trim();

    const filtered = pronunciationWords.filter(item => {
      const wordMatch = !q || (item.word && item.word.toLowerCase().includes(q)) || (item.fr && item.fr.toLowerCase().includes(q)) || (item.focus && item.focus.toLowerCase().includes(q));
      const trapMatch = !selectedTrap || (item.trap && item.trap.toLowerCase().includes(selectedTrap));
      return wordMatch && trapMatch;
    });

    pronGrid.innerHTML = '';
    if (filtered.length === 0) {
      pronGrid.innerHTML = '<div class="empty-lessons-box"><p>Aucun piège phonétique trouvé pour cette recherche.</p></div>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'pron-card';

      const top = document.createElement('div');
      top.className = 'pron-card-top';

      const wordTitle = document.createElement('h3');
      wordTitle.className = 'pron-card-word';
      wordTitle.textContent = item.word;

      const speakBtn = document.createElement('button');
      speakBtn.className = 'vocab-speak-btn';
      speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      speakBtn.title = 'Écouter le mot';
      speakBtn.addEventListener('click', () => speakWord(item.word, speakBtn));

      top.appendChild(wordTitle);
      top.appendChild(speakBtn);

      const fr = document.createElement('div');
      fr.className = 'pron-card-fr';
      fr.textContent = item.fr || '';

      const ipa = document.createElement('div');
      ipa.className = 'ipa-tag';
      ipa.textContent = item.ipa || '';

      const tip = document.createElement('div');
      tip.className = 'pron-card-tip';
      tip.textContent = item.tip || '';

      const focus = document.createElement('div');
      focus.className = 'pron-card-focus';
      focus.textContent = item.focus ? `${item.focus}` : '';

      card.appendChild(top);
      card.appendChild(fr);
      if (item.ipa) card.appendChild(ipa);
      if (item.trap) {
        const trapPill = document.createElement('span');
        trapPill.className = 'trap-pill';
        trapPill.textContent = item.trap;
        card.appendChild(trapPill);
      }
      card.appendChild(tip);
      if (item.focus) card.appendChild(focus);

      pronGrid.appendChild(card);
    });
  }

  pronSearch.addEventListener('input', renderPron);
  pronTrapFilter.addEventListener('change', renderPron);

  // =========================================================================
  // MODULE 5: VERBES IRRÉGULIERS
  // =========================================================================
  const irregularGrid = document.getElementById('irregularGrid');
  const irregularSearch = document.getElementById('irregularSearch');
  const testModeCheck = document.getElementById('testModeCheck');

  function renderIrregular() {
    const q = (irregularSearch.value || '').toLowerCase().trim();
    const isTestMode = testModeCheck.checked;

    irregularGrid.classList.toggle('test-mode-active', isTestMode);

    const filtered = irregularVerbs.filter(item => {
      const verb = (item.verb || '').toLowerCase();
      const fr = (item.fr || '').toLowerCase();
      return !q || verb.includes(q) || fr.includes(q);
    });

    irregularGrid.innerHTML = '';
    if (filtered.length === 0) {
      irregularGrid.innerHTML = '<div class="empty-lessons-box"><p>Aucun verbe irrégulier trouvé.</p></div>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'irregular-card';

      const infinitive = document.createElement('h3');
      infinitive.className = 'irregular-infinitive';
      infinitive.textContent = item.verb;

      const speakBtn = document.createElement('button');
      speakBtn.className = 'vocab-speak-btn';
      speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      speakBtn.title = 'Écouter les 3 formes';
      speakBtn.addEventListener('click', () => {
        speakWord(`${item.verb}, ${item.past}, ${item.participle}`, speakBtn);
      });
      infinitive.appendChild(speakBtn);

      const fr = document.createElement('div');
      fr.className = 'irregular-fr';
      fr.textContent = item.fr || '';

      const formsBox = document.createElement('div');
      formsBox.className = 'irregular-forms';

      const rowPast = document.createElement('div');
      rowPast.className = 'form-row';
      rowPast.innerHTML = `<span class="form-label">Past Simple:</span> <span class="form-val hidden-test">${item.past || '-'}</span>`;

      const rowParticiple = document.createElement('div');
      rowParticiple.className = 'form-row';
      rowParticiple.innerHTML = `<span class="form-label">Past Participle:</span> <span class="form-val hidden-test">${item.participle || '-'}</span>`;

      formsBox.appendChild(rowPast);
      formsBox.appendChild(rowParticiple);

      card.appendChild(infinitive);
      card.appendChild(fr);
      card.appendChild(formsBox);

      irregularGrid.appendChild(card);
    });
  }

  irregularSearch.addEventListener('input', renderIrregular);
  testModeCheck.addEventListener('change', renderIrregular);

  // =========================================================================
  // MODULE 6: VOCABULAIRE THÉMATIQUE (Emojis conservés pour illustrer les mots)
  // =========================================================================
  const vocabGrid = document.getElementById('vocabGrid');
  const vocabSearch = document.getElementById('vocabSearch');
  const vocabCatFilter = document.getElementById('vocabCatFilter');
  const vocabLevelFilter = document.getElementById('vocabLevelFilter');

  // Populate categories
  const categories = Array.from(new Set(vocabulary.map(v => v.cat).filter(Boolean))).sort();
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    vocabCatFilter.appendChild(opt);
  });

  function renderVocab() {
    const q = (vocabSearch.value || '').toLowerCase().trim();
    const selectedCat = vocabCatFilter.value;
    const selectedLevel = vocabLevelFilter.value;

    const filtered = vocabulary.filter(item => {
      const matchSearch = !q || (item.en && item.en.toLowerCase().includes(q)) || (item.fr && item.fr.toLowerCase().includes(q));
      const matchCat = !selectedCat || item.cat === selectedCat;
      const matchLevel = !selectedLevel || item.level === selectedLevel;
      return matchSearch && matchCat && matchLevel;
    });

    vocabGrid.innerHTML = '';
    if (filtered.length === 0) {
      vocabGrid.innerHTML = '<div class="empty-lessons-box"><p>Aucun mot ne correspond à votre recherche.</p></div>';
      return;
    }

    // Fast initial slice (up to 80 items for instant response)
    filtered.slice(0, 80).forEach(item => {
      const card = document.createElement('div');
      card.className = 'vocab-card';

      const header = document.createElement('div');
      header.className = 'vocab-header';

      const emoji = document.createElement('span');
      emoji.className = 'vocab-emoji';
      emoji.textContent = item.emoji || '';

      const speakBtn = document.createElement('button');
      speakBtn.className = 'vocab-speak-btn';
      speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
      speakBtn.title = 'Écouter la prononciation';
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakWord(item.en, speakBtn);
      });

      header.appendChild(emoji);
      header.appendChild(speakBtn);

      const enWord = document.createElement('h3');
      enWord.className = 'vocab-word-en';
      enWord.textContent = item.en;

      const frWord = document.createElement('div');
      frWord.className = 'vocab-word-fr';
      frWord.textContent = item.fr;

      const meaning = document.createElement('div');
      meaning.className = 'vocab-meaning';
      meaning.textContent = item.meaning || '';

      const footer = document.createElement('div');
      footer.className = 'vocab-footer';

      if (item.cat) {
        const catBadge = document.createElement('span');
        catBadge.className = 'badge badge-cat';
        catBadge.textContent = item.cat;
        footer.appendChild(catBadge);
      }

      if (item.level) {
        const lvlBadge = document.createElement('span');
        lvlBadge.className = `badge badge-level ${item.level}`;
        lvlBadge.textContent = item.level;
        footer.appendChild(lvlBadge);
      }

      card.appendChild(header);
      card.appendChild(enWord);
      card.appendChild(frWord);
      card.appendChild(meaning);
      card.appendChild(footer);

      vocabGrid.appendChild(card);
    });
  }

  vocabSearch.addEventListener('input', renderVocab);
  vocabCatFilter.addEventListener('change', renderVocab);
  vocabLevelFilter.addEventListener('change', renderVocab);

  // Initial Fast Boot — only activate and render the current active tab
  updateCounters(0);
  switchTab(initialTab);
});
