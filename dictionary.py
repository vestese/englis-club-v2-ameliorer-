"""
Module de dictionnaire pour Accra English Club.
Interroge vocabulaire_anglais.db (tables 'vocabulary' et 'words_raw')
pour valider les mots anglais et fournir les tirages pédagogiques.
"""

import sqlite3
from pathlib import Path
import random

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / 'vocabulaire_anglais.db'

_CACHE = {}
_ALL_WORDS_SET = None
_CONTENT_CACHE = {}


def get_db_connection():
    """Retourne une connexion SQLite ou None si la base est absente."""
    if not DB_FILE.exists():
        return None
    try:
        conn = sqlite3.connect(str(DB_FILE), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"[Dictionary] DB connection failed: {e}")
        return None


def _get_all_valid_words():
    global _ALL_WORDS_SET
    if _ALL_WORDS_SET is not None:
        return _ALL_WORDS_SET

    words = set()
    conn = get_db_connection()
    if not conn:
        _ALL_WORDS_SET = words
        return words

    try:
        c = conn.cursor()
        tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
        for tbl in tables:
            cols_info = c.execute(f"PRAGMA table_info('{tbl}');").fetchall()
            cols = [col[1].lower() for col in cols_info]
            target_col = None
            for candidate in ['word', 'mot', 'english', 'en', 'vocabulary', 'term', 'name']:
                if candidate in cols:
                    target_col = candidate
                    break
            if not target_col and cols:
                target_col = cols[0]

            if target_col:
                safe_col = target_col.replace('"', '')
                rows = c.execute(f'SELECT "{safe_col}" FROM "{tbl}"').fetchall()
                for r in rows:
                    if r[0] and isinstance(r[0], str):
                        clean_w = r[0].strip().lower()
                        if clean_w.isalpha():
                            words.add(clean_w)
        conn.close()
    except Exception as e:
        print(f"Warning loading word database: {e}")
        if conn:
            try: conn.close()
            except Exception: pass

    _ALL_WORDS_SET = words
    return _ALL_WORDS_SET


def validate_word(word: str) -> bool:
    """Valide si un mot est un mot anglais valide (lookup O(1) ultra rapide)."""
    if not word or not isinstance(word, str):
        return False
    clean = word.strip().lower()
    if not clean or not clean.isalpha():
        return False

    if clean in _CACHE:
        return _CACHE[clean]

    valid_words = _get_all_valid_words()
    if valid_words:
        is_valid = clean in valid_words
    else:
        # Fallback offline si pas de base
        is_valid = bool(len(clean) >= 2 and any(c in 'aeiouy' for c in clean))

    _CACHE[clean] = is_valid
    return is_valid


def get_pedagogical_words(min_len=3, count=10):
    """Retourne une liste de mots pédagogiques issus du dictionnaire."""
    valid_words = list(_get_all_valid_words())
    if valid_words:
        filtered = [w.upper() for w in valid_words if len(w) >= min_len]
        if filtered:
            random.shuffle(filtered)
            return filtered[:count]
    return ["APPLE", "ORANGE", "SUMMER", "FLOWER", "GARDEN", "TEACHER", "SCHOOL", "FRIEND", "FAMILY", "PLANET"]


def get_anagram_words():
    """Lit la liste des mots d'anagramme directement depuis content/content.js avec cache."""
    if 'anagramWords' in _CONTENT_CACHE:
        return _CONTENT_CACHE['anagramWords']

    content_file = BASE_DIR / 'content' / 'content.js'
    if content_file.exists():
        try:
            with content_file.open('r', encoding='utf-8') as f:
                text = f.read()
            import re
            m = re.search(r'anagramWords\s*:\s*\[(.*?)\]', text, re.DOTALL)
            if m:
                raw_items = re.findall(r'"([^"]+)"', m.group(1))
                if raw_items:
                    res = [w.upper() for w in raw_items if w.isalpha()]
                    _CONTENT_CACHE['anagramWords'] = res
                    return res
        except Exception:
            pass
    fallback = ["HELLO", "WATER", "HOUSE", "APPLE", "GREEN", "SISTER", "SCHOOL", "LION", "BOOK", "BREAD", "MOTHER", "THREE", "TABLE", "CHAIR", "MUSIC", "MONEY", "HAPPY", "FAMILY", "FRIEND", "GARDEN"]
    _CONTENT_CACHE['anagramWords'] = fallback
    return fallback


def load_content_js_array(var_name):
    """Lit un tableau d'objets depuis content/content.js avec mise en cache mémoire."""
    if var_name in _CONTENT_CACHE:
        return _CONTENT_CACHE[var_name]

    content_file = BASE_DIR / 'content' / 'content.js'
    if not content_file.exists():
        return None
    try:
        text = content_file.read_text(encoding='utf-8')
        import re, json
        # Match var_name: [ ... ]
        pattern = r'\b' + re.escape(var_name) + r'\s*:\s*(\[.*?\])\s*,'
        m = re.search(pattern, text, re.DOTALL)
        if m:
            raw = m.group(1)
            # convert JS object literal to JSON
            raw = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', raw)
            raw = re.sub(r',\s*([}\]])', r'\1', raw)
            parsed = json.loads(raw)
            _CONTENT_CACHE[var_name] = parsed
            return parsed
    except Exception:
        pass
    return None


def get_grammar_questions():
    parsed = load_content_js_array('grammar')
    defaults = [
        {"sentence": "You ___ show your passport at the airport.", "options": ["must", "can", "might"], "answer": "must", "cat": "Modal Verbs"},
        {"sentence": "She ___ reading a book right now.", "options": ["is", "are", "were"], "answer": "is", "cat": "Present Continuous"},
        {"sentence": "They ___ to London last year.", "options": ["went", "go", "gone"], "answer": "went", "cat": "Past Simple"},
        {"sentence": "I have ___ this movie twice.", "options": ["seen", "saw", "see"], "answer": "seen", "cat": "Present Perfect"},
        {"sentence": "He is the ___ student in the class.", "options": ["tallest", "taller", "tall"], "answer": "tallest", "cat": "Superlatives"},
        {"sentence": "If it rains, we ___ stay inside.", "options": ["will", "would", "did"], "answer": "will", "cat": "Conditionals"},
        {"sentence": "We haven't got ___ milk left in the fridge.", "options": ["any", "some", "many"], "answer": "any", "cat": "Quantifiers"},
        {"sentence": "She is interested ___ learning computer programming.", "options": ["in", "at", "on"], "answer": "in", "cat": "Prepositions"}
    ]
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        return parsed + [d for d in defaults if d['sentence'] not in [p.get('sentence') for p in parsed]]
    return defaults


def get_irregular_verbs():
    parsed = load_content_js_array('irregularVerbs')
    defaults = [
        {"verb": "Go", "past": "went", "participle": "gone", "fr": "Aller"},
        {"verb": "Break", "past": "broke", "participle": "broken", "fr": "Casser"},
        {"verb": "Write", "past": "wrote", "participle": "written", "fr": "Écrire"},
        {"verb": "Speak", "past": "spoke", "participle": "spoken", "fr": "Parler"},
        {"verb": "Eat", "past": "ate", "participle": "eaten", "fr": "Manger"},
        {"verb": "Drink", "past": "drank", "participle": "drunk", "fr": "Boire"},
        {"verb": "Take", "past": "took", "participle": "taken", "fr": "Prendre"},
        {"verb": "Drive", "past": "drove", "participle": "driven", "fr": "Conduire"},
        {"verb": "Begin", "past": "began", "participle": "begun", "fr": "Commencer"},
        {"verb": "Choose", "past": "chose", "participle": "chosen", "fr": "Choisir"}
    ]
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        return parsed + [d for d in defaults if d['verb'] not in [p.get('verb') for p in parsed]]
    return defaults


def get_phrasal_verbs():
    parsed = load_content_js_array('phrasalVerbs')
    defaults = [
        {"verb": "give up", "meaning": "Stop trying or quit", "fr": "Abandonner", "options": ["Stop trying", "Start running", "Look up"]},
        {"verb": "look for", "meaning": "Search for something", "fr": "Chercher", "options": ["Search for something", "See clearly", "Turn around"]},
        {"verb": "call off", "meaning": "Cancel an event", "fr": "Annuler", "options": ["Cancel an event", "Phone someone", "Shout loud"]},
        {"verb": "turn on", "meaning": "Start a device", "fr": "Allumer", "options": ["Start a device", "Rotate fast", "Walk away"]},
        {"verb": "find out", "meaning": "Discover information", "fr": "Découvrir", "options": ["Discover information", "Look outside", "Lose track"]}
    ]
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        return parsed + [d for d in defaults if d['verb'] not in [p.get('verb') for p in parsed]]
    return defaults


def get_mystery_objects():
    parsed = load_content_js_array('mysteryObjects')
    defaults = [
        {"word": "Smartphone", "emoji": "📱", "cat": "Technology", "clue": "Small electronic device in your pocket used for calls and photos.", "fr": "Téléphone portable"},
        {"word": "Umbrella", "emoji": "☂️", "cat": "Everyday Items", "clue": "Keeps you dry when walking in the rain.", "fr": "Parapluie"},
        {"word": "Refrigerator", "emoji": "🧊", "cat": "Kitchen", "clue": "Large kitchen appliance that keeps food and drinks cold.", "fr": "Réfrigérateur / Frigo"},
        {"word": "Bicycle", "emoji": "🚲", "cat": "Transport", "clue": "Two-wheeled vehicle propelled by pedals.", "fr": "Vélo / Bicyclette"},
        {"word": "Guitar", "emoji": "🎸", "cat": "Music", "clue": "String instrument played by plucking or strumming.", "fr": "Guitare"}
    ]
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        return parsed + [d for d in defaults if d['word'] not in [p.get('word') for p in parsed]]
    return defaults


def get_big_challenge_questions():
    parsed = load_content_js_array('bigChallenge') or load_content_js_array('bigChallengeTopics')
    defaults = [
        {"question": "What is the capital of the United Kingdom?", "options": ["London", "Paris", "Washington", "Canberra"], "answer": "London", "topic": "Geography"},
        {"question": "Which planet is known as the Red Planet?", "options": ["Mars", "Venus", "Jupiter", "Saturn"], "answer": "Mars", "topic": "Science"},
        {"question": "Who wrote the play 'Romeo and Juliet'?", "options": ["William Shakespeare", "Charles Dickens", "Mark Twain", "Jane Austen"], "answer": "William Shakespeare", "topic": "Literature"},
        {"question": "What is the largest ocean on Earth?", "options": ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], "answer": "Pacific Ocean", "topic": "Geography"},
        {"question": "How many days are there in a leap year?", "options": ["366", "365", "364", "360"], "answer": "366", "topic": "General Knowledge"}
    ]
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        return parsed + [d for d in defaults if d['question'] not in [p.get('question') for p in parsed]]
    return defaults


def get_description_questions():
    """Read description game questions from content/description_data.js.
    Falls back to a small inline set if the file is missing or unparseable.
    """
    import re, json as _json
    js_file = BASE_DIR / 'content' / 'description_data.js'
    if js_file.exists():
        try:
            text = js_file.read_text(encoding='utf-8')
            # Extract the array between [ ... ];
            m = re.search(r'descriptionGame\s*=\s*(\[.*?\])\s*;', text, re.DOTALL)
            if m:
                raw = m.group(1)
                raw = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', raw)
                raw = re.sub(r',\s*([}\]])', r'\1', raw)
                questions = _json.loads(raw)
                if questions:
                    return questions
        except Exception:
            pass
    return [
        {"answer": "Chameleon", "description": "This reptile changes colour to blend into its surroundings and has a very long sticky tongue to catch insects.", "options": ["Gecko", "Chameleon", "Iguana", "Salamander"], "topic": "Animals", "emoji": "🦎", "difficulty": "medium"},
        {"answer": "Black hole", "description": "This astronomical phenomenon is a region where gravity is so strong that not even light can escape.", "options": ["Neutron star", "Quasar", "Black hole", "Pulsar"], "topic": "Science", "emoji": "🌌", "difficulty": "medium"},
        {"answer": "Renaissance", "description": "This European cultural movement meaning rebirth began in Italy in the 14th century. It revived interest in classical art and philosophy.", "options": ["Enlightenment", "Reformation", "Renaissance", "Romanticism"], "topic": "History", "emoji": "🎨", "difficulty": "medium"},
        {"answer": "Algorithm", "description": "This is a precise step-by-step set of instructions to solve a problem. Every app and search engine relies on one.", "options": ["Binary", "Protocol", "Algorithm", "Syntax"], "topic": "Technology", "emoji": "💻", "difficulty": "medium"},
        {"answer": "Palindrome", "description": "This is a word or phrase that reads identically forwards and backwards. Racecar and madam are classic examples.", "options": ["Anagram", "Palindrome", "Homophone", "Synonym"], "topic": "Language", "emoji": "🔁", "difficulty": "hard"}
    ]


def get_tv_vocab_questions():
    parsed = load_content_js_array('tvVocab')
    defaults = [
        { 'prompt': 'Name 5 things you can find in a kitchen.', 'answers': ['FORK', 'KNIFE', 'PLATE', 'SPOON', 'REFRIGERATOR', 'STOVE', 'CUPBOARD', 'SINK', 'POT', 'PAN'] },
        { 'prompt': 'Name 5 fruits.', 'answers': ['APPLE', 'BANANA', 'ORANGE', 'MANGO', 'GRAPE', 'PINEAPPLE', 'STRAWBERRY', 'WATERMELON'] },
        { 'prompt': 'Name 5 animals you might see on a farm.', 'answers': ['COW', 'SHEEP', 'PIG', 'HORSE', 'CHICKEN', 'GOAT', 'DONKEY'] },
        { 'prompt': 'Name 5 things you do in the morning.', 'answers': ['BRUSH TEETH', 'SHOWER', 'EAT BREAKFAST', 'GET DRESSED', 'MAKE COFFEE', 'WAKE UP', 'CHECK PHONE'] },
        { 'prompt': 'Name 5 items you can find in a school bag.', 'answers': ['BOOK', 'PENCIL', 'NOTEBOOK', 'LUNCHBOX', 'PEN', 'RULER', 'ERASER'] }
    ]
    if parsed and isinstance(parsed, list) and len(parsed) > 0:
        # Normalize prompt and answers format
        formatted = []
        for p in parsed:
            prompt_str = p.get('prompt') or p.get('task') or p.get('title') or ''
            answers_list = [str(a).upper() for a in p.get('answers', []) if a]
            if prompt_str and answers_list:
                formatted.append({'prompt': prompt_str, 'answers': answers_list})
        if formatted:
            return formatted
    return defaults
