with open('qserver.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to remove the first occurrence of the duplicate lessons block that was inserted before on_next_turn
bad_block = """# ---------------------------------------------------------------------------
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
    lessons = load_lessons_meta()
    # Synchroniser avec les fichiers réellement présents sur le disque
    existing_files = {p.name: p for p in UPLOAD_FOLDER.glob('*.pdf')}
    synced = []
    seen = set()

    for item in lessons:
        fn = item.get('filename')
        if fn and fn in existing_files:
            synced.append(item)
            seen.add(fn)

    # Ajouter les PDF orphelins découverts dans le dossier
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
    return jsonify({'ok': True, 'lessons': synced})


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
        counter += 1"""

replacement = """@socketio.on('next_turn')
def on_next_turn(payload):
    payload = payload or {}"""

# Normalize line endings
content_norm = content.replace('\r\n', '\n')
bad_block_norm = bad_block.replace('\r\n', '\n')

if bad_block_norm in content_norm:
    new_content = content_norm.replace(bad_block_norm, replacement, 1)
    with open('qserver.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: qserver.py cleaned successfully!")
else:
    print("WARNING: bad_block not found directly, trying line-by-line")
    lines = content_norm.split('\n')
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if '# Module Leçons PDF (Upload, Liste, Téléchargement, Suppression)' in line and start_idx == -1:
            start_idx = i - 1
        if 'counter += 1' in line and start_idx != -1 and end_idx == -1:
            end_idx = i + 1
            break
    if start_idx != -1 and end_idx != -1:
        new_lines = lines[:start_idx] + ["@socketio.on('next_turn')", "def on_next_turn(payload):", "    payload = payload or {}"] + lines[end_idx:]
        with open('qserver.py', 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        print("SUCCESS: Line replacement done!")
    else:
        print(f"Indices: start={start_idx}, end={end_idx}")
