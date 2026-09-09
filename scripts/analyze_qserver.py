"""
Surgical fix for qserver.py duplicate routes.
This script reads the file, removes duplicate blocks, and rewrites cleanly.
"""
import re

with open('qserver.py', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"Original file: {len(content.splitlines())} lines, {len(content)} bytes")

# Normalize line endings to \n for processing
content = content.replace('\r\n', '\n').replace('\r', '\n')

lines = content.split('\n')

# Count occurrences of key identifiers
def count_occurrences(lines, pattern):
    return sum(1 for line in lines if pattern in line)

print(f"serve_upload occurrences: {count_occurrences(lines, 'def serve_upload')}")
print(f"@socketio.on('next_turn') occurrences: {count_occurrences(lines, \"@socketio.on('next_turn')\")}")
print(f"@socketio.on('next_question') occurrences: {count_occurrences(lines, \"@socketio.on('next_question')\")}")
print(f"@socketio.on('end_game') occurrences: {count_occurrences(lines, \"@socketio.on('end_game')\")}")
print(f"def load_lessons_meta occurrences: {count_occurrences(lines, 'def load_lessons_meta')}")
print(f"def upload_lesson occurrences: {count_occurrences(lines, 'def upload_lesson')}")
print(f"UPLOAD_FOLDER = occurrences: {count_occurrences(lines, 'UPLOAD_FOLDER = BASE_DIR')}")

# Find line numbers for each occurrence
for i, line in enumerate(lines, 1):
    if 'def serve_upload' in line:
        print(f"  serve_upload at line {i}: {line.strip()}")
    if "def on_next_turn" in line:
        print(f"  on_next_turn at line {i}: {line.strip()}")
    if "def on_next_question" in line:
        print(f"  on_next_question at line {i}: {line.strip()}")
    if "def on_end_game" in line:
        print(f"  on_end_game at line {i}: {line.strip()}")
    if "UPLOAD_FOLDER = BASE_DIR" in line:
        print(f"  UPLOAD_FOLDER at line {i}: {line.strip()}")
    if "def load_lessons_meta" in line:
        print(f"  load_lessons_meta at line {i}: {line.strip()}")
    if "def upload_lesson" in line:
        print(f"  upload_lesson at line {i}: {line.strip()}")
