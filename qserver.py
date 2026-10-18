"""
Accra English Club - Backend multijoueur temps réel.

Architecture :
- Flask sert les fichiers statiques + quelques endpoints REST de confort
  (lecture seule, utilisés au chargement initial de la page).
- Flask-SocketIO gère TOUT ce qui est temps réel : création/rejoindre une
  salle, démarrage du jeu, tours, soumissions de réponses, scores.
  Le serveur est la SEULE source de vérité (ROOMS en mémoire) ; le client
  ne fait jamais confiance à son propre état, il applique ce que le
  serveur lui envoie.
- Persistance sur disque en JSON pour survivre à un redémarrage, protégée
  par un verrou (threading.Lock) pour éviter les corruptions en cas
  d'écritures concurrentes.

Installation :
    pip install flask flask-socketio eventlet

Lancement (dev) :
    python app.py

Le frontend doit inclure le client Socket.IO :
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
et se connecter avec : const socket = io();
"""

import os
import sys
from flask import Flask, jsonify, request, send_from_directory, Response
from werkzeug.utils import secure_filename
from flask_socketio import SocketIO, join_room as sio_join_room, leave_room as sio_leave_room, emit
from pathlib import Path
import json
import random
import string
import sqlite3
import threading
import time
from datetime import datetime
import dictionary
import gdrive_service

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / 'qserver_data.json'
DB_FILE = BASE_DIR / 'vocabulaire_anglais.db'

app = Flask(__name__, static_folder='.', static_url_path='')

# Configuration intelligente du mode asynchrone :
# - Local Windows : 'threading' (100% stable, rapide, sans warning eventlet)
# - Production Render / Linux : 'gevent'
if sys.platform == 'win32' or not os.environ.get('RENDER'):
    async_mode = 'threading'
else:
    try:
        import gevent
        async_mode = 'gevent'
    except ImportError:
        async_mode = 'threading'

socketio = SocketIO(app, cors_allowed_origins='*', async_mode=async_mode)

# ---------------------------------------------------------------------------
# État en mémoire (source de vérité) + verrou pour les accès concurrents
# ---------------------------------------------------------------------------
ROOMS_LOCK = threading.Lock()
ROOMS = {}          # code -> room dict
SID_TO_PLAYER = {}  # socket session id -> {'code': ..., 'playerId': ...}


def now_iso():
    return datetime.utcnow().isoformat() + 'Z'


def now_ts():
    """Timestamp serveur en secondes (float). Ne jamais faire confiance à
    l'heure envoyée par le client pour calculer un score de vitesse."""
    return time.time()


# ---------------------------------------------------------------------------
# Catalogue des jeux : chaque jeu déclare son mode.
#   - "turnBased"    : une seule équipe active à la fois, contrôlé serveur.
#   - "simultaneous" : toutes les équipes jouent en même temps, score basé
#                        sur la vitesse de réponse (timestamp serveur).
# ---------------------------------------------------------------------------
GAMES = [
    {'key': 'wordChain', 'label': 'Word Chain', 'mode': 'turnBased'},
    {'key': 'alphabetRace', 'label': 'Alphabet Race', 'mode': 'turnBased'},
    {'key': 'anagram', 'label': 'Anagram', 'mode': 'simultaneous'},
    {'key': 'spellingBee', 'label': 'Spelling Bee', 'mode': 'turnBased'},
    {'key': 'wordBuilder', 'label': 'Word Builder', 'mode': 'simultaneous'},
    {'key': 'wordFromWord', 'label': 'Word from Word', 'mode': 'simultaneous'},
    {'key': 'bigChallenge', 'label': 'The Big Challenge', 'mode': 'turnBased'},
    {'key': 'mysteryObject', 'label': 'Mystery Object', 'mode': 'turnBased'},
    {'key': 'pronunciation', 'label': 'Pronunciation Drill', 'mode': 'turnBased'},
    {'key': 'grammar', 'label': 'Grammar Duel', 'mode': 'turnBased'},
    {'key': 'irregular', 'label': 'Irregular Verbs', 'mode': 'turnBased'},
    {'key': 'phrasal', 'label': 'Phrasal Verbs', 'mode': 'turnBased'},
    {'key': 'wheel', 'label': 'Spin the Wheel', 'mode': 'turnBased'},
    {'key': 'charades', 'label': 'Charades', 'mode': 'turnBased'},
    {'key': 'description', 'label': 'Description Challenge', 'mode': 'turnBased'},
    {'key': 'tvVocab', 'label': 'TV Vocab', 'mode': 'turnBased'},
]
GAMES_BY_KEY = {g['key']: g for g in GAMES}

MIN_TEAMS = 2
MAX_TEAMS = 6

SCORE_BASE = 100
SCORE_MIN = 10
SCORE_DECAY_PER_SECOND = 4


# ---------------------------------------------------------------------------
# Persistance disque
# ---------------------------------------------------------------------------
def load_state_from_disk():
    if not DATA_FILE.exists():
        return {'rooms': {}, 'lessons': {}, 'teaching_rooms': {}}
    try:
        with DATA_FILE.open('r', encoding='utf-8') as f:
            data = json.load(f) if isinstance(f, object) else {}
            if not isinstance(data, dict):
                return {'rooms': {}, 'lessons': {}, 'teaching_rooms': {}}
            return {
                'rooms': data.get('rooms', {}) or {},
                'lessons': data.get('lessons', {}) or {},
                'teaching_rooms': data.get('teaching_rooms', {}) or {}
            }
    except Exception:
        return {'rooms': {}, 'lessons': {}, 'teaching_rooms': {}}


def persist_state_to_disk():
    """Persist rooms, lessons and teaching evaluations."""
    try:
        state = {'rooms': ROOMS, 'lessons': LESSONS, 'teaching_rooms': TEACHING_ROOMS}
        with DATA_FILE.open('w', encoding='utf-8') as f:
            json.dump(state, f, indent=2, ensure_ascii=False)
    except Exception as e:
        app.logger.warning('Persist failed: %s', e)


_state = load_state_from_disk()
ROOMS = _state.get('rooms', {})
LESSONS = _state.get('lessons', {})
TEACHING_ROOMS = _state.get('teaching_rooms', {})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def make_room_code():
    chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    code = ''.join(random.choice(chars) for _ in range(5))
    while code in ROOMS:
        code = ''.join(random.choice(chars) for _ in range(5))
    return code


def make_player_id():
    chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    return ''.join(random.choice(chars) for _ in range(10))


def filter_allowed_games(requested):
    if not isinstance(requested, list) or not requested:
        return ['wordChain', 'alphabetRace', 'anagram', 'spellingBee', 'wordBuilder', 'wordFromWord']
    result = []
    for key in requested:
        if key in GAMES_BY_KEY and key not in result:
            result.append(key)
    return result or ['wordChain', 'alphabetRace', 'anagram']


def public_room_view(room):
    """Vue de la salle envoyée aux clients sans les secrets de la solution."""
    copy = dict(room)
    if 'gameInstance' in copy and isinstance(copy['gameInstance'], dict):
        gi = dict(copy['gameInstance'])
        gi.pop('_solution', None)
        # Do not leak French translations or hints in multiplayer public view
        # keep fr for irregular/phrasal
        gi.pop('frHint', None)
        # For phrasal/irregular/mystery games ensure no french meaning exposed
        if gi.get('type') == 'mysteryObject':
            gi.pop('fr', None)
        copy['gameInstance'] = gi
    # include lightweight player scores for client-side UI
    copy['playerScores'] = [
        {
            'id': p.get('id'),
            'name': p.get('name'),
            'team': p.get('team'),
            'score': p.get('score', 0),
            'correctCount': p.get('correctCount', 0)
        }
        for p in copy.get('players', [])
    ]
    return copy


def broadcast_room_update(code):
    room = ROOMS.get(code)
    if room:
        # also emit score snapshot for quicker UI updates
        payload = public_room_view(room)
        payload['teamScores'] = dict(room.get('teamScores', {}))
        payload['playerScores'] = [
            {
                'id': p.get('id'),
                'name': p.get('name'),
                'team': p.get('team'),
                'score': p.get('score', 0),
                'correctCount': p.get('correctCount', 0)
            }
            for p in room.get('players', [])
        ]
        socketio.emit('room_update', payload, room=code)


def find_player(room, player_id):
    return next((p for p in room.get('players', []) if p.get('id') == player_id), None)


def is_host(room, player_id):
    return bool(player_id) and player_id == room.get('hostId')


# ---------------------------------------------------------------------------
# Helpers de construction des payloads de jeu
# ---------------------------------------------------------------------------

def build_phrasal_payload(pv, all_verbs, lang='fr'):
    """Construit le payload MCQ pour un phrasal verb.
    pv      = dict avec cles 'verb', 'meaning', 'fr'
    all_verbs = liste complete pour piocher des distracteurs
    lang    = 'fr' => reponses en francais | autre => anglais
    """
    answer_field = 'fr' if lang == 'fr' else 'meaning'
    correct = str(pv.get(answer_field) or pv.get('meaning') or pv.get('fr') or 'to give up').strip()

    distractors = []
    for v in (all_verbs or []):
        if not v or v.get('verb') == pv.get('verb'):
            continue
        val = str(v.get(answer_field) or '').strip()
        if val and val != correct and val not in distractors:
            distractors.append(val)
    random.shuffle(distractors)

    options = [correct] + distractors[:4]

    if len(options) < 5:
        for v in (all_verbs or []):
            if not v:
                continue
            for field in ('meaning', 'fr'):
                val = str(v.get(field) or '').strip()
                if val and val not in options:
                    options.append(val)
                    if len(options) >= 5:
                        break
            if len(options) >= 5:
                break

    while len(options) < 5:
        options.append(correct)

    random.shuffle(options)

    return {
        'verb': pv.get('verb', 'give up'),
        'fr': pv.get('fr', ''),
        'meaning': pv.get('meaning', ''),
        'options': options,
        '_solution': correct,
        'lang': lang,
    }


def build_irregular_payload(v, all_verbs):
    """Construit le payload MCQ pour un verbe irregulier.
    v         = dict avec cles 'verb', 'past', 'participle', 'fr'
    all_verbs = liste complete pour piocher des distracteurs
    """
    target_form, answer_field = random.choice([
        ('Past Simple', 'past'),
        ('Past Participle', 'participle'),
    ])
    correct = str(v.get(answer_field) or v.get('past') or 'went').strip()

    distractors = []
    for other in (all_verbs or []):
        if not other or other.get('verb') == v.get('verb'):
            continue
        val = str(other.get(answer_field) or '').strip()
        if val and val.lower() != correct.lower() and val not in distractors:
            distractors.append(val)
    random.shuffle(distractors)

    options = [correct] + distractors[:4]

    if len(options) < 5:
        for other in (all_verbs or []):
            if not other:
                continue
            for field in ('past', 'participle'):
                val = str(other.get(field) or '').strip()
                if val and val not in options:
                    options.append(val)
                    if len(options) >= 5:
                        break
            if len(options) >= 5:
                break

    while len(options) < 5:
        options.append(correct)

    random.shuffle(options)

    return {
        'verb': v.get('verb', 'go'),
        'fr': v.get('fr', ''),
        'past': v.get('past', ''),
        'participle': v.get('participle', ''),
        'targetForm': target_form,
        'options': options,
        '_solution': correct,
    }


# ---------------------------------------------------------------------------
# Routes HTTP (statique + API)
# ---------------------------------------------------------------------------


@app.route('/')
def index():
    return send_from_directory(str(BASE_DIR), 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(str(BASE_DIR), filename)


@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({'ok': True, 'message': 'qserver is running'})


@app.route('/api/games', methods=['GET'])
def get_games():
    return jsonify({'games': [{'key': g['key'], 'label': g['label'], 'mode': g['mode']} for g in GAMES]})


@app.route('/api/rooms/<code>', methods=['GET'])
def get_room_http(code):
    with ROOMS_LOCK:
        room = ROOMS.get(code.upper())
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        return jsonify(public_room_view(room))


# In-memory word validation cache
_WORD_CACHE: dict = {}

@app.route('/api/validate-word', methods=['POST', 'GET'])
def validate_word_api():
    """Vérifie si un mot donné est un mot anglais valide dans vocabulaire_anglais.db."""
    if request.method == 'GET':
        word = request.args.get('word', '')
    else:
        payload = {}
        try:
            payload = request.get_json(force=True, silent=True) or {}
        except Exception:
            pass
        word = payload.get('word', request.args.get('word', ''))

    if not word:
        return jsonify({'valid': False, 'reason': 'No word provided'}), 400

    clean_word = str(word).strip().lower()
    if not clean_word or not clean_word.isalpha():
        return jsonify({'valid': False, 'reason': 'Invalid format'}), 200

    valid = dictionary.validate_word(clean_word)
    return jsonify({'valid': valid, 'word': clean_word}), 200


# ---------------------------------------------------------------------------
# Socket.IO events
# ---------------------------------------------------------------------------
@socketio.on('connect')
def on_connect():
    emit('connected', {'ok': True})


@socketio.on('disconnect')
def on_disconnect():
    from flask import request as flask_request
    sid = flask_request.sid
    info = SID_TO_PLAYER.pop(sid, None)
    if not info:
        return
    code, player_id = info['code'], info['playerId']
    left_player_name = ''
    left_team = ''

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            return
        player = find_player(room, player_id)
        if player:
            player['connected'] = False
            left_player_name = player.get('name', 'Player')
            left_team = player.get('team', '')
            room['updatedAt'] = now_iso()
            persist_state_to_disk()

    if left_player_name:
        socketio.emit('player_left', {'playerName': left_player_name, 'team': left_team}, room=code)
    broadcast_room_update(code)


@socketio.on('create_room')
def on_create_room(payload):
    payload = payload or {}
    host_name = str(payload.get('hostName') or 'Host').strip() or 'Host'
    team_count = int(payload.get('teamCount', 2) or 2)
    team_count = max(MIN_TEAMS, min(team_count, MAX_TEAMS))

    team_names = payload.get('teamNames') or []
    if not isinstance(team_names, list):
        team_names = []
    team_names = [str(n).strip() or f'Team {idx + 1}' for idx, n in enumerate(team_names[:team_count])]
    while len(team_names) < team_count:
        team_names.append(f'Team {len(team_names) + 1}')

    allowed_games = filter_allowed_games(payload.get('allowedGames'))

    with ROOMS_LOCK:
        code = make_room_code()
        player_id = make_player_id()
        room = {
            'code': code,
            'createdAt': now_iso(),
            'updatedAt': now_iso(),
            'hostName': host_name,
            'hostId': player_id,
            'teamCount': team_count,
            'teams': [{'name': name, 'captainId': None} for name in team_names],
            'allowedGames': allowed_games,
            'players': [],
            'status': 'lobby',
            'currentGame': None,
            'gameMode': None,
            'activeTeam': None,
            'roundStartedAt': None,
            'teamScores': {name: 0 for name in team_names},
            'hostSocketPlayerId': player_id,
        }
        ROOMS[code] = room
        persist_state_to_disk()

    sio_join_room(code)
    from flask import request as flask_request
    SID_TO_PLAYER[flask_request.sid] = {'code': code, 'playerId': player_id}
    emit('room_created', {'room': public_room_view(room), 'playerId': player_id, 'isHost': True})


@socketio.on('join_room')
def on_join_room(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    name = str(payload.get('name') or 'Guest').strip() or 'Guest'
    requested_team = payload.get('team')

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            emit('error_message', {'error': 'Salle introuvable. Vérifie le code.'})
            return
        if room.get('status') == 'playing':
            emit('error_message', {'error': 'La partie a déjà commencé.'})
            return

        team_names = [t['name'] for t in room.get('teams', [])]
        if requested_team not in team_names:
            requested_team = team_names[0] if team_names else 'Team 1'

        if any(p.get('name', '').lower() == name.lower() and p.get('connected') for p in room.get('players', [])):
            emit('error_message', {'error': 'Ce nom est déjà pris dans cette salle.'})
            return

        player_id = make_player_id()
        is_first_in_team = not any(p.get('team') == requested_team for p in room.get('players', []))
        player = {
            'id': player_id,
            'name': name,
            'team': requested_team,
            'isCaptain': is_first_in_team,
            'connected': True,
            'score': 0,
            'correctCount': 0,
            'joinedAt': now_iso(),
        }
        room['players'].append(player)
        if is_first_in_team:
            for t in room['teams']:
                if t['name'] == requested_team:
                    t['captainId'] = player_id
        room['updatedAt'] = now_iso()
        persist_state_to_disk()

    sio_join_room(code)
    from flask import request as flask_request
    SID_TO_PLAYER[flask_request.sid] = {'code': code, 'playerId': player_id}
    emit('room_joined', {'room': public_room_view(room), 'playerId': player_id, 'isHost': False})
    broadcast_room_update(code)


@socketio.on('leave_room')
def on_leave_room(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')
    left_name = ''
    left_team = ''

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            return

        is_host_leaving = is_host(room, player_id)
        player = find_player(room, player_id)
        if player:
            left_name = player.get('name', 'Player')
            left_team = player.get('team', '')
            room['players'] = [p for p in room['players'] if p['id'] != player_id]

        if is_host_leaving:
            # Transférer l'hôte au premier joueur connecté ou mettre fin à la salle
            connected = [p for p in room['players'] if p.get('connected')]
            if connected:
                room['hostId'] = connected[0]['id']
                room['hostName'] = connected[0]['name']
            else:
                room['status'] = 'lobby'

        room['updatedAt'] = now_iso()
        persist_state_to_disk()

    from flask import request as flask_request
    sio_leave_room(code)
    SID_TO_PLAYER.pop(flask_request.sid, None)

    if left_name:
        socketio.emit('player_left', {'playerName': left_name, 'team': left_team}, room=code)
    broadcast_room_update(code)


@socketio.on('update_player')
def on_update_player(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            emit('error_message', {'error': 'Salle introuvable.'})
            return
        player = find_player(room, player_id)
        if not player:
            emit('error_message', {'error': 'Joueur introuvable.'})
            return

        if 'name' in payload and str(payload['name']).strip():
            player['name'] = str(payload['name']).strip()

        if 'team' in payload and str(payload['team']).strip():
            team_names = [t['name'] for t in room.get('teams', [])]
            if payload['team'] in team_names:
                player['team'] = payload['team']

        if 'teamName' in payload and player.get('isCaptain'):
            new_name = str(payload['teamName']).strip()
            old_name = player['team']
            if new_name and new_name != old_name:
                for t in room['teams']:
                    if t['name'] == old_name:
                        t['name'] = new_name
                for p in room['players']:
                    if p.get('team') == old_name:
                        p['team'] = new_name
                if old_name in room['teamScores']:
                    room['teamScores'][new_name] = room['teamScores'].pop(old_name)
                if room.get('activeTeam') == old_name:
                    room['activeTeam'] = new_name

        room['updatedAt'] = now_iso()
        persist_state_to_disk()

    broadcast_room_update(code)


@socketio.on('select_game')
def on_select_game(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')
    game_key = payload.get('game')
    opts = payload.get('opts') or {}

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            emit('error_message', {'error': 'Salle introuvable.'})
            return
        if not is_host(room, player_id):
            emit('error_message', {'error': "Seul l'hôte peut choisir le jeu."})
            return
        if game_key not in room.get('allowedGames', []):
            emit('error_message', {'error': "Ce jeu n'est pas activé pour cette salle."})
            return

        room['currentGame'] = game_key
        room['gameMode'] = GAMES_BY_KEY[game_key]['mode']
        room['gameOpts'] = opts
        room['status'] = 'lobby'
        room['activeTeam'] = None
        room['roundStartedAt'] = None
        room['updatedAt'] = now_iso()
        persist_state_to_disk()

    broadcast_room_update(code)


def build_phrasal_payload(pv, verbs, lang='fr'):
    """Génère l'instance de question Phrasal Verbs avec distracteurs garantis et support bilingue."""
    field = 'fr' if str(lang).lower() == 'fr' else 'meaning'
    correct = pv.get(field) or pv.get('meaning') or pv.get('fr') or ''
    distractors = []
    for v in (verbs or []):
        val = v.get(field)
        if val and val != correct and val not in distractors:
            distractors.append(val)
    random.shuffle(distractors)
    options = [correct] + distractors[:3]
    if len(options) < 4:
        for v in (verbs or []):
            for f in ('meaning', 'fr'):
                val = v.get(f)
                if val and val not in options:
                    options.append(val)
                    if len(options) >= 4:
                        break
    random.shuffle(options)
    return {
        'verb': pv.get('verb', ''),
        'options': options,
        '_solution': correct,
        'fr': pv.get('fr', ''),
        'meaning': pv.get('meaning', ''),
        'lang': lang
    }


def build_irregular_payload(v, verbs):
    """Génère l'instance Irregular Verbs avec choix Past Simple / Participle et options QCM."""
    target_form = random.choice(['Past Simple', 'Past Participle'])
    solution = v.get('past', '') if target_form == 'Past Simple' else v.get('participle', '')
    field = 'past' if target_form == 'Past Simple' else 'participle'
    distractors = []
    for other in (verbs or []):
        val = other.get(field)
        if val and val != solution and val not in distractors:
            distractors.append(val)
    random.shuffle(distractors)
    options = [solution] + distractors[:3]
    random.shuffle(options)
    return {
        'verb': v.get('verb', ''),
        'options': options,
        '_solution': solution,
        'past': v.get('past', ''),
        'participle': v.get('participle', ''),
        'fr': v.get('fr', ''),
        'meaning': v.get('meaning', ''),
        'targetForm': target_form
    }


def is_irregular_answer_valid(word_input, solution, game_inst=None):
    """Vérification souple des verbes irréguliers (gère les variantes was/were, burnt/burned)."""
    if not word_input:
        return False
    import re
    clean = str(word_input).strip().lower()
    sol = str(solution or '').strip().lower()
    if clean == sol:
        return True
    variants = [x.strip() for x in re.split(r'[/,]', sol) if x.strip()]
    if clean in variants:
        return True
    if game_inst:
        for f in ('past', 'participle', '_solution'):
            val = str(game_inst.get(f, '')).lower()
            if clean == val or clean in [x.strip() for x in re.split(r'[/,]', val) if x.strip()]:
                return True
    return False


@socketio.on('start_game')
def on_start_game(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')
    opts = payload.get('opts') or {}

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            emit('error_message', {'error': 'Salle introuvable.'})
            return
        if not is_host(room, player_id):
            emit('error_message', {'error': "Seul l'hôte peut démarrer la partie."})
            return
        if not room.get('currentGame'):
            emit('error_message', {'error': 'Aucun jeu sélectionné.'})
            return

        game_key = room['currentGame']
        merged_opts = dict(room.get('gameOpts') or {})
        merged_opts.update(opts)
        room['status'] = 'playing'
        seed = random.randint(1, 2 ** 31 - 1)

        # Config par jeu
        game_instance = {
            'type': game_key,
            'seed': seed,
            'startedAt': now_iso(),
            'opts': merged_opts,
            'alphabet': list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        }

        if game_key == 'anagram':
            pool = dictionary.get_anagram_words()
            sol = random.choice(pool) if pool else "SCHOOL"
            scrambled = list(sol)
            random.shuffle(scrambled)
            game_instance['_solution'] = sol
            game_instance['scrambled'] = "".join(scrambled)
            game_instance['roundSec'] = int(merged_opts.get('roundSec') or 60)

        elif game_key == 'spellingBee':
            words = dictionary.get_pedagogical_words(min_len=4, count=10)
            sol = random.choice(words) if words else "STUDENT"
            game_instance['_solution'] = sol
            game_instance['word'] = sol
            game_instance['frHint'] = "Spell out loud or type the English word."
            game_instance['wordsPerTurn'] = int(merged_opts.get('wordsPerTurn') or 5)
            game_instance['wordSec'] = int(merged_opts.get('wordSec') or 20)

        elif game_key == 'wordChain':
            pool = dictionary.get_pedagogical_words(min_len=4, count=10)
            start_w = random.choice(pool) if pool else "APPLE"
            game_instance['startWord'] = start_w
            game_instance['activeLetter'] = start_w[-1].upper()
            game_instance['turnSec'] = int(merged_opts.get('turnSec') or 60)

        elif game_key == 'wordBuilder':
            pool = dictionary.get_pedagogical_words(min_len=4, count=10)
            target = random.choice(pool) if pool else "LANGUAGE"
            letters = list(target.upper()) + ["E", "A", "R", "S", "T"]
            # keep duplicates (e.g., two A's) and shuffle for randomness
            random.shuffle(letters)
            game_instance['lettersArr'] = letters
            game_instance['letters'] = " ".join(letters)
            game_instance['poolSize'] = int(merged_opts.get('poolSize') or 22)
            game_instance['roundSec'] = int(merged_opts.get('roundSec') or 120)

        elif game_key == 'wordFromWord':
            pool = dictionary.get_pedagogical_words(min_len=6, count=10)
            base_w = random.choice(pool) if pool else "DICTIONARY"
            game_instance['baseWord'] = base_w
            game_instance['minLength'] = int(merged_opts.get('minLength') or 3)
            game_instance['roundSec'] = int(merged_opts.get('roundSec') or 90)

        elif game_key == 'alphabetRace':
            game_instance['roundSec'] = int(merged_opts.get('roundSec') or 90)
            game_instance['minLength'] = int(merged_opts.get('minLength') or 3)
            # initialize progression state for multiplayer parity with group mode
            game_instance['currentIndex'] = 0
            game_instance['alphabet'] = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
            game_instance['activeLetter'] = game_instance['alphabet'][0]
            game_instance['usedWords'] = []
            game_instance['roundStartedAt'] = now_ts()
            # per-team turn duration (multiplayer): default equals roundSec unless overridden
            game_instance['turnSec'] = int(merged_opts.get('turnSec') or game_instance['roundSec'])

        elif game_key == 'mysteryObject':
            objs = dictionary.get_mystery_objects()
            obj = random.choice(objs)
            game_instance['word'] = obj['word']
            game_instance['_solution'] = obj['word']
            game_instance['emoji'] = obj['emoji']
            game_instance['clue'] = obj['clue']
            game_instance['fr'] = obj['fr']
            game_instance['roundSec'] = int(merged_opts.get('roundSec') or 60)

        elif game_key == 'grammar':
            questions = dictionary.get_grammar_questions()
            q = random.choice(questions)
            game_instance['sentence'] = q['sentence']
            game_instance['options'] = q['options']
            game_instance['_solution'] = q['answer']
            game_instance['cat'] = q['cat']

        elif game_key == 'irregular':
            verbs = dictionary.get_irregular_verbs()
            v = random.choice(verbs) if verbs else {'verb': 'Go', 'past': 'went', 'participle': 'gone', 'fr': 'Aller'}
            irr = build_irregular_payload(v, verbs)
            game_instance.update(irr)
            game_instance['usedWords'] = []
            game_instance['seenWords'] = [str(irr.get('verb', '')).lower()]
            game_instance['turnSec'] = int(merged_opts.get('turnSec') or 15)
            pass
            pass
            pass
            pass

        elif game_key == 'phrasal':
            verbs = dictionary.get_phrasal_verbs()
            # allow host to choose language for meanings (fr / en)
            lang = str(merged_opts.get('lang') or '').lower()
            pv = random.choice(verbs) if verbs else {'verb': 'give up', 'meaning': 'Stop trying or quit', 'fr': 'Abandonner'}
            ph_data = build_phrasal_payload(pv, verbs, lang=lang)
            game_instance.update(ph_data)
            game_instance['usedWords'] = []
            game_instance['seenWords'] = [str(ph_data.get('verb', '')).lower()]
            game_instance['turnSec'] = int(merged_opts.get('turnSec') or 15)


        elif game_key == 'pronunciation':
            words = dictionary.get_pedagogical_words(min_len=5, count=10)
            sol = random.choice(words) if words else "PRONUNCIATION"
            game_instance['word'] = sol
            game_instance['_solution'] = sol

        elif game_key == 'wheel':
            challenges = [
                "Describe your favorite animal in 3 English sentences!",
                "Spell your team name backwards out loud!",
                "Name 5 fruits in English in 15 seconds!",
                "Say a tongue twister: Red lorry, yellow lorry."
            ]
            game_instance['challenge'] = random.choice(challenges)

        elif game_key == 'charades':
            items = ["Playing guitar 🎸", "Riding a bicycle 🚲", "Cooking dinner 🍳", "Reading a book 📖", "Driving a car 🚗"]
            game_instance['item'] = random.choice(items)

        elif game_key == 'bigChallenge':
            questions = dictionary.get_big_challenge_questions()
            q = random.choice(questions)
            game_instance['question'] = q['question']
            game_instance['options'] = q['options']
            game_instance['_solution'] = q['answer']
            game_instance['topic'] = q.get('topic', 'General English Knowledge')
            game_instance['seenWords'] = [q['answer'].lower()]

        elif game_key == 'description':
            questions = dictionary.get_description_questions()
            q = random.choice(questions)
            game_instance['description'] = q['description']
            game_instance['options'] = q['options']
            game_instance['_solution'] = q['answer']
            game_instance['topic'] = q.get('topic', 'General')
            game_instance['emoji'] = q.get('emoji', '💡')
            game_instance['difficulty'] = q.get('difficulty', 'medium')
            game_instance['seenWords'] = [q['answer'].lower()]

        elif game_key == 'tvVocab':
            # TV-style vocabulary: prompt with multiple possible answers
            qset = dictionary.get_tv_vocab_questions()
            q = random.choice(qset) if qset else {'prompt': 'Name 5 things in a kitchen.', 'answers': ['FORK','KNIFE','PLATE','SPOON','REFRIGERATOR']}
            answers = [a.upper() for a in q.get('answers', [])]
            random.shuffle(answers)
            # masked: list of booleans for whether each answer has been revealed
            game_instance['prompt'] = q.get('prompt')
            game_instance['_solution'] = answers  # canonical answers (upper)
            game_instance['answers'] = answers
            game_instance['masked'] = [False] * len(answers)
            game_instance['roundPoints'] = 0
            # faults per team during this round
            game_instance['faults'] = {t['name']: 0 for t in room.get('teams', [])}
            game_instance['faultLimit'] = int(merged_opts.get('faultLimit') or 3)
            game_instance['pointsPerAnswer'] = int(merged_opts.get('pointsPerAnswer') or 100)
            game_instance['finalStealAllowed'] = False
            game_instance['seenWords'] = [q.get('prompt','').lower()]

        # initialize game instance and reset per-round tracking fields
        room['gameInstance'] = game_instance
        # ensure usedWords starts empty for new game and seenWords exists
        gi = room.get('gameInstance', {})
        gi['usedWords'] = []
        if 'seenWords' not in gi:
            gi['seenWords'] = []

        if room['gameMode'] == 'turnBased':
            first_team = room['teams'][0]['name'] if room['teams'] else None
            room['activeTeam'] = first_team
            room['roundStartedAt'] = None
        else:  # simultaneous
            room['activeTeam'] = None
            room['roundStartedAt'] = now_ts()

        room['updatedAt'] = now_iso()
        persist_state_to_disk()
        pub_room = public_room_view(room)

        socketio.emit('game_started', pub_room, room=code)
        # Emit initial score snapshot so clients immediately display zeros / current scores
        team_scores = dict(room.get('teamScores', {}))
        player_scores = [
            {
                'id': p.get('id'),
                'name': p.get('name'),
                'team': p.get('team'),
                'score': p.get('score', 0),
                'correctCount': p.get('correctCount', 0)
            }
            for p in room.get('players', [])
        ]
        socketio.emit('score_update', {'teamScores': team_scores, 'playerScores': player_scores}, room=code)


def rotate_next_question(room, game_key, game_inst):
    """Génère la question/mot suivant pour game_key sans répéter les items récents."""
    already_seen = list(game_inst.get('seenWords', []))

    if game_key == 'grammar':
        questions = dictionary.get_grammar_questions()
        remaining = [q for q in questions if q['answer'].lower() not in already_seen and q.get('sentence','').lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = questions
        q = random.choice(remaining) if remaining else questions[0]
        already_seen.append(q['answer'].lower())
        already_seen.append(q.get('sentence','').lower())
        game_inst.update({
            'sentence': q['sentence'],
            'options': q['options'],
            '_solution': q['answer'],
            'cat': q.get('cat', 'Grammar'),
            'usedWords': [],
            'seenWords': already_seen
        })
    elif game_key == 'irregular':
        verbs = dictionary.get_irregular_verbs()
        remaining = [v for v in verbs if v.get('verb', '').lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = verbs
        v = random.choice(remaining) if remaining else verbs[0]
        already_seen.append(v.get('verb', '').lower())
        irr = build_irregular_payload(v, verbs)
        game_inst.update({
            **irr,
            'usedWords': [],
            'seenWords': already_seen
        })
    elif game_key == 'mysteryObject':
        objs = dictionary.get_mystery_objects()
        remaining = [o for o in objs if o['word'].lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = objs
        obj = random.choice(remaining) if remaining else objs[0]
        already_seen.append(obj['word'].lower())
        game_inst.update({
            'word': obj['word'],
            '_solution': obj['word'],
            'emoji': obj.get('emoji', '🔍'),
            'clue': obj.get('clue', ''),
            'fr': obj.get('fr', ''),
            'usedWords': [],
            'seenWords': already_seen
        })
    elif game_key == 'bigChallenge':
        questions = dictionary.get_big_challenge_questions()
        remaining = [q for q in questions if q['answer'].lower() not in already_seen and q.get('question','').lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = questions
        q = random.choice(remaining) if remaining else questions[0]
        already_seen.append(q['answer'].lower())
        already_seen.append(q.get('question','').lower())
        game_inst.update({
            'question': q['question'],
            'options': q['options'],
            '_solution': q['answer'],
            'topic': q.get('topic', 'General English Knowledge'),
            'usedWords': [],
            'seenWords': already_seen
        })
    elif game_key == 'tvVocab':
        qset = dictionary.get_tv_vocab_questions()
        remaining = [q for q in qset if q.get('prompt','').lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = qset
        q = random.choice(remaining) if remaining else qset[0]
        answers = [a.upper() for a in q.get('answers', [])]
        random.shuffle(answers)
        already_seen.append(q.get('prompt','').lower())
        game_inst.update({
            'prompt': q.get('prompt'),
            '_solution': answers,
            'answers': answers,
            'masked': [False] * len(answers),
            'roundPoints': 0,
            'faults': {t['name']: 0 for t in room.get('teams', [])},
            'finalStealAllowed': False,
            'usedWords': [],
            'seenWords': already_seen
        })
    elif game_key == 'pronunciation':
        words = dictionary.get_pedagogical_words(min_len=5, count=20)
        remaining = [w for w in words if w.lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = words
        sol = random.choice(remaining) if remaining else words[0]
        already_seen.append(sol.lower())
        game_inst.update({
            'word': sol,
            '_solution': sol,
            'usedWords': [],
            'seenWords': already_seen
        })
    elif game_key == 'wheel':
        challenges = [
            "Describe your favorite animal in 3 English sentences!",
            "Spell your team name backwards out loud!",
            "Name 5 fruits in English in 15 seconds!",
            "Say a tongue twister: Red lorry, yellow lorry.",
            "Tell a short joke in English!",
            "Sing a line from an English song!"
        ]
        remaining = [c for c in challenges if c.lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = challenges
        ch = random.choice(remaining)
        already_seen.append(ch.lower())
        game_inst.update({
            'challenge': ch,
            'usedWords': [],
            'seenWords': already_seen
        })
    elif game_key == 'charades':
        items = ["Playing guitar 🎸", "Riding a bicycle 🚲", "Cooking dinner 🍳", "Reading a book 📖", "Driving a car 🚗", "Playing basketball 🏀", "Flying an airplane ✈️"]
        remaining = [i for i in items if i.lower() not in already_seen]
        if not remaining:
            already_seen = []
            remaining = items
        it = random.choice(remaining)
        already_seen.append(it.lower())
        game_inst.update({
            'item': it,
            'usedWords': [],
            'seenWords': already_seen
        })

    room['gameInstance'] = game_inst
    room['roundStartedAt'] = now_ts()
    gi_pub = dict(game_inst)
    gi_pub.pop('_solution', None)
    return gi_pub


@socketio.on('submit_answer')
def on_submit_answer(payload):
    """Un joueur soumet un mot.
    - Valide via SQLite / dictionary.py
    - Rejette les mots déjà soumis (usedWords)
    - Génère un nouveau mot / une nouvelle question après chaque bonne réponse.
    """
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')
    word_input = str(payload.get('word') or '').strip().lower()

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room or room.get('status') != 'playing':
            emit('error_message', {'error': 'Aucune partie en cours.'})
            return
        player = find_player(room, player_id)
        if not player:
            emit('error_message', {'error': 'Joueur introuvable.'})
            return
        team = player.get('team')

        game_key = room.get('currentGame')
        game_mode = room.get('gameMode', 'simultaneous')
        game_inst = room.get('gameInstance') or {}
        solution = (game_inst.get('_solution') or '').lower()

        # --- Vérification du tour (turnBased) ---
        if game_mode == 'turnBased' and team != room.get('activeTeam'):
            emit('error_message', {'error': "Ce n'est pas le tour de ton équipe."})
            return

        if not word_input:
            emit('error_message', {'error': 'Mot vide.'})
            return

        # --- Vérification des doublons (usedWords) ---
        used_words = game_inst.setdefault('usedWords', [])
        if word_input in used_words:
            emit('error_message', {'error': f'"{word_input}" a déjà été soumis dans ce round!'})
            return

        # --- Validation du mot ---
        if game_key == 'anagram':
            is_correct = (word_input == solution)
        elif game_key == 'tvVocab':
            # tvVocab: match against any unrevealed canonical answer
            canon = [s.lower() for s in game_inst.get('_solution', [])]
            matched_index = None
            for idx, ans in enumerate(canon):
                if ans == word_input and not game_inst.get('masked', [False]*len(canon))[idx]:
                    matched_index = idx
                    break
            is_correct = matched_index is not None
        elif game_key in ('grammar', 'phrasal', 'bigChallenge', 'irregular', 'description'):
            # Jeux à choix multiples / questions fixes : comparaison directe avec la solution
            is_correct = (word_input.lower() == solution.lower())
        else:
            # Tous les autres jeux : mot anglais valide
            is_correct = dictionary.validate_word(word_input)

        # --- Calcul des points ---
        revealed_penalty = 20 if (payload.get('revealed') and game_key == 'description') else 0
        if game_mode == 'turnBased':
            base_pts = 50 if game_key == 'description' else (len(word_input) * 5 + 10)
            points = max(10, base_pts - revealed_penalty) if is_correct else 0
        else:  # simultaneous
            elapsed = max(0.0, now_ts() - (room.get('roundStartedAt') or now_ts()))
            points = max(SCORE_MIN, int(SCORE_BASE - elapsed * SCORE_DECAY_PER_SECOND - revealed_penalty)) if is_correct else 0

        if is_correct or game_mode == 'simultaneous':
            used_words.append(word_input)

        player['score'] = player.get('score', 0) + points
        if is_correct:
            player['correctCount'] = player.get('correctCount', 0) + 1

        room['teamScores'][team] = room['teamScores'].get(team, 0) + points
        result = {
            'team': team,
            'word': word_input,
            'points': points,
            'correct': is_correct,
            'playerName': player.get('name', 'Player'),
        }

        # --- Rotation dynamique des questions et mots ---
        new_game_instance_pub = None
        extra_events = []
        end_game_payload = None

        if game_key == 'tvVocab':
            canon = [s.upper() for s in game_inst.get('_solution', [])]
            masked = game_inst.get('masked', [False]*len(canon))
            if is_correct:
                for idx, a in enumerate(canon):
                    if a.lower() == word_input:
                        masked[idx] = True
                        game_inst['masked'] = masked
                        pts = game_inst.get('pointsPerAnswer', 100)
                        game_inst['roundPoints'] = game_inst.get('roundPoints', 0) + pts
                        extra_events.append({'type': 'reveal', 'index': idx, 'answer': a})
                        break
                # Si tous les mots sont révélés -> tirer un nouveau prompt TV Vocab !
                if all(masked):
                    new_game_instance_pub = rotate_next_question(room, 'tvVocab', game_inst)
            else:
                faults = game_inst.setdefault('faults', {})
                faults[team] = faults.get(team, 0) + 1
                if faults[team] >= game_inst.get('faultLimit', 3):
                    game_inst['finalStealAllowed'] = True
                    tnames = [t['name'] for t in room.get('teams', [])]
                    if room.get('activeTeam') in tnames:
                        i = tnames.index(room['activeTeam'])
                        room['activeTeam'] = tnames[(i + 1) % len(tnames)]
                    gi_pub = dict(game_inst)
                    gi_pub.pop('_solution', None)
                    new_game_instance_pub = gi_pub
        elif is_correct and game_key in ('grammar', 'irregular', 'mysteryObject', 'bigChallenge', 'phrasal', 'anagram', 'description', 'spellingBee'):
            new_game_instance_pub = rotate_next_question(room, game_key, game_inst)
            already_seen = list(game_inst.get('seenWords', []))
            if game_key == 'anagram':
                pool = dictionary.get_anagram_words()
                remaining = [w for w in pool if w.lower() not in already_seen]
                if not remaining:
                    already_seen = []
                    remaining = pool
                sol = random.choice(remaining) if remaining else 'SCHOOL'
                scrambled = list(sol.upper())
                random.shuffle(scrambled)
                already_seen.append(sol.lower())
                game_inst.update({
                    '_solution': sol.upper(),
                    'scrambled': ''.join(scrambled),
                    'usedWords': [],
                    'seenWords': already_seen,
                })
            elif game_key == 'description':
                questions = dictionary.get_description_questions()
                remaining = [q for q in questions if q['answer'].lower() not in already_seen]
                if not remaining:
                    already_seen = []
                    remaining = questions
                q = random.choice(remaining)
                already_seen.append(q['answer'].lower())
                game_inst.update({
                    'description': q['description'],
                    'options': q['options'],
                    '_solution': q['answer'],
                    'topic': q.get('topic', 'General'),
                    'emoji': q.get('emoji', '💡'),
                    'difficulty': q.get('difficulty', 'medium'),
                    'usedWords': [],
                    'seenWords': already_seen,
                })

            # reset usedWords for the new round and update timestamps
            room['gameInstance'] = game_inst
            room['roundStartedAt'] = now_ts()
            # Préparer la vue publique (sans _solution)
            gi_pub = dict(game_inst)
            gi_pub.pop('_solution', None)
            new_game_instance_pub = gi_pub

        # --- WordBuilder: when a correct word is found, generate a new target scramble
        if is_correct and game_key == 'wordBuilder':
            pool = dictionary.get_pedagogical_words(min_len=4, count=20)
            remaining = [w for w in pool if w.lower() not in (game_inst.get('seenWords') or [])]
            if not remaining:
                game_inst['seenWords'] = []
                remaining = pool
            target = random.choice(remaining) if remaining else (pool[0] if pool else 'LANGUAGE')
            letters = list(target.upper()) + ["E", "A", "R", "S", "T"]
            random.shuffle(letters)
            game_inst.update({
                'target': target.upper(),
                'lettersArr': letters,
                'letters': " ".join(letters),
                'usedWords': [],
                'seenWords': list(set((game_inst.get('seenWords') or []) + [target.lower()]))
            })
            room['gameInstance'] = game_inst
            room['roundStartedAt'] = now_ts()
            gi_pub = dict(game_inst)
            gi_pub.pop('_solution', None)
            new_game_instance_pub = gi_pub

        # --- SpellingBee (multiplayer): when correct, pick a new word for next turn
        if is_correct and game_key == 'spellingBee':
            words = dictionary.get_pedagogical_words(min_len=4, count=30)
            remaining = [w for w in words if w.lower() not in (game_inst.get('seenWords') or [])]
            if not remaining:
                game_inst['seenWords'] = []
                remaining = words
            sol = random.choice(remaining) if remaining else (words[0] if words else 'STUDENT')
            game_inst.update({
                '_solution': sol,
                'word': sol,
                'seenWords': list(set((game_inst.get('seenWords') or []) + [sol.lower()])),
                'usedWords': []
            })
            room['gameInstance'] = game_inst
            room['roundStartedAt'] = now_ts()
            gi_pub = dict(game_inst)
            gi_pub.pop('_solution', None)
            new_game_instance_pub = gi_pub

        # --- Anagram: already handled above when is_correct; ensure new_game_instance_pub was set

        # --- Phrasal: after a correct answer, advance to a new phrasal item and broadcast
        if is_correct and game_key == 'phrasal':
            # pick a new phrasal verb not recently used, rebuild proper MCQ options
            verbs = dictionary.get_phrasal_verbs()
            lang = str(game_inst.get('lang', 'fr'))
            already = set(str(s).lower() for s in game_inst.get('seenWords', []))
            remaining = [v for v in verbs if str(v.get('verb', '')).lower() not in already]
            if not remaining:
                already = set()
                remaining = verbs
            pv = random.choice(remaining) if remaining else (verbs[0] if verbs else None)
            if pv:
                ph_data = build_phrasal_payload(pv, verbs, lang=lang)
                already.add(str(pv.get('verb', '')).lower())
                ph_data['seenWords'] = list(already)
                ph_data['usedWords'] = []
                game_inst.update(ph_data)
                room['gameInstance'] = game_inst
                room['roundStartedAt'] = now_ts()
                gi_pub = dict(game_inst)
                gi_pub.pop('_solution', None)
                new_game_instance_pub = gi_pub

        # --- WordChain: turn passes to the other team on correct; a single wrong answer ends the game
        if game_key == 'wordChain':
            try:
                active = (game_inst.get('activeLetter') or game_inst.get('startLetter') or '').upper()
                if active and is_correct and word_input and word_input[0].upper() == active:
                    # valid continuation: mark used, advance activeLetter to last letter
                    game_inst.setdefault('usedWords', []).append(word_input)
                    last = word_input[-1].upper()
                    game_inst['activeLetter'] = last
                    game_inst['lastWord'] = word_input
                    room['gameInstance'] = game_inst
                    room['roundStartedAt'] = now_ts()
                    gi_pub = dict(game_inst)
                    gi_pub.pop('_solution', None)
                    new_game_instance_pub = gi_pub

                    # rotate activeTeam to the next team (other team must continue)
                    team_names = [t['name'] for t in room.get('teams', [])]
                    if room.get('activeTeam') in team_names:
                        i = team_names.index(room.get('activeTeam'))
                        room['activeTeam'] = team_names[(i + 1) % len(team_names)]
                    else:
                        room['activeTeam'] = team_names[0] if team_names else None
                else:
                    # incorrect -> end the game immediately
                    team_scores = dict(room.get('teamScores', {}))
                    team_rankings = sorted(
                        [{'name': t, 'score': s} for t, s in team_scores.items()],
                        key=lambda x: x['score'],
                        reverse=True
                    )
                    players_list = room.get('players', [])
                    player_rankings = sorted(
                        [
                            {
                                'id': p['id'],
                                'name': p['name'],
                                'team': p['team'],
                                'score': p.get('score', 0),
                                'correctCount': p.get('correctCount', 0)
                            }
                            for p in players_list
                        ],
                        key=lambda x: x['score'],
                        reverse=True
                    )
                    mvp = player_rankings[0] if player_rankings else None
                    # reset room state for lobby
                    room['status'] = 'lobby'
                    room['currentGame'] = None
                    room['gameMode'] = None
                    room['activeTeam'] = None
                    room['roundStartedAt'] = None
                    room.pop('gameInstance', None)
                    room['updatedAt'] = now_iso()
                    persist_state_to_disk()
                    end_game_payload = {
                        'teamRankings': team_rankings,
                        'playerRankings': player_rankings,
                        'mvp': mvp
                    }
            except Exception:
                pass

        # --- AlphabetRace: validate and advance currentIndex on correct submission
        if game_key == 'alphabetRace':
            # server already computed is_correct using dictionary.validate_word for generic games;
            # implement progression: if correct and word starts with activeLetter, advance index
            try:
                active = game_inst.get('activeLetter', None)
                if active and is_correct and word_input and word_input[0].upper() == active.upper():
                    # mark used and advance
                    game_inst.setdefault('usedWords', []).append(word_input)
                    # award points already applied above
                    idx = int(game_inst.get('currentIndex', 0)) + 1
                    game_inst['currentIndex'] = idx
                    if idx < len(game_inst.get('alphabet', [])):
                        game_inst['activeLetter'] = game_inst['alphabet'][idx]
                    else:
                        # finished alphabet: reset or end game
                        game_inst['activeLetter'] = None
                    room['gameInstance'] = game_inst
                    room['roundStartedAt'] = now_ts()
                    gi_pub = dict(game_inst)
                    gi_pub.pop('_solution', None)
                    new_game_instance_pub = gi_pub
            except Exception:
                pass

        # --- SpellingBee: when a team spells correctly, pick a new word and update instance
        if is_correct and game_key == 'spellingBee':
            try:
                words = dictionary.get_pedagogical_words(min_len=4, count=20)
                already = set(game_inst.get('seenWords', []))
                remaining = [w for w in words if str(w).lower() not in already]
                if not remaining:
                    already = set()
                    remaining = words
                sol = random.choice(remaining) if remaining else (words[0] if words else 'STUDENT')
                game_inst.update({'_solution': sol, 'word': sol})
                already.add(str(sol).lower())
                game_inst['seenWords'] = list(already)
                game_inst['usedWords'] = []
                room['gameInstance'] = game_inst
                room['roundStartedAt'] = now_ts()
                gi_pub = dict(game_inst)
                gi_pub.pop('_solution', None)
                new_game_instance_pub = gi_pub
            except Exception:
                pass

        # --- WordBuilder: validate letters usage and rotate a new target when found
        if is_correct and game_key == 'wordBuilder':
            try:
                # letters string like "A B C D E"
                letters = ''.join((game_inst.get('letters') or '').split()).upper()
                # check availability (multiset)
                from collections import Counter
                avail = Counter(letters)
                used = Counter(word_input.upper())
                ok = True
                for ch, cnt in used.items():
                    if avail.get(ch, 0) < cnt:
                        ok = False
                        break
                if ok:
                    # award already applied; generate a new target word to continue
                    pool = dictionary.get_pedagogical_words(min_len=4, count=10)
                    target = random.choice(pool) if pool else None
                    if target:
                        letters_arr = list(target.upper()) + list('EARST')
                        random.shuffle(letters_arr)
                        game_inst['letters'] = ' '.join(letters_arr)
                        game_inst['target'] = target
                        game_inst['usedWords'] = []
                        room['gameInstance'] = game_inst
                        room['roundStartedAt'] = now_ts()
                        gi_pub = dict(game_inst)
                        gi_pub.pop('_solution', None)
                        new_game_instance_pub = gi_pub
                else:
                    # not allowed by letters; treat as incorrect (no change)
                    pass
            except Exception:
                pass

        # --- WordChain: ensure submitted word starts with required letter and advance
        if is_correct and game_key == 'wordChain':
            try:
                active = (game_inst.get('activeLetter') or game_inst.get('startLetter') or '').upper()
                if active and word_input and word_input[0].upper() == active:
                    # mark used and advance activeLetter to last letter
                    game_inst.setdefault('usedWords', []).append(word_input)
                    last = word_input[-1].upper()
                    game_inst['activeLetter'] = last
                    game_inst['lastWord'] = word_input
                    room['gameInstance'] = game_inst
                    room['roundStartedAt'] = now_ts()
                    gi_pub = dict(game_inst)
                    gi_pub.pop('_solution', None)
                    new_game_instance_pub = gi_pub
                else:
                    # invalid starting letter: treat as incorrect
                    pass
            except Exception:
                pass

        room['updatedAt'] = now_iso()
        persist_state_to_disk()
        team_scores = dict(room['teamScores'])
        player_scores = [
            {
                'id': p['id'],
                'name': p['name'],
                'team': p['team'],
                'score': p.get('score', 0),
                'correctCount': p.get('correctCount', 0)
            }
            for p in room.get('players', [])
        ]

    socketio.emit('answer_result', result, room=code)
    socketio.emit('score_update', {'teamScores': team_scores, 'playerScores': player_scores}, room=code)

    # Diffuser le nouveau mot (anagramme uniquement)
    if new_game_instance_pub is not None:
        socketio.emit('new_word', {'gameInstance': new_game_instance_pub}, room=code)
    # Emit extra events for tvVocab (reveals/round state)
    if 'extra_events' in locals() and extra_events:
        for ev in extra_events:
            socketio.emit('tvvocab_event', ev, room=code)
        if new_game_instance_pub is not None:
            socketio.emit('tvvocab_update', {'gameInstance': new_game_instance_pub}, room=code)

    # For turn-based games like phrasal, advance activeTeam to mirror group mode behavior
    with ROOMS_LOCK:
        room2 = ROOMS.get(code)
        if room2 and room2.get('gameMode') == 'turnBased' and game_key == 'phrasal':
            team_names = [t['name'] for t in room2.get('teams', [])]
            if room2.get('activeTeam') in team_names:
                i = team_names.index(room2.get('activeTeam'))
                room2['activeTeam'] = team_names[(i + 1) % len(team_names)]
            else:
                room2['activeTeam'] = team_names[0] if team_names else None
            room2['updatedAt'] = now_iso()
            persist_state_to_disk()
            # broadcast a fresh room snapshot so clients update their active team and view
            broadcast_room_update(code)

    # If a WordChain wrong answer ended the game, emit game_over and stop further events
    if 'end_game_payload' in locals() and end_game_payload is not None:
        socketio.emit('game_over', end_game_payload, room=code)
        broadcast_room_update(code)
        return




@socketio.on('next_turn')
def on_next_turn(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            emit('error_message', {'error': 'Salle introuvable.'})
            return
        if not is_host(room, player_id):
            emit('error_message', {'error': "Seul l'hôte peut passer au tour suivant."})
            return
        if room.get('gameMode') != 'turnBased':
            emit('error_message', {'error': "Ce jeu n'est pas en mode tour par tour."})
            return

        team_names = [t['name'] for t in room.get('teams', [])]
        if room.get('activeTeam') in team_names:
            idx = team_names.index(room['activeTeam'])
            room['activeTeam'] = team_names[(idx + 1) % len(team_names)]
        elif team_names:
            room['activeTeam'] = team_names[0]

        room['updatedAt'] = now_iso()
        persist_state_to_disk()

    broadcast_room_update(code)


@socketio.on('next_question')
def on_next_question(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            emit('error_message', {'error': 'Salle introuvable.'})
            return
        if not is_host(room, player_id):
            emit('error_message', {'error': "Seul l'hôte peut passer à la question suivante."})
            return

        game_key = room.get('currentGame')
        game_inst = room.get('gameInstance') or {}
        if game_key:
            gi_pub = rotate_next_question(room, game_key, game_inst)
            socketio.emit('new_word', {'gameInstance': gi_pub}, room=code)
            if game_key == 'tvVocab':
                socketio.emit('tvvocab_update', {'gameInstance': gi_pub}, room=code)

        room['updatedAt'] = now_iso()
        persist_state_to_disk()

    broadcast_room_update(code)


@socketio.on('end_game')
def on_end_game(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').upper().strip()
    player_id = payload.get('playerId')

    with ROOMS_LOCK:
        room = ROOMS.get(code)
        if not room:
            emit('error_message', {'error': 'Salle introuvable.'})
            return
        if not is_host(room, player_id):
            emit('error_message', {'error': "Seul l'hôte peut terminer la partie."})
            return

        # Calculer le podium des équipes et des joueurs (MVP)
        team_scores = dict(room.get('teamScores', {}))
        team_rankings = sorted(
            [{'name': t, 'score': s} for t, s in team_scores.items()],
            key=lambda x: x['score'],
            reverse=True
        )

        players_list = room.get('players', [])
        player_rankings = sorted(
            [
                {
                    'id': p['id'],
                    'name': p['name'],
                    'team': p['team'],
                    'score': p.get('score', 0),
                    'correctCount': p.get('correctCount', 0)
                }
                for p in players_list
            ],
            key=lambda x: x['score'],
            reverse=True
        )

        mvp = player_rankings[0] if player_rankings else None

        room['status'] = 'lobby'
        room['currentGame'] = None
        room['gameMode'] = None
        room['activeTeam'] = None
        room['roundStartedAt'] = None
        room.pop('gameInstance', None)
        room['updatedAt'] = now_iso()
        persist_state_to_disk()


# ---------------------------------------------------------------------------
# Module Leçons PDF (Upload, Liste, Téléchargement, Suppression)
# ---------------------------------------------------------------------------
UPLOAD_FOLDER = BASE_DIR / 'uploads'
LESSONS_META_FILE = UPLOAD_FOLDER / 'lessons_meta.json'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def load_lessons_meta():
    if LESSONS_META_FILE.exists():
        try:
            with open(LESSONS_META_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_lessons_meta(lessons):
    try:
        with open(LESSONS_META_FILE, 'w', encoding='utf-8') as f:
            json.dump(lessons, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving lessons metadata: {e}")


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/api/lessons', methods=['GET'])
def get_lessons():
    """
    Renvoie la liste complète des cours :
    1. Cours officiels du Google Drive partagé (Service Account)
    2. Cours locaux téléversés dans /uploads
    """
    # 1. Cours locaux
    lessons = load_lessons_meta()
    existing_files = {p.name: p for p in UPLOAD_FOLDER.glob('*.pdf')}
    synced = []
    seen = set()

    for item in lessons:
        fn = item.get('filename')
        if fn and fn in existing_files:
            synced.append(item)
            seen.add(fn)

    for fn, path in existing_files.items():
        if fn not in seen:
            size_kb = round(path.stat().st_size / 1024, 1)
            synced.append({
                'id': fn,
                'filename': fn,
                'title': fn.replace('.pdf', '').replace('_', ' ').replace('-', ' '),
                'category': 'Général',
                'level': 'Tous niveaux',
                'size': f"{size_kb} Ko",
                'createdAt': datetime.fromtimestamp(path.stat().st_mtime).strftime('%d/%m/%Y %H:%M')
            })

    save_lessons_meta(synced)

    # 2. Cours Google Drive
    drive_courses = []
    try:
        drive_courses = gdrive_service.list_drive_courses()
    except Exception as e:
        print(f"[API] Error loading drive courses: {e}")

    # Combiner Drive + Uploads locaux
    all_courses = drive_courses + synced

    return jsonify({
        'ok': True,
        'lessons': all_courses,
        'gdriveCount': len(drive_courses),
        'localCount': len(synced),
        'totalCount': len(all_courses)
    })


@app.route('/api/gdrive/files', methods=['GET'])
def get_gdrive_files():
    """Liste tous les cours hébergés sur le Google Drive officiel."""
    force = request.args.get('refresh', '').lower() in ('1', 'true')
    files = gdrive_service.list_drive_courses(force_refresh=force)
    return jsonify({
        'ok': True,
        'files': files,
        'count': len(files),
        'folderId': gdrive_service.DEFAULT_FOLDER_ID
    })


@app.route('/api/gdrive/sync', methods=['POST', 'GET'])
def sync_gdrive():
    """Force l'actualisation du cache des cours Google Drive."""
    files = gdrive_service.list_drive_courses(force_refresh=True)
    return jsonify({
        'ok': True,
        'message': f'{len(files)} cours synchronisés depuis Google Drive.',
        'count': len(files),
        'files': files
    })


@app.route('/api/gdrive/diagnose', methods=['GET'])
def diagnose_gdrive():
    """Vérifie l'état de la connexion Google Drive et indique les actions nécessaires."""
    diag = gdrive_service.diagnose()
    return jsonify({'ok': True, 'diagnosis': diag})


@app.route('/api/gdrive/download/<file_id>', methods=['GET'])
def download_gdrive_file(file_id):
    """Télécharge un document directement depuis Google Drive."""
    custom_name = request.args.get('name', f"cours_anglais_{file_id}.pdf")
    content, content_type = gdrive_service.download_drive_file(file_id)
    if not content:
        # Fallback redirection vers le webViewLink
        return redirect_to_drive(file_id)

    safe_fn = secure_filename(custom_name) or f"cours_{file_id}.pdf"
    if not safe_fn.lower().endswith('.pdf') and content_type == 'application/pdf':
        safe_fn += '.pdf'

    response = Response(content, mimetype=content_type or 'application/pdf')
    response.headers['Content-Disposition'] = f'attachment; filename="{safe_fn}"'
    return response


@app.route('/api/gdrive/preview/<file_id>', methods=['GET'])
def preview_gdrive_file(file_id):
    """Sert le PDF en inline pour la visionneuse intégrée du site."""
    content, content_type = gdrive_service.download_drive_file(file_id)
    if not content:
        return redirect_to_drive(file_id)

    response = Response(content, mimetype=content_type or 'application/pdf')
    response.headers['Content-Disposition'] = 'inline; filename="preview.pdf"'
    return response


def redirect_to_drive(file_id):
    from flask import redirect
    return redirect(f"https://drive.google.com/file/d/{file_id}/view", code=302)


@app.route('/api/lessons/upload', methods=['POST'])
def upload_lesson():
    if 'file' not in request.files:
        return jsonify({'ok': False, 'error': 'Aucun fichier fourni.'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'ok': False, 'error': 'Nom de fichier vide.'}), 400

    orig_name = file.filename
    if not orig_name.lower().endswith('.pdf'):
        return jsonify({'ok': False, 'error': 'Seuls les fichiers PDF sont acceptés.'}), 400

    safe_name = secure_filename(orig_name)
    if not safe_name:
        safe_name = f"lesson_{int(time.time())}.pdf"

    # Éviter l'écrasement de fichier en générant un nom unique si besoin
    target_path = UPLOAD_FOLDER / safe_name
    base_stem = target_path.stem
    counter = 1
    while target_path.exists():
        safe_name = f"{base_stem}_{counter}.pdf"
        target_path = UPLOAD_FOLDER / safe_name
        counter += 1

    file.save(target_path)
    file_size_kb = round(target_path.stat().st_size / 1024, 1)

    title = request.form.get('title', '').strip() or base_stem.replace('_', ' ').replace('-', ' ')
    category = request.form.get('category', '').strip() or 'Général'
    level = request.form.get('level', '').strip() or 'Tous niveaux'

    new_lesson = {
        'id': safe_name,
        'filename': safe_name,
        'title': title,
        'category': category,
        'level': level,
        'size': f"{file_size_kb} Ko",
        'createdAt': datetime.now().strftime('%d/%m/%Y %H:%M')
    }

    lessons = load_lessons_meta()
    lessons.insert(0, new_lesson)
    save_lessons_meta(lessons)

    return jsonify({'ok': True, 'lesson': new_lesson})


@app.route('/api/lessons/<path:filename>', methods=['DELETE'])
def delete_lesson(filename):
    safe_name = secure_filename(filename)
    target_path = UPLOAD_FOLDER / safe_name
    if target_path.exists():
        try:
            target_path.unlink()
        except Exception as e:
            return jsonify({'ok': False, 'error': f"Impossible de supprimer le fichier: {e}"}), 500

    lessons = load_lessons_meta()
    lessons = [item for item in lessons if item.get('filename') != safe_name]
    save_lessons_meta(lessons)

    return jsonify({'ok': True, 'message': 'Leçon supprimée avec succès.'})


# ---------------------------------------------------------------------------
# Module Teaching & Google Forms Evaluation Suite
# ---------------------------------------------------------------------------
TEACHING_ROOMS_LOCK = threading.Lock()
TEACHING_ROOMS = _state.get('teaching_rooms', {}) or {}
TEACHING_SID_TO_INFO = {}


def make_teaching_room_code():
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    code = 'TEA' + ''.join(random.choice(chars) for _ in range(3))
    while code in TEACHING_ROOMS:
        code = 'TEA' + ''.join(random.choice(chars) for _ in range(3))
    return code


@app.route('/api/teaching/forms', methods=['POST'])
def api_create_teaching_form():
    """Crée ou sauvegarde une évaluation Google Forms et renvoie le code et le lien direct."""
    payload = request.get_json(silent=True) or {}
    title = str(payload.get('title') or 'Évaluation d\'Anglais').strip()
    description = str(payload.get('description') or '').strip()
    teacher_name = str(payload.get('teacherName') or 'Formateur').strip()
    time_per_q = int(payload.get('timePerQuestion') or 0)
    questions = payload.get('questions') or []

    if not isinstance(questions, list) or len(questions) == 0:
        return jsonify({'ok': False, 'error': 'Le formulaire doit comporter au moins une question valide.'}), 400

    with TEACHING_ROOMS_LOCK:
        code = make_teaching_room_code()
        form_data = {
            'code': code,
            'title': title,
            'description': description,
            'teacherName': teacher_name,
            'timePerQuestion': time_per_q,
            'questions': questions,
            'status': 'open',
            'submissions': [],
            'students': [],
            'createdAt': now_iso()
        }
        TEACHING_ROOMS[code] = form_data
        persist_state_to_disk()

    return jsonify({
        'ok': True,
        'code': code,
        'url': f'/teaching.html?code={code}',
        'form': {
            'code': code,
            'title': title,
            'description': description,
            'teacherName': teacher_name,
            'questionCount': len(questions),
            'timePerQuestion': time_per_q
        }
    })


@app.route('/api/teaching/forms/<code>', methods=['GET'])
def api_get_teaching_form(code):
    """Renvoie le formulaire pour un élève (sans les bonnes réponses pour éviter la triche)."""
    code_clean = str(code).strip().upper()
    with TEACHING_ROOMS_LOCK:
        form_data = TEACHING_ROOMS.get(code_clean)
        if not form_data:
            return jsonify({'ok': False, 'error': f"Formulaire '{code_clean}' introuvable."}), 404

        # Version publique des questions (sans correctIndex ni explanation)
        public_questions = []
        for q in form_data.get('questions', []):
            public_questions.append({
                'category': q.get('category', 'Anglais'),
                'question': q.get('question', ''),
                'options': q.get('options', [])
            })

        return jsonify({
            'ok': True,
            'form': {
                'code': form_data['code'],
                'title': form_data['title'],
                'description': form_data.get('description', ''),
                'teacherName': form_data['teacherName'],
                'timePerQuestion': form_data.get('timePerQuestion', 0),
                'questions': public_questions
            }
        })


@app.route('/api/teaching/forms/<code>/submit', methods=['POST'])
def api_submit_teaching_form(code):
    """Calcule automatiquement les résultats côté serveur, enregistre la copie et renvoie le bilan détaillé."""
    code_clean = str(code).strip().upper()
    payload = request.get_json(silent=True) or {}
    student_name = str(payload.get('name') or '').strip()
    student_email = str(payload.get('email') or '').strip()
    answers = payload.get('answers') or {}  # qIndex -> selectedIndex

    if not student_name or not student_email:
        return jsonify({'ok': False, 'error': 'Le nom et l\'adresse email sont obligatoires.'}), 400

    with TEACHING_ROOMS_LOCK:
        form_data = TEACHING_ROOMS.get(code_clean)
        if not form_data:
            return jsonify({'ok': False, 'error': 'Évaluation introuvable.'}), 404

        if form_data.get('status') == 'closed':
            return jsonify({'ok': False, 'error': 'L\'enseignant a clôturé cette évaluation. Les soumissions ne sont plus acceptées.'}), 403

        questions = form_data.get('questions', [])
        total_q = len(questions)
        score = 0
        detailed_results = []
        mistakes = []

        for idx, q_item in enumerate(questions):
            ans_val = answers.get(str(idx), answers.get(idx))
            selected_idx = int(ans_val) if ans_val is not None and str(ans_val).isdigit() else -1
            correct_idx = q_item.get('correctIndex', 0)
            is_correct = (selected_idx == correct_idx)

            if is_correct:
                score += 1

            opts = q_item.get('options', [])
            user_opt_text = opts[selected_idx] if 0 <= selected_idx < len(opts) else "Non répondu"
            correct_opt_text = opts[correct_idx] if 0 <= correct_idx < len(opts) else ""

            res_obj = {
                'qIndex': idx,
                'category': q_item.get('category', 'Anglais'),
                'question': q_item.get('question', ''),
                'isCorrect': is_correct,
                'selectedIndex': selected_idx,
                'correctIndex': correct_idx,
                'userOptionText': user_opt_text,
                'correctOptionText': correct_opt_text,
                'explanation': q_item.get('explanation', '')
            }
            detailed_results.append(res_obj)
            if not is_correct:
                mistakes.append(res_obj)

        percentage = round((score / max(1, total_q)) * 100)

        submission = {
            'name': student_name,
            'email': student_email,
            'score': score,
            'total': total_q,
            'percentage': percentage,
            'mistakesCount': len(mistakes),
            'mistakes': mistakes,
            'detailedResults': detailed_results,
            'submittedAt': now_iso()
        }

        if 'submissions' not in form_data:
            form_data['submissions'] = []

        # Remplacer si même email ou ajouter
        existing_sub_idx = next((i for i, s in enumerate(form_data['submissions']) if s.get('email') == student_email), -1)
        if existing_sub_idx >= 0:
            form_data['submissions'][existing_sub_idx] = submission
        else:
            form_data['submissions'].append(submission)

        persist_state_to_disk()

    # Diffuser la mise à jour des résultats aux professeurs connectés en Socket.IO
    socketio.emit('teaching_submission_received', {
        'code': code_clean,
        'submission': submission,
        'totalSubmissions': len(form_data['submissions'])
    }, room=code_clean)

    return jsonify({
        'ok': True,
        'score': score,
        'totalQuestions': total_q,
        'percentage': percentage,
        'mistakes': mistakes,
        'detailedResults': detailed_results
    })


@app.route('/api/teaching/forms/<code>/close', methods=['POST'])
def api_close_teaching_form(code):
    """Permet au professeur de clôturer l'évaluation et bloquer les nouvelles soumissions."""
    code_clean = str(code).strip().upper()
    with TEACHING_ROOMS_LOCK:
        form_data = TEACHING_ROOMS.get(code_clean)
        if not form_data:
            return jsonify({'ok': False, 'error': 'Formulaire introuvable.'}), 404

        form_data['status'] = 'closed'
        form_data['closedAt'] = now_iso()
        persist_state_to_disk()

    socketio.emit('teaching_form_closed', {'code': code_clean}, room=code_clean)

    return jsonify({
        'ok': True,
        'message': 'Évaluation clôturée avec succès.',
        'totalSubmissions': len(form_data.get('submissions', []))
    })


@app.route('/api/teaching/forms/<code>/results', methods=['GET'])
def api_get_teaching_results(code):
    """Renvoie la liste des copies et les statistiques pour l'enseignant."""
    code_clean = str(code).strip().upper()
    with TEACHING_ROOMS_LOCK:
        form_data = TEACHING_ROOMS.get(code_clean)
        if not form_data:
            return jsonify({'ok': False, 'error': 'Formulaire introuvable.'}), 404

        subs = form_data.get('submissions', [])
        total_subs = len(subs)
        avg_score = round(sum(s.get('score', 0) for s in subs) / total_subs, 1) if total_subs > 0 else 0
        avg_pct = round(sum(s.get('percentage', 0) for s in subs) / total_subs) if total_subs > 0 else 0

        # Analyse du taux d'erreur par question
        questions = form_data.get('questions', [])
        question_stats = []
        for idx, q in enumerate(questions):
            err_count = sum(1 for s in subs if any(m.get('qIndex') == idx for m in s.get('mistakes', [])))
            err_pct = round((err_count / total_subs) * 100) if total_subs > 0 else 0
            question_stats.append({
                'qIndex': idx,
                'question': q.get('question', ''),
                'category': q.get('category', 'Anglais'),
                'errorCount': err_count,
                'errorPct': err_pct
            })

        return jsonify({
            'ok': True,
            'title': form_data['title'],
            'teacherName': form_data['teacherName'],
            'status': form_data.get('status', 'open'),
            'totalQuestions': len(questions),
            'submissions': subs,
            'questionStats': question_stats,
            'stats': {
                'totalSubmissions': total_subs,
                'averageScore': avg_score,
                'averagePercentage': avg_pct
            }
        })


# --- Événements Socket.IO Teaching ---
@socketio.on('teaching_create_room')
def on_teaching_create_room(payload):
    payload = payload or {}
    title = str(payload.get('title') or 'Évaluation d\'Anglais').strip()
    description = str(payload.get('description') or '').strip()
    teacher_name = str(payload.get('teacherName') or 'Formateur').strip()
    time_per_q = int(payload.get('timePerQuestion') or 0)
    questions = payload.get('questions') or []

    if not isinstance(questions, list) or len(questions) == 0:
        emit('teaching_error', {'message': 'Le questionnaire doit comporter au moins 1 question.'})
        return

    with TEACHING_ROOMS_LOCK:
        code = make_teaching_room_code()
        from flask import request as flask_request
        teacher_sid = flask_request.sid

        room = {
            'code': code,
            'title': title,
            'description': description,
            'teacherName': teacher_name,
            'teacherSid': teacher_sid,
            'timePerQuestion': time_per_q,
            'questions': questions,
            'currentQIndex': 0,
            'status': 'lobby',
            'students': [],
            'submissions': [],
            'answers': {},
            'createdAt': now_iso()
        }
        TEACHING_ROOMS[code] = room
        TEACHING_SID_TO_INFO[teacher_sid] = {'code': code, 'role': 'teacher'}
        persist_state_to_disk()

    sio_join_room(code)
    emit('teaching_room_created', {'room': {
        'code': code,
        'title': title,
        'description': description,
        'teacherName': teacher_name,
        'timePerQuestion': time_per_q,
        'status': 'lobby',
        'students': []
    }})


@socketio.on('teaching_join_room')
def on_teaching_join_room(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').strip().upper()
    name = str(payload.get('name') or payload.get('firstName') or 'Élève').strip()
    email = str(payload.get('email') or '').strip()

    from flask import request as flask_request
    student_sid = flask_request.sid

    with TEACHING_ROOMS_LOCK:
        room = TEACHING_ROOMS.get(code)
        if not room:
            emit('teaching_error', {'message': f"Session '{code}' introuvable. Vérifiez le code fourni par l'enseignant."})
            return

        existing = next((s for s in room['students'] if s.get('sid') == student_sid or (s.get('email') and s.get('email') == email)), None)
        if existing:
            existing['sid'] = student_sid
            existing['name'] = name
            existing['email'] = email
            existing['connected'] = True
        else:
            student_obj = {
                'sid': student_sid,
                'name': name,
                'email': email,
                'score': 0,
                'connected': True,
                'answers': {}
            }
            room['students'].append(student_obj)

        TEACHING_SID_TO_INFO[student_sid] = {'code': code, 'role': 'student'}

    sio_join_room(code)
    emit('teaching_room_joined', {'room': {
        'code': room['code'],
        'title': room['title'],
        'description': room.get('description', ''),
        'teacherName': room['teacherName'],
        'timePerQuestion': room['timePerQuestion'],
        'questions': room.get('questions', []),
        'status': room['status']
    }})

    socketio.emit('teaching_room_update', {'room': {
        'code': room['code'],
        'title': room['title'],
        'teacherName': room['teacherName'],
        'status': room['status'],
        'students': [{'name': s['name'], 'email': s.get('email', '')} for s in room['students']]
    }}, room=code)


@socketio.on('teaching_submit_final_score')
def on_teaching_submit_final_score(payload):
    payload = payload or {}
    code = str(payload.get('code') or '').strip().upper()
    student_data = payload.get('student') or {}

    with TEACHING_ROOMS_LOCK:
        room = TEACHING_ROOMS.get(code)
        if room:
            if 'submissions' not in room:
                room['submissions'] = []
            # Update or append
            existing_idx = next((i for i, s in enumerate(room['submissions'])
                                  if s.get('email') == student_data.get('email')), -1)
            if existing_idx >= 0:
                room['submissions'][existing_idx] = student_data
            else:
                room['submissions'].append(student_data)
            persist_state_to_disk()

    socketio.emit('teaching_submission_received', {
        'code': code,
        'submission': student_data,
        'totalSubmissions': len(room.get('submissions', [])) if room else 1
    }, room=code)


@socketio.on('teaching_teacher_watch')
def on_teaching_teacher_watch(payload):
    """Allows teacher (or student) browser to join the Socket.IO room
    for a given evaluation code so it receives real-time events like
    teaching_submission_received and teaching_form_closed."""
    payload = payload or {}
    code = str(payload.get('code') or '').strip().upper()
    if not code:
        return
    # Anyone joining this room will receive broadcasts for this evaluation
    sio_join_room(code)
    emit('teaching_watch_ok', {'code': code, 'ok': True})


@app.route('/api/teaching/rooms/<code>', methods=['GET'])
def get_teaching_room_api(code):
    with TEACHING_ROOMS_LOCK:
        room = TEACHING_ROOMS.get(code.upper())
        if not room:
            return jsonify({'ok': False, 'error': 'Room not found'}), 404
        return jsonify({
            'ok': True,
            'room': {
                'code': room['code'],
                'title': room['title'],
                'teacherName': room['teacherName'],
                'timePerQuestion': room['timePerQuestion'],
                'status': room['status'],
                'studentCount': len(room['students'])
            }
        })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n=======================================================")
    print(f"🚀 Accra English Club Server is running!")
    print(f"🌐 Open in your browser: http://localhost:{port}")
    print(f"⚙️  Async Mode: {async_mode}")
    print(f"=======================================================\n")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
