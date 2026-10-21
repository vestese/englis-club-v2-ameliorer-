/* =====================================================================
   multiplayer.js — Mode multijoueur temps réel (Socket.IO / qserver)
   ===================================================================== */

window.CAA = window.CAA || {};

CAA.multiplayer = (function () {
  const U = () => CAA.util;
  const C = () => CAA.content;

  let socket = null;
  let ROOM = null;
  let PLAYER = { id: '', name: '', team: '', isHost: false };
  let ACTIVE_TIMERS = [];
  let _socketConnected = false;
  let _socketAttempted = false;
  let _socketRetryTimer = null;

  function getServerUrl() {
    try {
      const saved = localStorage.getItem('caa_server_url');
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
    if (window.location.protocol === 'file:') return 'http://localhost:5000';
    return ''; // Même origine (ex: sur Render ou domaine principal)
  }

  function setServerUrl(url) {
    try {
      if (url && url.trim()) {
        localStorage.setItem('caa_server_url', url.trim());
      } else {
        localStorage.removeItem('caa_server_url');
      }
    } catch (e) {}
    retrySocketConnect();
  }

  // ── Statut de connexion visible dans l'UI ──
  function _updateStatusBadge(state) {
    const badge = document.getElementById('mp-status-badge');
    const offlineBox = document.getElementById('mp-offline-box');
    if (badge) {
      if (state === 'connected') {
        badge.className = 'mp-conn-badge connected';
        badge.innerHTML = '<span class="mp-conn-dot"></span> Serveur En Ligne';
        if (offlineBox) offlineBox.style.display = 'none';
      } else if (state === 'connecting') {
        badge.className = 'mp-conn-badge connecting';
        badge.innerHTML = '<span class="mp-conn-dot"></span> Connexion en cours…';
      } else {
        badge.className = 'mp-conn-badge offline';
        badge.innerHTML = '<span class="mp-conn-dot"></span> Serveur Hors-Ligne';
        if (offlineBox) offlineBox.style.display = 'flex';
      }
    }
  }

  function getSocket() {
    try {
      if (!socket && typeof io !== 'undefined') {
        _socketAttempted = true;
        _updateStatusBadge('connecting');
        const sUrl = getServerUrl();
        const opts = {
          reconnection: true,
          reconnectionAttempts: 15,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 4000,
          transports: ['websocket', 'polling'],
          timeout: 10000
        };
        socket = sUrl ? io(sUrl, opts) : io(opts);

        socket.on('connect', () => {
          _socketConnected = true;
          _updateStatusBadge('connected');
          if (_socketRetryTimer) { clearTimeout(_socketRetryTimer); _socketRetryTimer = null; }
          const offlineBox = document.getElementById('mp-offline-box');
          if (offlineBox) offlineBox.style.display = 'none';
        });

        socket.on('disconnect', () => {
          _socketConnected = false;
          _updateStatusBadge('connecting');
        });

        socket.on('connect_error', () => {
          _socketConnected = false;
          _updateStatusBadge('offline');
        });

        setupSocketEvents();
      } else if (!socket && typeof io === 'undefined') {
        _updateStatusBadge('offline');
      }
    } catch (e) {
      console.warn('Socket init error:', e);
      _updateStatusBadge('offline');
    }
    return socket;
  }

  // Tente une reconnexion manuelle
  function retrySocketConnect() {
    try {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    } catch (e) {}
    socket = null;
    _socketConnected = false;
    _updateStatusBadge('connecting');
    getSocket();
    showToast('🔄 Tentative de connexion au serveur…', false);
    if (_socketRetryTimer) clearTimeout(_socketRetryTimer);
    _socketRetryTimer = setTimeout(() => {
      if (!socket || (!socket.connected && !_socketConnected)) {
        _updateStatusBadge('offline');
        showToast('❌ Serveur introuvable. Si vous êtes sur Render, le premier démarrage peut prendre ~30 secondes.', true);
      }
    }, 4500);
  }

  // Vérifie la connexion avant d'émettre
  function ensureConnected(callback) {
    const s = getSocket();
    if (!s) {
      showToast('❌ Librairie Socket.IO introuvable. Vérifiez votre connexion Internet.', true);
      return;
    }
    if (s.connected || _socketConnected) {
      callback(s);
      return;
    }
    showToast('⏳ Connexion au serveur en cours...', false);
    let waited = 0;
    const interval = setInterval(() => {
      waited += 200;
      if (s.connected || _socketConnected) {
        clearInterval(interval);
        callback(s);
      } else if (waited >= 3500) {
        clearInterval(interval);
        showToast('❌ Serveur inaccessible. Si vous utilisez Render, patientez 30s que le serveur gratuit se réveille.', true);
        _updateStatusBadge('offline');
      }
    }, 200);
  }

  const GAME_LABELS = {
    wordChain: 'Word Chain',
    alphabetRace: 'Alphabet Race',
    anagram: 'Anagram',
    spellingBee: 'Spelling Bee',
    wordBuilder: 'Word Builder',
    wordFromWord: 'Word from Word',
    bigChallenge: 'The Big Challenge',
    mysteryObject: 'Mystery Object',
    pronunciation: 'Pronunciation Drill',
    grammar: 'Grammar Duel',
    irregular: 'Irregular Verbs',
    phrasal: 'Phrasal Verbs',
    wheel: 'Spin the Wheel',
    charades: 'Charades',
    description: 'Description Challenge',
    tvVocab: 'TV Vocab'
  };

  function clearTimers() {
    ACTIVE_TIMERS.forEach((t) => clearInterval(t));
    ACTIVE_TIMERS = [];
  }

  function registerTimer(id) {
    ACTIVE_TIMERS.push(id);
    return id;
  }

  function showToast(msg, isError) {
    let toast = document.getElementById('caa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'caa-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:10px;font-weight:600;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,0.35);transition:all 0.3s ease;';
      document.body.appendChild(toast);
    }
    toast.style.background = isError ? '#e74c3c' : '#2ecc71';
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
      }
    }, 3500);
  }

  function syncPlayerData() {
    if (!ROOM || !PLAYER.id) return;
    if (ROOM.hostId && PLAYER.id === ROOM.hostId) {
      PLAYER.isHost = true;
    }
    const me = (ROOM.players || []).find((p) => p.id === PLAYER.id);
    if (me) {
      PLAYER.name = me.name || PLAYER.name;
      PLAYER.team = me.team || PLAYER.team;
    }
  }

  // Merge incoming score updates into local ROOM state (team + player scores)
  function mergeScoreUpdate(data) {
    if (!ROOM || !data) return;
    if (data.teamScores) {
      ROOM.teamScores = Object.assign({}, ROOM.teamScores || {}, data.teamScores);
    }
    if (Array.isArray(data.playerScores) && ROOM.players) {
      data.playerScores.forEach((ps) => {
        const p = (ROOM.players || []).find((x) => x.id === ps.id || x.name === ps.name);
        if (p) {
          p.score = ps.score || p.score || 0;
          p.correctCount = ps.correctCount || p.correctCount || 0;
        }
      });
    }
  }

  function setupSocketEvents() {
    if (!socket) return;

    socket.on('room_created', (data) => {
      ROOM = data.room;
      PLAYER.id = data.playerId;
      PLAYER.isHost = true;
      PLAYER.team = '';
      syncPlayerData();
      showToast('Room created: ' + ROOM.code, false);
      renderRoomLobby();
    });

    socket.on('room_joined', (data) => {
      ROOM = data.room;
      PLAYER.id = data.playerId;
      PLAYER.isHost = false;
      syncPlayerData();
      showToast('Joined room ' + ROOM.code, false);
      renderRoomLobby();
    });

    socket.on('room_update', (data) => {
      ROOM = data;
      syncPlayerData();
      if (ROOM.status === 'playing') {
        launchGameView();
      } else if (ROOM.status === 'lobby') {
        renderRoomLobby();
      }
    });

    socket.on('game_started', (data) => {
      ROOM = data;
      syncPlayerData();
      clearTimers();
      showToast('🚀 Game started: ' + (GAME_LABELS[ROOM.currentGame] || ROOM.currentGame), false);
      launchGameView();
    });

    socket.on('answer_result', (res) => {
      if (res.correct) {
        U().sfx.correct();
        showToast(`✅ ${res.team}: "${res.word || ''}" (+${res.points} pts)`, false);
      } else {
        U().sfx.wrong();
        showToast(`❌ ${res.team}: Wrong answer!`, true);
      }
    });

    socket.on('score_update', (data) => {
      // merge server-provided scores into ROOM state and refresh UI
      mergeScoreUpdate(data);
      updateLiveScoreboard();
    });

    // tvVocab specific reveal events (reveal single answer index)
    socket.on('tvvocab_event', (ev) => {
      if (!ROOM || !ROOM.gameInstance) return;
      if (ev.type === 'reveal') {
        const gi = ROOM.gameInstance;
        gi.masked = gi.masked || [];
        gi.masked[ev.index] = true;
        // show a brief reveal toast
        showToast(`✅ Revealed: ${ev.answer}`, false);
        // re-render active view if visible
        try { renderActiveGameView(document.querySelector('.caa-screen')); } catch (e) {}
      }
    });

    socket.on('tvvocab_update', (data) => {
      if (!ROOM) return;
      ROOM.gameInstance = data.gameInstance || ROOM.gameInstance;
      // ensure _solution hidden on client
      try { renderActiveGameView(document.querySelector('.caa-screen')); } catch (e) {}
    });

    socket.on('player_left', (data) => {
      showToast(`👋 ${data.playerName} (${data.team || 'Player'}) left room`, true);
    });

    socket.on('error_message', (data) => {
      showToast(data.error || 'An error occurred', true);
    });

    // Nouveau mot / nouvelle question après une bonne réponse
    socket.on('new_word', (data) => {
      if (!ROOM || !data.gameInstance) return;
      ROOM.gameInstance = data.gameInstance;
      // Rafraîchir l'affichage actif pour tous les jeux lorsqu'une nouvelle question/mot est reçue
      try {
        const scr = document.querySelector('.caa-screen');
        if (scr) renderActiveGameView(scr);
      } catch (e) {
        launchGameView();
      }
      showToast('✨ Question / mot suivant →', false);
    });

    socket.on('game_over', (data) => {
      renderPodiumView(data);
    });

    socket.on('reconnect', () => {
      if (ROOM && PLAYER.id) {
        showToast('Reconnected to server', false);
        socket.emit('join_room', { code: ROOM.code, name: PLAYER.name, team: PLAYER.team });
      }
    });
  }

  function leaveCurrentRoom() {
    if (ROOM && PLAYER.id) {
      const s = getSocket();
      if (s) s.emit('leave_room', { code: ROOM.code, playerId: PLAYER.id });
    }
    clearTimers();
    ROOM = null;
    PLAYER = { id: '', name: '', team: '', isHost: false };
    menu();
  }

  function renderLiveScoreboard(h) {
    if (!ROOM || !ROOM.teams) return h('div');
    const teamScores = ROOM.teamScores || {};
    const players = ROOM.players || [];
    let maxScore = -1;
    ROOM.teams.forEach((t) => {
      const s = teamScores[t.name] || 0;
      if (s > maxScore) maxScore = s;
    });

    const sb = h('div', { class: 'scoreboard mt-lg', id: 'mp-live-scoreboard' });
    ROOM.teams.forEach((t) => {
      const pts = teamScores[t.name] || 0;
      const isLeader = pts > 0 && pts === maxScore;
      const isActive = ROOM.activeTeam === t.name;
      const teamPlayers = players.filter((p) => p.team === t.name);

      let cls = 'score-chip';
      if (isActive) cls += ' active';
      if (isLeader) cls += ' leader';

      const chip = h('div', { class: cls, style: isLeader ? 'border:2px solid #f1c40f;box-shadow:0 0 10px rgba(241,196,15,0.4);' : '' }, [
        h('div', { class: 'name' }, [(isLeader ? '👑 ' : '') + t.name]),
        h('div', { class: 'pts' }, [pts + ' pts'])
      ]);

      if (teamPlayers.length > 0) {
        const playerChips = h('div', { style: 'font-size:0.75rem;opacity:0.85;margin-top:4px;' });
        teamPlayers.forEach((p) => {
          playerChips.appendChild(h('div', {}, [p.name + ': ' + (p.score || 0) + ' pts']));
        });
        chip.appendChild(playerChips);
      }

      sb.appendChild(chip);
    });
    return sb;
  }

  function updateLiveScoreboard() {
    const oldSb = document.getElementById('mp-live-scoreboard');
    if (oldSb && oldSb.parentElement) {
      const newSb = renderLiveScoreboard(U().h);
      oldSb.parentElement.replaceChild(newSb, oldSb);
    }
  }

  /* ---------------- Multi Menu ---------------- */
  function menu() {
    clearTimers();
    getSocket();
    U().show((scr) => {
      const h = U().h;

      // ─── Hero Header ───
      const hero = h('div', { class: 'mp-hero' }, [
        h('div', { class: 'mp-hero-icon' }, ['🌐']),
        h('div', {}, [
          h('h2', { class: 'mp-hero-title' }, ['Serveur Multijoueur Live']),
          h('p', { class: 'mp-hero-sub' }, ['Créez une salle, invitez vos joueurs avec le code PIN, et jouez en direct sur vos smartphones.'])
        ])
      ]);
      scr.appendChild(hero);

      // ─── Connection Status Badge & Reconnect ───
      const statusWrap = h('div', { class: 'mp-status-wrap' }, [
        h('span', { id: 'mp-status-badge', class: 'mp-conn-badge ' + (_socketConnected ? 'connected' : (socket ? 'connecting' : 'offline')) }, [
          h('span', { class: 'mp-conn-dot' }, []),
          _socketConnected ? ' Serveur En Ligne' : (socket ? ' Connexion en cours…' : ' Serveur Hors-Ligne')
        ]),
        h('button', {
          class: 'mp-retry-btn',
          onclick: () => { retrySocketConnect(); }
        }, ['🔄 Reconnecter'])
      ]);
      scr.appendChild(statusWrap);

      // ─── Server URL Toolbar ───
      const activeUrl = getServerUrl() || (window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:5000');
      const isCustom = !!localStorage.getItem('caa_server_url');
      const serverBar = h('div', { class: 'mp-server-bar' }, [
        h('div', { class: 'mp-server-info' }, [
          h('span', {}, ['📡 Serveur :']),
          h('span', { class: 'mp-server-url-tag' }, [activeUrl]),
          isCustom ? h('span', { style: 'font-size:0.75rem;color:var(--brand);font-weight:700;' }, ['(Personnalisé)']) : null
        ]),
        h('div', { style: 'display:flex;gap:6px;' }, [
          h('button', {
            class: 'mp-server-btn',
            onclick: () => {
              const current = localStorage.getItem('caa_server_url') || '';
              const input = prompt(
                'Entrez l\'URL de votre serveur Render (ex: https://club-anglais-accra.onrender.com) ou laissez vide pour utiliser l\'origine automatique :',
                current
              );
              if (input !== null) {
                setServerUrl(input);
                menu();
              }
            }
          }, ['⚙️ Configurer l\'URL']),
          isCustom ? h('button', {
            class: 'mp-server-btn',
            style: 'color:#ef4444;',
            onclick: () => {
              setServerUrl('');
              menu();
            }
          }, ['✕ Auto']) : null
        ])
      ]);
      scr.appendChild(serverBar);

      // ─── Info box quand hors-ligne (cachée par défaut si en cours de connexion ou connectée) ───
      const offlineBox = h('div', {
        id: 'mp-offline-box',
        class: 'mp-offline-box',
        style: _socketConnected ? 'display:none;' : ''
      }, [
        h('div', { class: 'mp-offline-icon' }, ['⚠️']),
        h('div', {}, [
          h('div', { style: 'font-weight:800;margin-bottom:4px;' }, ['Serveur en attente de réponse']),
          h('div', { style: 'font-size:0.9rem;opacity:0.85;line-height:1.6;' }, [
            'Si vous utilisez l\'hébergement gratuit sur Render, le serveur s\'endort après inactivité et prend environ 30 secondes pour se réveiller.',
            h('br', {}),
            '• Pour héberger en local : ', h('code', { class: 'mp-code-block' }, ['python qserver.py']),
            h('br', {}),
            '• Cliquez sur ', h('b', {}, ['🔄 Reconnecter']), ' dès que le service Render est prêt.'
          ])
        ])
      ]);
      scr.appendChild(offlineBox);

      // ─── Action Cards ───
      const cards = h('div', { class: 'mp-action-cards mt-lg' });

      // Card: Créer une salle
      const createCard = h('div', { class: 'mp-action-card host-card', onclick: () => createRoomView() }, [
        h('div', { class: 'mp-action-card-icon' }, ['👑']),
        h('div', { class: 'mp-action-card-title' }, ['Créer une Salle']),
        h('div', { class: 'mp-action-card-desc' }, ['Configurez les équipes, choisissez les jeux et lancez la partie. Vous serez l\'écran hôte TV.']),
        h('div', { class: 'mp-action-card-btn' }, ['Créer la Salle →'])
      ]);

      // Card: Rejoindre
      const joinCard = h('div', { class: 'mp-action-card join-card', onclick: () => joinRoomView() }, [
        h('div', { class: 'mp-action-card-icon' }, ['🎮']),
        h('div', { class: 'mp-action-card-title' }, ['Rejoindre une Salle']),
        h('div', { class: 'mp-action-card-desc' }, ['Entrez le code PIN affiché sur la TV hôte, choisissez votre équipe et répondez en direct !']),
        h('div', { class: 'mp-action-card-btn' }, ['Rejoindre le Jeu →'])
      ]);

      cards.appendChild(createCard);
      cards.appendChild(joinCard);
      scr.appendChild(cards);

      // ─── Features grid ───
      const features = h('div', { class: 'mp-features-grid mt-lg' }, [
        h('div', { class: 'mp-feature-item' }, ['⚡', h('span', {}, ['Temps réel WebSocket'])]),
        h('div', { class: 'mp-feature-item' }, ['📱', h('span', {}, ['Smartphones & Tablettes'])]),
        h('div', { class: 'mp-feature-item' }, ['🏆', h('span', {}, ['11 Jeux interactifs'])]),
        h('div', { class: 'mp-feature-item' }, ['👥', h('span', {}, ['Jusqu\'à 6 équipes'])])
      ]);
      scr.appendChild(features);

      // Rafraîchir badge après vérification
      setTimeout(() => _updateStatusBadge(_socketConnected ? 'connected' : (socket && socket.connected ? 'connected' : (socket ? 'connecting' : 'offline'))), 600);
    });
  }

  function createRoomView() {
    let hostName = 'Host TV';
    let teamCount = 3;
    let teamNames = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F'];
    const teamColors = [
      { name: 'Red', color: '#ef4444' },
      { name: 'Blue', color: '#3b82f6' },
      { name: 'Green', color: '#10b981' },
      { name: 'Yellow', color: '#f59e0b' },
      { name: 'Purple', color: '#8b5cf6' },
      { name: 'Orange', color: '#f97316' }
    ];

    const GAME_DESCS = {
      wordChain: 'Chaîne de mots — Enchaînez par la dernière lettre',
      alphabetRace: 'Course Alphabétique — Trouvez des mots pour chaque lettre',
      anagram: 'Anagrammes — Recomposez les lettres mélangées',
      spellingBee: 'Spelling Bee — Épelez sans erreur les mots dictés',
      wordBuilder: 'Constructeur — Créez un maximum de mots avec le tirage',
      wordFromWord: 'Mot à Mot — Formez des mots plus courts depuis le mot source',
      mysteryObject: 'Objet Mystère — Devinez l\'objet secret via les indices',
      grammar: 'Grammar Duel — Affrontez-vous sur les règles de grammaire',
      irregular: 'Verbes Irréguliers — Maîtrisez les 3 formes (Base/Past/PP)',
      phrasal: 'Phrasal Verbs — Associez verbes et prépositions',
      tvVocab: 'TV Vocab — Plateau télé style Famille en Or avec révélations & vol de points'
    };

    const GAME_ICONS = {
      wordChain: '🔗',
      alphabetRace: '🔤',
      anagram: '🔀',
      spellingBee: '🐝',
      wordBuilder: '🏗️',
      wordFromWord: '🧩',
      mysteryObject: '🔍',
      grammar: '⚔️',
      irregular: '📖',
      phrasal: '💡',
      tvVocab: '📺'
    };

    const allowedGames = ['wordChain', 'alphabetRace', 'anagram', 'spellingBee', 'wordBuilder', 'wordFromWord', 'tvVocab', 'mysteryObject', 'grammar', 'irregular', 'phrasal'];
    let selectedGames = allowedGames.slice();

    function render(scr) {
      const h = U().h;
      scr.innerHTML = '';

      scr.appendChild(h('h2', { class: 'section-title' }, ['Créer une Salle Multijoueur']));
      scr.appendChild(h('p', { class: 'section-sub' }, ['Configurez le contrôleur TV, le nombre d\'équipes et la sélection des jeux pour la partie.']));

      const container = h('div', { class: 'mt-lg', style: 'display:flex;flex-direction:column;gap:20px;' });

      // CARD 1: Host & Room Settings
      const card1 = h('div', { class: 'room-create-card' }, [
        h('div', { class: 'create-step-header' }, [
          h('div', { class: 'step-num' }, ['1']),
          h('span', {}, ['Paramètres de l\'Hôte & Nombre d\'Équipes'])
        ]),
        h('div', { class: 'form-grid' }, [
          h('label', {}, [
            'Hôte / Contrôleur TV',
            h('input', {
              type: 'text',
              value: hostName,
              placeholder: 'Nom de l\'hôte...',
              style: 'padding:12px 14px;border-radius:12px;font-size:1.05rem;font-weight:700;',
              oninput: (e) => { hostName = e.target.value; updateSummary(); }
            })
          ]),
          h('div', {}, [
            h('label', {}, ['Nombre d\'Équipes (2 à 6)']),
            h('div', { class: 'team-count-group' }, [2, 3, 4, 5, 6].map((count) => {
              const active = count === teamCount;
              return h('button', {
                type: 'button',
                class: 'team-count-btn' + (active ? ' active' : ''),
                onclick: () => {
                  teamCount = count;
                  render(scr);
                }
              }, [count + ' Équipes']);
            }))
          ])
        ])
      ]);
      container.appendChild(card1);

      // CARD 2: Team Names Configuration
      const card2 = h('div', { class: 'room-create-card' }, [
        h('div', { class: 'create-step-header' }, [
          h('div', { class: 'step-num' }, ['2']),
          h('span', {}, ['🚩 Configuration des Équipes & Badges'])
        ]),
        h('p', { class: 'section-sub', style: 'margin-top:-8px;' }, ['Personnalisez les noms des équipes participant à la partie.']),
        h('div', { class: 'team-inputs-grid' }, Array.from({ length: teamCount }, (_, i) => {
          if (!teamNames[i]) teamNames[i] = `Team ${String.fromCharCode(65 + i)}`;
          const colorObj = teamColors[i % teamColors.length];
          return h('div', { class: 'team-input-box' }, [
            h('div', { class: 'team-color-badge' }, [
              h('span', { class: 'team-color-dot', style: `background:${colorObj.color};color:${colorObj.color};` }),
              `Équipe ${i + 1}`
            ]),
            h('input', {
              type: 'text',
              value: teamNames[i],
              placeholder: `Team ${String.fromCharCode(65 + i)}`,
              style: 'background:transparent;border:none;color:var(--ink);font-weight:800;font-size:1.05rem;outline:none;',
              oninput: (e) => {
                teamNames[i] = e.target.value;
                updateSummary();
              }
            })
          ]);
        }))
      ]);
      container.appendChild(card2);

      // CARD 3: Allowed Games Matrix
      const card3 = h('div', { class: 'room-create-card' }, [
        h('div', { class: 'create-step-header' }, [
          h('div', { class: 'step-num' }, ['3']),
          h('span', {}, ['🎯 Sélection des Jeux Autorisés'])
        ]),
        h('div', { class: 'game-matrix-header' }, [
          h('span', { class: 'section-sub', style: 'margin:0;' }, [`Actifs : ${selectedGames.length} / ${allowedGames.length} jeux`]),
          h('div', { style: 'display:flex;gap:8px;' }, [
            h('button', {
              type: 'button',
              class: 'btn btn-ghost',
              style: 'padding:6px 12px;font-size:0.85rem;',
              onclick: () => { selectedGames = allowedGames.slice(); render(scr); }
            }, ['Tout Sélectionner']),
            h('button', {
              type: 'button',
              class: 'btn btn-ghost',
              style: 'padding:6px 12px;font-size:0.85rem;',
              onclick: () => { selectedGames = ['tvVocab', 'wordChain', 'anagram']; render(scr); }
            }, ['Sélection Populaire'])
          ])
        ]),
        h('div', { class: 'game-card-grid' }, allowedGames.map((key) => {
          const isSelected = selectedGames.includes(key);
          const icon = GAME_ICONS[key] || '🎮';
          const label = GAME_LABELS[key] || key;
          const desc = GAME_DESCS[key] || '';
          return h('div', {
            class: 'game-select-card' + (isSelected ? ' selected' : ''),
            onclick: () => {
              if (selectedGames.includes(key)) {
                if (selectedGames.length === 1) {
                  showToast('Au moins un jeu doit être sélectionné', true);
                  return;
                }
                selectedGames = selectedGames.filter((g) => g !== key);
              } else {
                selectedGames.push(key);
              }
              render(scr);
            }
          }, [
            h('div', { class: 'game-card-top' }, [
              h('span', { class: 'game-card-icon' }, [icon]),
              h('div', { class: 'game-card-check' }, [isSelected ? '✓' : ''])
            ]),
            h('div', {}, [
              h('div', { class: 'game-card-title' }, [label]),
              h('div', { class: 'game-card-desc' }, [desc])
            ])
          ]);
        }))
      ]);
      container.appendChild(card3);

      // LIVE SUMMARY BAR
      const summaryBar = h('div', { class: 'room-summary-bar', id: 'room-create-summary' });
      container.appendChild(summaryBar);
      scr.appendChild(container);

      // ACTION BUTTONS
      scr.appendChild(h('div', { class: 'row center mt-lg' }, [
        h('button', {
          class: 'btn btn-primary',
          style: 'padding:16px 28px;font-size:1.15rem;font-weight:900;border-radius:14px;box-shadow:var(--glow-brand);',
          onclick: () => {
            ensureConnected((s) => {
              if (!selectedGames.length) { showToast('Sélectionnez au moins un jeu', true); return; }
              const namesClean = teamNames.slice(0, teamCount).map((n, i) => (String(n || '').trim() || `Team ${String.fromCharCode(65 + i)}`));
              const uniq = new Set(namesClean.map((n) => n.toLowerCase()));
              if (uniq.size !== namesClean.length) { showToast('Les noms d\'équipes doivent être uniques', true); return; }
              s.emit('create_room', {
                hostName: hostName.trim() || 'Host TV',
                teamCount,
                teamNames: namesClean,
                allowedGames: selectedGames
              });
            });
          }
        }, ['🚀 Créer la Salle & Ouvrir le Lobby']),
        h('button', { class: 'btn btn-ghost', onclick: () => menu() }, ['Retour'])
      ]));

      function updateSummary() {
        const el = document.getElementById('room-create-summary');
        if (!el) return;
        el.innerHTML = '';
        const namesClean = teamNames.slice(0, teamCount).map((n, i) => (String(n || '').trim() || `Team ${String.fromCharCode(65 + i)}`));
        el.appendChild(h('div', { class: 'room-summary-chip' }, ['👑 Hôte: ', h('b', {}, [hostName.trim() || 'Host TV'])]));
        el.appendChild(h('div', { class: 'room-summary-chip' }, ['👥 Équipes: ', h('b', {}, [teamCount + ' (' + namesClean.join(', ') + ')'])]));
        el.appendChild(h('div', { class: 'room-summary-chip' }, ['🎯 Jeux: ', h('b', {}, [selectedGames.length + ' / ' + allowedGames.length])]));
      }

      updateSummary();
    }

    U().show(render);
  }

  function joinRoomView(prefillCode) {
    let roomCode = prefillCode || '';
    let name = '';
    let fetchedTeams = ['Team A', 'Team B', 'Team C'];
    let selectedTeam = fetchedTeams[0];
    let userSelectedTeam = false;
    let teamSelectEl = null;
    let teamSizesEl = null;
    let lastFetchedRoom = null;

    function updateTeamSelect() {
      if (!teamSelectEl) return;
      if (!fetchedTeams.includes(selectedTeam)) {
        selectedTeam = fetchedTeams[0];
        userSelectedTeam = false;
      }
      teamSelectEl.innerHTML = '';
      fetchedTeams.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === selectedTeam) opt.selected = true;
        teamSelectEl.appendChild(opt);
      });
      if (teamSizesEl && Array.isArray(fetchedTeams) && fetchedTeams.length) {
        const counts = {};
        ((lastFetchedRoom && lastFetchedRoom.playerScores) || []).forEach((ps) => { counts[ps.team] = (counts[ps.team] || 0) + 1; });
        const sizes = fetchedTeams.map((t) => `${t} (${counts[t] || 0} joueur${(counts[t] || 0) > 1 ? 's' : ''})`).join(' · ');
        teamSizesEl.textContent = 'Membres actuels : ' + sizes;
      }
    }

    function fetchTeamsForCode(code) {
      if (code && code.length >= 4) {
        const baseUrl = getServerUrl() || '';
        fetch(`${baseUrl}/api/rooms/${encodeURIComponent(code)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.teams && data.teams.length) {
              lastFetchedRoom = data;
              fetchedTeams = data.teams.map((t) => t.name);
              if (!userSelectedTeam || !fetchedTeams.includes(selectedTeam)) {
                selectedTeam = fetchedTeams[0];
                userSelectedTeam = false;
              }
              updateTeamSelect();
            }
          })
          .catch(() => { });
      }
    }

    function render(scr) {
      const h = U().h;
      scr.innerHTML = '';

      const wrap = h('div', { class: 'mp-join-box' });

      wrap.appendChild(h('div', { style: 'text-align:center;margin-bottom:16px;' }, [
        h('div', { style: 'font-size:2.8rem;margin-bottom:6px;' }, ['🎮']),
        h('h2', { class: 'section-title', style: 'margin:0;' }, ['Rejoindre une Partie']),
        h('p', { class: 'section-sub', style: 'margin:4px 0 0 0;' }, ['Entrez le code de la salle affiché sur l\'écran hôte.'])
      ]));

      // Select pour équipe
      teamSelectEl = h('select', {
        style: 'width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--card-2);color:var(--ink);font-weight:700;font-size:1rem;',
        onchange: (e) => { selectedTeam = e.target.value; userSelectedTeam = true; }
      }, fetchedTeams.map((t) => h('option', { value: t, selected: t === selectedTeam }, [t])));

      const form = h('div', { style: 'display:flex;flex-direction:column;gap:16px;' }, [
        h('div', {}, [
          h('label', { style: 'display:block;font-weight:800;font-size:0.9rem;margin-bottom:6px;' }, ['Code PIN de la Salle']),
          h('div', { class: 'mp-pin-input-wrap' }, [
            h('input', {
              class: 'mp-pin-input',
              type: 'text',
              maxlength: 6,
              value: roomCode,
              placeholder: 'ABCDE',
              autofocus: true,
              oninput: (e) => {
                roomCode = e.target.value.toUpperCase().trim();
                e.target.value = roomCode;
                if (roomCode.length >= 4) fetchTeamsForCode(roomCode);
              }
            })
          ])
        ]),

        h('div', {}, [
          h('label', { style: 'display:block;font-weight:800;font-size:0.9rem;margin-bottom:6px;' }, ['Votre Prénom / Pseudo']),
          h('input', {
            type: 'text',
            value: name,
            placeholder: 'Ex: Steve, Sarah...',
            style: 'width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--card-2);color:var(--ink);font-weight:700;font-size:1.05rem;',
            oninput: (e) => { name = e.target.value; }
          })
        ]),

        h('div', {}, [
          h('label', { style: 'display:block;font-weight:800;font-size:0.9rem;margin-bottom:6px;' }, ['Choisissez votre Équipe']),
          teamSelectEl
        ])
      ]);

      wrap.appendChild(form);

      teamSizesEl = h('div', { class: 'section-note mt', style: 'font-size:0.88rem;opacity:0.9;' });
      if (Array.isArray(fetchedTeams) && fetchedTeams.length) {
        const counts = {};
        ((lastFetchedRoom && lastFetchedRoom.playerScores) || []).forEach((ps) => { counts[ps.team] = (counts[ps.team] || 0) + 1; });
        const sizes = fetchedTeams.map((t) => `${t} (${counts[t] || 0} joueur${(counts[t] || 0) > 1 ? 's' : ''})`).join(' · ');
        teamSizesEl.textContent = 'Membres actuels : ' + sizes;
      }
      wrap.appendChild(teamSizesEl);

      wrap.appendChild(h('div', { class: 'row center mt-lg', style: 'gap:12px;' }, [
        h('button', {
          class: 'btn btn-primary',
          style: 'padding:14px 28px;font-size:1.1rem;font-weight:900;border-radius:14px;flex:1;',
          onclick: () => {
            if (!roomCode.trim()) { showToast('Entrez le code de la salle', true); return; }
            if (!name.trim()) { showToast('Entrez votre prénom', true); return; }
            ensureConnected((s) => {
              const finalTeam = selectedTeam || fetchedTeams[0] || 'Team A';
              PLAYER.name = name.trim();
              PLAYER.team = finalTeam;
              s.emit('join_room', { code: roomCode.trim(), name: name.trim(), team: finalTeam });
            });
          }
        }, ['🚀 Rejoindre le Jeu']),
        h('button', { class: 'btn btn-ghost', onclick: () => menu() }, ['Retour'])
      ]));

      scr.appendChild(wrap);
    }

    if (roomCode) fetchTeamsForCode(roomCode);
    U().show(render);
  }

  function renderRoomLobby() {
    if (!ROOM) return menu();
    clearTimers();
    syncPlayerData();

    U().show((scr) => {
      const h = U().h;

      // Hero PIN Code Display
      const pinHero = h('div', { class: 'mp-lobby-hero' }, [
        h('div', { class: 'mp-lobby-pin-label' }, ['Code de la Salle (PIN)']),
        h('div', { class: 'mp-lobby-pin-code' }, [ROOM.code]),
        h('button', {
          class: 'mp-lobby-copy-btn',
          onclick: () => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(ROOM.code);
              showToast('📋 Code ' + ROOM.code + ' copié dans le presse-papier !', false);
            } else {
              showToast('Code PIN : ' + ROOM.code, false);
            }
          }
        }, ['📋 Copier le Code PIN'])
      ]);
      scr.appendChild(pinHero);

      // Top bar info & leave
      scr.appendChild(h('div', { class: 'row space-between', style: 'align-items:center;margin-bottom:14px;' }, [
        h('div', {}, [
          h('h3', { style: 'margin:0;font-size:1.2rem;font-weight:800;' }, ['👑 Hôte TV : ' + ROOM.hostName]),
          h('p', { class: 'section-sub', style: 'margin:2px 0 0 0;' }, [
            'Jeu sélectionné : ',
            h('b', { style: 'color:var(--brand);' }, [ROOM.currentGame ? (GAME_LABELS[ROOM.currentGame] || ROOM.currentGame) : 'Aucun jeu sélectionné'])
          ])
        ]),
        h('button', { class: 'btn btn-ghost', onclick: () => U().confirmBox('Quitter la salle ?', leaveCurrentRoom) }, ['🚪 Quitter la Salle'])
      ]));

      // Tableau des scores en direct
      scr.appendChild(h('div', { class: 'section-sub mt-lg' }, ['🏆 Scores des Équipes']));
      scr.appendChild(renderLiveScoreboard(U().h));

      // Liste des joueurs connectés
      const players = ROOM.players || [];
      scr.appendChild(h('div', { class: 'section-sub mt-lg' }, [`👥 Joueurs dans la Salle (${players.length})`]));
      const playerList = h('div', { class: 'player-list mt' });
      players.forEach((p) => {
        const isMe = p.id === PLAYER.id;
        playerList.appendChild(h('div', { class: 'player-card' + (isMe ? ' me' : '') }, [
          h('div', { class: 'player-name' }, [p.name + (p.isCaptain ? ' 👑 (Capt)' : '') + (isMe ? ' (Vous)' : '')]),
          h('div', { class: 'player-meta' }, ['🚩 ' + (p.team || 'Sans équipe')]),
          h('div', { class: 'player-score' }, ['Score: ' + (p.score || 0) + ' pts'])
        ]));
      });
      scr.appendChild(playerList);

      // Panneau Hôte vs Joueur
      if (PLAYER.isHost) {
        scr.appendChild(h('div', { class: 'section-note mt-lg', style: 'background:rgba(37,99,235,0.12);border:1.5px solid var(--brand);' }, [
          '👑 Vous êtes l\'Hôte TV. Choisissez un jeu puis cliquez sur "Démarrer" pour lancer la partie sur tous les appareils.'
        ]));
        const hostControls = h('div', { class: 'row mt-lg', style: 'gap:12px;flex-wrap:wrap;' }, [
          h('button', { class: 'btn btn-primary', onclick: () => chooseGameView() }, ['🎯 Choisir le Jeu & Paramètres']),
          ROOM.currentGame ? h('button', {
            class: 'btn btn-primary',
            style: 'background:linear-gradient(135deg,#10b981,#059669);border-color:#10b981;',
            onclick: () => {
              getSocket().emit('start_game', { code: ROOM.code, playerId: PLAYER.id });
            }
          }, ['🚀 Démarrer la Partie']) : null,
          ROOM.currentGame ? h('button', { class: 'btn btn-red', onclick: () => U().confirmBox('Terminer la partie et afficher le podium ?', () => { getSocket().emit('end_game', { code: ROOM.code, playerId: PLAYER.id }); }) }, ['🏁 Terminer la Partie']) : null
        ]);
        scr.appendChild(hostControls);
      } else {
        const me = players.find((p) => p.id === PLAYER.id);
        const myTeam = (me && me.team) || PLAYER.team || (ROOM.teams && ROOM.teams[0] && ROOM.teams[0].name) || '';
        scr.appendChild(h('div', { class: 'section-sub mt-lg' }, ['Vos Paramètres']));
        scr.appendChild(h('div', { class: 'form-grid' }, [
          h('label', {}, ['Votre Prénom', h('input', {
            type: 'text', value: (me && me.name) || PLAYER.name, onchange: (e) => {
              getSocket().emit('update_player', { code: ROOM.code, playerId: PLAYER.id, name: e.target.value });
            }
          })]),
          h('div', { class: 'section-note', style: 'margin-top:20px;font-weight:700;font-size:1.1rem;' }, ['🚩 Équipe : ' + myTeam])
        ]));
        scr.appendChild(h('div', { class: 'section-note mt-lg', style: 'background:rgba(245,158,11,0.1);border:1px solid #f59e0b;' }, ['⏳ En attente que l\'hôte TV lance le prochain jeu... Préparez-vous !']));
      }
    });
  }

  function chooseGameView() {
    const allowed = (ROOM.allowedGames || []).map((key) => ({ key, label: GAME_LABELS[key] || key }));
    let selectedKey = ROOM.currentGame || (allowed[0] && allowed[0].key) || 'anagram';
    let opts = { roundSec: 90, minLength: 3, wordSec: 20, wordsPerTurn: 5, turnSec: 60, poolSize: 22 };

    function render(scr) {
      const h = U().h;
      scr.innerHTML = '';
      scr.appendChild(h('h2', { class: 'section-title' }, ['Choose & Configure Game']));
      scr.appendChild(h('p', { class: 'section-sub' }, ['Select game type and customize round settings for your multiplayer match.']));

      const list = h('div', { class: 'choice-grid mt' });
      allowed.forEach((game) => {
        const isSelected = game.key === selectedKey;
        list.appendChild(h('div', {
          class: 'choice' + (isSelected ? ' active' : ''),
          style: isSelected ? 'border:2px solid var(--brand);background:var(--card-2);' : '',
          onclick: () => { selectedKey = game.key; render(scr); }
        }, [h('h4', {}, [game.label])]));
      });
      scr.appendChild(list);

      // Options Panel per game
      const optsCard = h('div', { class: 'gd-question mt-lg' });
      optsCard.appendChild(h('div', { class: 'topic-tag' }, ['⚙️ Game Configuration — ' + (GAME_LABELS[selectedKey] || selectedKey)]));

      if (['alphabetRace', 'wordFromWord', 'mysteryObject', 'anagram', 'wordBuilder'].includes(selectedKey)) {
        const timePills = h('div', { class: 'pill-group mt' });
        [40, 60, 90, 120, 180].forEach((sec) => {
          timePills.appendChild(h('button', {
            class: 'pill' + (opts.roundSec === sec ? ' active' : ''),
            onclick: () => { opts.roundSec = sec; render(scr); }
          }, [sec + 's']));
        });
        optsCard.appendChild(h('div', {}, [h('div', { class: 'section-sub mt' }, ['Round Duration']), timePills]));
      }

      if (['alphabetRace', 'wordFromWord'].includes(selectedKey)) {
        const lenPills = h('div', { class: 'pill-group mt' });
        [3, 4, 5, 6].forEach((len) => {
          lenPills.appendChild(h('button', {
            class: 'pill' + (opts.minLength === len ? ' active' : ''),
            onclick: () => { opts.minLength = len; render(scr); }
          }, [len + ' letters']));
        });
        optsCard.appendChild(h('div', {}, [h('div', { class: 'section-sub mt' }, ['Minimum Word Length']), lenPills]));
      }

      if (selectedKey === 'wordChain') {
        const turnPills = h('div', { class: 'pill-group mt' });
        [30, 45, 60, 90].forEach((sec) => {
          turnPills.appendChild(h('button', {
            class: 'pill' + (opts.turnSec === sec ? ' active' : ''),
            onclick: () => { opts.turnSec = sec; render(scr); }
          }, [sec + 's']));
        });
        optsCard.appendChild(h('div', {}, [h('div', { class: 'section-sub mt' }, ['Time per Team Turn']), turnPills]));
      }

      if (selectedKey === 'wordBuilder') {
        const sizePills = h('div', { class: 'pill-group mt' });
        [22, 26, 30].forEach((size) => {
          sizePills.appendChild(h('button', {
            class: 'pill' + (opts.poolSize === size ? ' active' : ''),
            onclick: () => { opts.poolSize = size; render(scr); }
          }, [size + ' letters']));
        });
        optsCard.appendChild(h('div', {}, [h('div', { class: 'section-sub mt' }, ['Letter Pool Size']), sizePills]));
      }

      scr.appendChild(optsCard);

      scr.appendChild(h('div', { class: 'row mt-lg' }, [
        h('button', {
          class: 'btn btn-primary', onclick: () => {
            getSocket().emit('select_game', { code: ROOM.code, playerId: PLAYER.id, game: selectedKey, opts });
            getSocket().emit('start_game', { code: ROOM.code, playerId: PLAYER.id, opts });
          }
        }, ['Apply & Start Game 🚀']),
        h('button', { class: 'btn btn-ghost', onclick: () => renderRoomLobby() }, ['Back to Lobby'])
      ]));
    }

    U().show(render);
  }

  /* ---------------- Launch Active Game ---------------- */
  function launchGameView() {
    if (!ROOM || !ROOM.currentGame) return;
    clearTimers();

    U().show((scr) => {
      renderActiveGameView(scr);
    });
  }

  function renderActiveGameView(scr) {
    const h = U().h;
    scr.innerHTML = '';
    syncPlayerData();

    const gameKey = ROOM.currentGame;
    const gameLabel = GAME_LABELS[gameKey] || gameKey;
    const isHost = PLAYER.isHost;
    const isTurnBased = ROOM.gameMode === 'turnBased';
    const activeTeam = ROOM.activeTeam || (ROOM.teams && ROOM.teams[0] && ROOM.teams[0].name);

    // Lire l'équipe depuis le serveur (source de vérité) — pas depuis PLAYER.team seul
    const serverMe = (ROOM.players || []).find((p) => p.id === PLAYER.id);
    const myTeam = (serverMe && serverMe.team) || PLAYER.team || '';
    const myTeamClean = String(myTeam).trim().toLowerCase();
    const activeTeamClean = String(activeTeam || '').trim().toLowerCase();
    const canPlay = !isHost && (!isTurnBased || (myTeamClean !== '' && myTeamClean === activeTeamClean));

    // Header bar
    scr.appendChild(h('div', { class: 'row space-between' }, [
      h('h2', { class: 'section-title' }, [gameLabel + ' — Room ' + ROOM.code]),
      h('button', { class: 'btn btn-ghost', onclick: () => U().confirmBox('Leave game?', leaveCurrentRoom) }, ['🚪 Exit'])
    ]));

    // Host Panel vs Player Panel
    if (isHost) {
      scr.appendChild(h('div', { class: 'section-note mt', style: 'background:rgba(241,196,15,0.2);border:1px solid #f1c40f;' }, [
        '📺 TV Host Control Mode: Guide the game. You do not type answers.'
      ]));

      const hostActionRow = h('div', { class: 'row center mt-lg', style: 'gap:10px;flex-wrap:wrap;' });
      hostActionRow.appendChild(h('button', {
        class: 'btn btn-primary', onclick: () => {
          getSocket().emit('next_question', { code: ROOM.code, playerId: PLAYER.id });
        }
      }, ['⏭ Question / Mot Suivant']));
      if (isTurnBased) {
        hostActionRow.appendChild(h('button', {
          class: 'btn btn-ghost', onclick: () => {
            getSocket().emit('next_turn', { code: ROOM.code, playerId: PLAYER.id });
          }
        }, ['▶ Tour Équipe Suivante']));
      }
      hostActionRow.appendChild(h('button', {
        class: 'btn btn-red', onclick: () => {
          getSocket().emit('end_game', { code: ROOM.code, playerId: PLAYER.id });
        }
      }, ['🏁 Fin de Partie']));
      scr.appendChild(hostActionRow);
    } else {
      const statusText = canPlay
        ? '🎯 Your team (' + myTeam + ') can answer now!'
        : '⏳ Waiting for ' + activeTeam + ' to answer...';
      scr.appendChild(h('div', { class: 'section-note mt', style: canPlay ? 'background:rgba(46,204,113,0.2);border:1px solid #2ecc71;' : 'background:rgba(255,255,255,0.05);' }, [statusText]));
    }

    // Dynamic Game Content Render
    const card = h('div', { class: 'gd-question mt-lg' });
    const gameInst = ROOM.gameInstance || {};

    if (gameKey === 'alphabetRace') {
      const alphabet = gameInst.alphabet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const board = h('div', { class: 'alphabet-board' },
        alphabet.map((ch, idx) => {
          const isCurrent = idx === (gameInst.currentIndex || 0);
          let cls = 'alphabet-tile';
          if (isCurrent) cls += ' current';
          return h('span', { class: cls }, [ch]);
        })
      );
      card.appendChild(board);
      card.appendChild(h('div', { class: 'turn-banner mt' }, ['🔠 Alphabet Race — Letter ', h('span', { class: 'ans' }, [gameInst.activeLetter || 'A'])]));
      card.appendChild(h('p', { class: 'section-sub mt' }, ['Enter an English word starting with letter ', gameInst.activeLetter || 'A', ' (min ', gameInst.opts?.minLength || 3, ' letters).']));
    } else if (gameKey === 'spellingBee') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🐝 Spelling Bee']));
      if (gameInst.word) {
        card.appendChild(h('button', { class: 'btn btn-primary mt', onclick: () => U().speak(gameInst.word) }, ['🔊 Listen to Word']));
      }
      card.appendChild(h('p', { class: 'section-sub mt' }, [gameInst.frHint || 'Spell out loud or type the English word.']));
    } else if (gameKey === 'anagram') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🔀 Anagram Challenge']));
      const scrambledEl = document.createElement('div');
      scrambledEl.id = 'mp-anagram-scrambled';
      scrambledEl.className = 'word-card mt';
      scrambledEl.style.cssText = 'font-size:2.2rem;letter-spacing:8px;font-weight:900;transition:opacity 0.3s;';
      scrambledEl.textContent = gameInst.scrambled || 'ANAGRAM';
      card.appendChild(scrambledEl);
      card.appendChild(h('p', { class: 'section-sub mt' }, [
        '🔡 Reconstituez le mot anglais à partir de ces lettres'
      ]));
      // Mots déjà soumis dans ce round
      const used = (gameInst.usedWords || []);
      if (used.length) {
        card.appendChild(h('div', { class: 'section-note mt', style: 'font-size:0.85rem;opacity:0.7;' }, [
          'Déjà soumis : ' + used.join(', ')
        ]));
      }
    } else if (gameKey === 'wordBuilder') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['Word Builder']));
      card.appendChild(h('div', { class: 'word-card mt', style: 'font-size:1.8rem;letter-spacing:4px;' }, [gameInst.letters || 'A B C D E F']));
      card.appendChild(h('p', { class: 'section-sub mt' }, ['Build valid English words using these letters!']));
    } else if (gameKey === 'wordChain') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['Word Chain — Start word: ' + (gameInst.startWord || 'APPLE')]));
      card.appendChild(h('p', { class: 'section-sub mt' }, ['Enter a word starting with letter: ', h('b', { style: 'font-size:1.4rem;color:var(--brand);' }, [gameInst.activeLetter || 'E'])]));
    } else if (gameKey === 'wordFromWord') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['Word From Word — Base word: ' + (gameInst.baseWord || 'DICTIONARY')]));
      card.appendChild(h('p', { class: 'section-sub mt' }, ['Build smaller words using letters from ' + (gameInst.baseWord || 'DICTIONARY') + '.']));
    } else if (gameKey === 'mysteryObject') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🔍 Mystery Object ' + (gameInst.emoji || '❓')]));
      card.appendChild(h('div', { class: 'wheel-challenge mt' }, [gameInst.clue || 'A mystery object in English.']));
      if (gameInst.fr) {
        const frBox = h('div', { class: 'section-note mt hidden' }, ['🇫🇷 Traduction : ' + gameInst.fr]);
        const hintBtn = h('button', {
          class: 'btn btn-hint mt', onclick: (e) => {
            frBox.classList.remove('hidden');
            e.target.disabled = true;
          }
        }, ['🇫🇷 Show French Hint (-20 pts)']);
        card.appendChild(hintBtn);
        card.appendChild(frBox);
      }
    } else if (gameKey === 'grammar') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['📝 Grammar Duel — ' + (gameInst.cat || 'Grammar')]));
      card.appendChild(h('div', { class: 'wheel-challenge mt' }, [gameInst.sentence || 'Sentence with a blank ___']));
      if (gameInst.options && !isHost && canPlay) {
        const choicePills = h('div', { class: 'pill-group mt-lg' });
        gameInst.options.forEach((opt) => {
          choicePills.appendChild(h('button', { class: 'pill active', onclick: () => submitAnswer(opt) }, [opt]));
        });
        card.appendChild(choicePills);
      }
    } else if (gameKey === 'irregular') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🔁 Irregular Verbs']));
      card.appendChild(h('div', { class: 'wheel-challenge mt' }, [
        'Verb: ', h('b', { style: 'color:var(--brand);' }, [gameInst.verb || 'Go']),
        gameInst.fr ? h('span', { style: 'opacity:0.7;margin-left:6px;' }, ['(' + gameInst.fr + ')']) : null
      ]));
      card.appendChild(h('p', { class: 'section-sub mt' }, ['What is the ', h('b', {}, [gameInst.targetForm || 'Past Simple']), '?']));
      if (gameInst.options && gameInst.options.length && !isHost && canPlay) {
        const choicePills = h('div', { class: 'pill-group mt-lg' });
        gameInst.options.forEach((opt) => {
          choicePills.appendChild(h('button', { class: 'pill active', onclick: () => submitAnswer(opt) }, [opt]));
        });
        card.appendChild(choicePills);
      }
    } else if (gameKey === 'phrasal') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🔗 Phrasal Verbs']));
      card.appendChild(h('div', { class: 'wheel-challenge mt', style: 'font-size:2rem;font-weight:800;color:var(--brand);' }, [gameInst.verb || 'give up']));
      card.appendChild(h('button', { class: 'btn btn-ghost mt', style: 'font-size:0.95rem;', onclick: () => U().speak(gameInst.verb) }, ['🔊 Listen']));
      card.appendChild(h('p', { class: 'section-sub mt' }, ['What does this phrasal verb mean?']));
      if (gameInst.options && gameInst.options.length && !isHost && canPlay) {
        const choicePills = h('div', { class: 'pill-group mt-lg' });
        gameInst.options.forEach((opt) => {
          choicePills.appendChild(h('button', { class: 'pill active', onclick: () => submitAnswer(opt) }, [opt]));
        });
        card.appendChild(choicePills);
      }
    } else if (gameKey === 'pronunciation') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🗣️ Pronunciation Drill']));
      card.appendChild(h('div', { class: 'word-card mt', style: 'font-size:2rem;' }, [gameInst.word || 'ENGLISH']));
      card.appendChild(h('button', { class: 'btn btn-primary mt', onclick: () => U().speak(gameInst.word) }, ['🔊 Listen to Model Audio']));
    } else if (gameKey === 'wheel') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🎡 Spin the Wheel Challenge']));
      card.appendChild(h('div', { class: 'wheel-challenge mt' }, [gameInst.challenge || 'Perform the English challenge!']));
    } else if (gameKey === 'charades') {
      card.appendChild(h('div', { class: 'topic-tag' }, ['🎭 Charades']));
      card.appendChild(h('div', { class: 'wheel-challenge mt' }, ['Act it out: ' + (gameInst.item || 'Playing guitar 🎸')]));
    } else if (gameKey === 'description') {
      card.appendChild(h('div', { class: 'topic-tag' }, [
        (gameInst.emoji || '💡') + ' Description Challenge — ' + (gameInst.topic || 'General') + ' (' + (gameInst.difficulty || 'medium') + ')'
      ]));

      const descText = gameInst.description || 'Description not loaded';
      let revealed = false;

      // Boutons de vitesse de lecture vocale
      const audioRow = h('div', { class: 'row center mt', style: 'gap:8px;flex-wrap:wrap;' }, [
        h('button', {
          class: 'btn btn-primary',
          style: 'background:linear-gradient(135deg, #8e44ad, #3498db);border:none;font-size:1rem;padding:10px 16px;',
          onclick: () => U().speak(descText, { rate: 0.85 })
        }, ['🔊 Listen (Normal)']),
        h('button', {
          class: 'btn btn-ghost',
          style: 'font-size:0.95rem;padding:10px 14px;border:1px solid var(--line);',
          onclick: () => U().speak(descText, { rate: 0.6 })
        }, ['🐢 Slow (0.6x)']),
        h('button', {
          class: 'btn btn-ghost',
          style: 'font-size:0.95rem;padding:10px 14px;border:1px solid var(--line);',
          onclick: () => U().speak(descText, { rate: 0.45 })
        }, ['🐢 Very Slow (0.45x)'])
      ]);

      card.appendChild(audioRow);

      const descTextHolder = h('div', {
        id: 'mp-desc-text-holder',
        class: 'section-note mt',
        style: 'font-size:1.1rem;line-height:1.6;background:rgba(0,0,0,0.3);padding:16px;border-radius:12px;border:1px dashed var(--line);'
      }, ['🔒 Text description is hidden. Listen to the audio or click reveal below.']);

      const revealBtn = h('button', {
        class: 'btn btn-hint mt',
        style: 'background:rgba(241,196,15,0.2);border:1px solid #f1c40f;color:#f1c40f;',
        onclick: (e) => {
          revealed = true;
          descTextHolder.textContent = '📖 ' + descText;
          descTextHolder.style.border = '1px solid #f1c40f';
          e.target.disabled = true;
          e.target.textContent = '👁️ Text Revealed (-20 pts penalty)';
          showToast('👁️ Text revealed! (-20 pts penalty on correct answer)', true);
        }
      }, ['👁️ Reveal Text (-20 pts Penalty)']);

      card.appendChild(descTextHolder);
      card.appendChild(revealBtn);

      if (gameInst.options && !isHost && canPlay) {
        card.appendChild(h('div', { class: 'section-sub mt-lg', style: 'font-weight:700;' }, ['Select your answer (QCM) or type it manually below:']));
        const choicePills = h('div', { class: 'pill-group mt' });
        gameInst.options.forEach((opt) => {
          choicePills.appendChild(h('button', {
            class: 'pill active',
            style: 'padding:10px 18px;font-size:1.05rem;',
            onclick: () => submitAnswer(opt, null, { revealed })
          }, [opt]));
        });
        card.appendChild(choicePills);
      }

      setTimeout(() => {
        try { U().speak(descText); } catch (e) {}
      }, 450);
    } else {
      card.appendChild(h('div', { class: 'topic-tag' }, [gameLabel]));
      card.appendChild(h('div', { class: 'wheel-challenge mt' }, [gameInst.question || 'Answer the challenge!']));
      if (gameInst.options && !isHost && canPlay) {
        const choicePills = h('div', { class: 'pill-group mt-lg' });
        gameInst.options.forEach((opt) => {
          choicePills.appendChild(h('button', { class: 'pill active', onclick: () => submitAnswer(opt) }, [opt]));
        });
        card.appendChild(choicePills);
      }
    }

    // TV Vocab rendering placed after main blocks to keep it concise
    if (gameKey === 'tvVocab') {
      const prompt = gameInst.prompt || 'TV Vocab Prompt';
      card.className = 'gd-question tvv-card mt-lg';
      card.innerHTML = ''; // clear default

      // Ensure tvvocab stylesheet is linked
      if (!document.querySelector('link[href="css/tvvocab.css"]')) {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'css/tvvocab.css'; document.head.appendChild(link);
      }

      // Studio Prompt Box Header
      const promptBox = h('div', { class: 'tvv-prompt-box' }, [
        h('div', { class: 'topic-tag', style: 'background:var(--tvv-gold);color:#000;font-weight:900;margin-bottom:8px;' }, ['📺 TV VOCAB SHOW']),
        h('h3', {}, [prompt])
      ]);
      card.appendChild(promptBox);

      // Answers Grid with Numbered Slot Tiles
      const answers = (gameInst.answers || []).map((a, idx) => {
        const revealed = (gameInst.masked || [])[idx];
        const numStr = String(idx + 1).padStart(2, '0');
        const cls = 'tv-answer ' + (revealed ? 'revealed' : 'hidden');
        if (revealed) {
          return h('div', { class: cls }, [
            h('span', { class: 'tv-ans-text' }, [a]),
            h('span', { class: 'tv-pts-badge' }, ['+100 PTS'])
          ]);
        } else {
          return h('div', { class: cls }, [
            h('span', { class: 'tv-num-badge' }, [numStr]),
            h('span', { class: 'tv-lock-icon' }, ['🔒'])
          ]);
        }
      });

      const row = h('div', { class: 'tv-answers mt-lg' });
      answers.forEach((el) => row.appendChild(el));
      card.appendChild(row);

      // Round Points & Fault Stats Bar
      const faults = gameInst.faults || {};
      const activeTeamName = ROOM.activeTeam || (ROOM.teams && ROOM.teams[0] && ROOM.teams[0].name) || 'Team';

      const statsBar = h('div', { class: 'tvv-stats' }, [
        h('div', { class: 'round-points' }, [
          '🏆 Round Score: ',
          h('span', { class: 'round-points-val' }, [(gameInst.roundPoints || 0) + ' PTS'])
        ])
      ]);

      const faultsWrap = h('div', { class: 'faults-wrap' });
      (ROOM.teams || []).forEach((t) => {
        const f = faults[t.name] || 0;
        const isActive = activeTeamName === t.name;
        faultsWrap.appendChild(h('div', { class: 'team-fault ' + (isActive ? 'active' : '') }, [
          t.name + ' : ' + f + ' fault' + (f > 1 ? 's' : '')
        ]));
      });
      statsBar.appendChild(faultsWrap);
      card.appendChild(statsBar);

      // Strike Counter (Big Red X Badges) for active team
      const activeFaults = faults[activeTeamName] || 0;
      const xArea = h('div', { class: 'tvv-x-area' }, []);
      const xBoxes = h('div', { class: 'tvv-x-boxes' }, []);
      for (let i = 0; i < 3; i++) {
        xBoxes.appendChild(h('div', { class: 'tvv-x ' + (i < activeFaults ? 'show' : '') }, [i < activeFaults ? 'X' : '•']));
      }
      xArea.appendChild(xBoxes);
      card.appendChild(xArea);

      // Steal Mode Banner ("VOL DE POINTS")
      if (gameInst.finalStealAllowed) {
        card.appendChild(h('div', { class: 'tvv-steal' }, [
          '⚡ VOL DE POINTS DISPONIBLE ! L\'autre équipe peut tenter de voler la manche !'
        ]));
      }
    }

    if (!isHost) {
      // Création via DOM pur pour éviter le bug setAttribute('disabled', false)
      // qui laisse le champ désactivé même quand canPlay = true.
      const input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('inputmode', 'text');
      input.setAttribute('enterkeyhint', 'send');
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'none');
      input.placeholder = canPlay ? 'Tapez votre réponse...' : '⏳ Attendez votre tour...';
      input.disabled = false;  // TOUJOURS activé — le blocage est dans le submit
      input.style.cssText = [
        'display:block;width:100%;box-sizing:border-box;',
        'max-width:420px;padding:14px 16px;border-radius:12px;',
        'font-size:1.15rem;background:var(--card-2);',
        'border:2px solid ' + (canPlay ? '#2ecc71' : 'var(--line)') + ';',
        'color:var(--ink);margin-top:12px;outline:none;',
        '-webkit-appearance:none;'
      ].join('');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (!canPlay) { showToast('⏳ Pas ton tour!', true); return; }
          submitAnswer(input.value, input);
        }
      });

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Envoyer 🚀';
      submitBtn.className = 'btn btn-primary mt';
      submitBtn.disabled = false;  // jamais disabled
      submitBtn.style.opacity = canPlay ? '1' : '0.5';
      submitBtn.addEventListener('click', () => {
        if (!canPlay) { showToast('⏳ Pas ton tour!', true); return; }
        submitAnswer(input.value, input);
      });

      const row = document.createElement('div');
      row.className = 'wc-input-row mt-lg';
      row.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
      row.appendChild(input);
      row.appendChild(submitBtn);
      card.appendChild(row);
    }

    scr.appendChild(card);
    scr.appendChild(renderLiveScoreboard(h));
  }

  function renderPodiumView(data) {
    U().confetti();
    U().sfx.gift();

    const teamRankings = data.teamRankings || [];
    const playerRankings = data.playerRankings || [];
    const mvp = data.mvp;

    U().show((scr) => {
      const h = U().h;
      scr.appendChild(h('h2', { class: 'section-title' }, ['🏆 Multiplayer Match Podium & Winner Summary']));
      scr.appendChild(h('p', { class: 'section-sub' }, ['Grand final results: Team standings & Best Player MVP!']));

      // MVP Highlight Card
      if (mvp) {
        const mvpCard = h('div', {
          class: 'gd-question mt-lg',
          style: 'background:linear-gradient(135deg, rgba(241,196,15,0.25), rgba(230,126,34,0.25));border:2px solid #f1c40f;box-shadow:0 0 20px rgba(241,196,15,0.3);'
        });
        mvpCard.appendChild(h('div', { class: 'topic-tag', style: 'background:#f1c40f;color:#000;font-weight:900;' }, ['🥇 BEST PLAYER MVP']));
        mvpCard.appendChild(h('h3', { style: 'font-size:2.2rem;margin-top:8px;color:#f1c40f;' }, ['👑 ' + mvp.name]));
        mvpCard.appendChild(h('p', { class: 'section-sub mt-sm' }, [
          'Team: ', h('b', {}, [mvp.team]), '  |  Total Score: ', h('b', { style: 'color:#f1c40f;' }, [mvp.score + ' pts']), '  |  Correct Answers: ', h('b', {}, [mvp.correctCount || 0])
        ]));
        scr.appendChild(mvpCard);
      }

      // Team Podium Card
      const teamCard = h('div', { class: 'gd-question mt-lg' });
      teamCard.appendChild(h('div', { class: 'topic-tag' }, ['🚩 Team Standings']));

      // Visual podium for top 3
      const podium = h('div', { class: 'podium mt-lg' });
      const first = teamRankings[0] || { name: '-', score: 0 };
      const second = teamRankings[1] || { name: '-', score: 0 };
      const third = teamRankings[2] || { name: '-', score: 0 };

      podium.appendChild(h('div', { class: 'step silver' }, [h('div', {}, ['🥈']), h('div', { style: 'font-weight:700;margin-top:8px;' }, [second.name]), h('div', {}, [second.score + ' pts'])]));
      podium.appendChild(h('div', { class: 'step gold' }, [h('div', {}, ['🥇']), h('div', { style: 'font-weight:700;margin-top:8px;' }, [first.name]), h('div', {}, [first.score + ' pts'])]));
      podium.appendChild(h('div', { class: 'step bronze' }, [h('div', {}, ['🥉']), h('div', { style: 'font-weight:700;margin-top:8px;' }, [third.name]), h('div', {}, [third.score + ' pts'])]));

      teamCard.appendChild(podium);

      // Full rankings below
      const list = h('div', { class: 'mt-lg', style: 'display:flex;flex-direction:column;gap:8px;' });
      teamRankings.forEach((t, idx) => {
        list.appendChild(h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:8px;background:var(--card-2);border:1px solid var(--line);' }, [h('span', {}, [(idx + 1) + '. ' + t.name]), h('span', { style: 'font-weight:800;' }, [t.score + ' pts'])]));
      });
      teamCard.appendChild(list);
      scr.appendChild(teamCard);

      // Player Leaderboard Card
      if (playerRankings.length) {
        const playerCard = h('div', { class: 'gd-question mt-lg' });
        playerCard.appendChild(h('div', { class: 'topic-tag' }, ['👤 Player Individual Leaderboard']));

        const playerGrid = h('div', { class: 'mt-lg', style: 'display:flex;flex-direction:column;gap:8px;' });
        playerRankings.forEach((p, idx) => {
          playerGrid.appendChild(h('div', {
            style: 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;background:var(--card-2);border:1px solid var(--line);'
          }, [
            h('span', {}, [(idx + 1) + '. ' + p.name + ' (' + p.team + ')']),
            h('span', { style: 'font-weight:700;color:var(--ink);' }, [p.score + ' pts (' + (p.correctCount || 0) + ' correct)'])
          ]));
        });
        playerCard.appendChild(playerGrid);
        scr.appendChild(playerCard);
      }

      scr.appendChild(h('div', { class: 'row center mt-lg' }, [
        h('button', { class: 'btn btn-primary', onclick: () => renderRoomLobby() }, ['🚀 Return to Lobby'])
      ]));
    });
  }

  function submitAnswer(word, inputEl, extraOpts) {
    if (!word || !word.trim()) return;
    const s = getSocket();
    if (!s) return;
    s.emit('submit_answer', {
      code: ROOM.code,
      playerId: PLAYER.id,
      word: word.trim(),
      revealed: !!(extraOpts && extraOpts.revealed)
    });
    if (inputEl) {
      inputEl.value = '';
      try { inputEl.focus(); } catch (e) {}
    }
  }

  return {
    menu,
    createRoomView,
    joinRoomView,
    renderRoomLobby,
    leaveCurrentRoom,
    retrySocketConnect,
    getServerUrl,
    setServerUrl
  };
})();
