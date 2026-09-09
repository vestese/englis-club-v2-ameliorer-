with open('qserver.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Normalize
lines = text.replace('\r\n', '\n').split('\n')

# Find first @socketio.on('end_game')
first_end_game_idx = -1
for i, line in enumerate(lines):
    if "@socketio.on('end_game')" in line:
        first_end_game_idx = i
        break

# Find where truncated on_next_turn begins (code = str(payload.get('code') ...)
next_turn_body_idx = -1
for i in range(first_end_game_idx, len(lines)):
    if "code = str(payload.get('code')" in lines[i]:
        next_turn_body_idx = i
        break

print(f"first_end_game_idx={first_end_game_idx}, next_turn_body_idx={next_turn_body_idx}")

if first_end_game_idx != -1 and next_turn_body_idx != -1:
    new_lines = (
        lines[:first_end_game_idx] +
        ["@socketio.on('next_turn')", "def on_next_turn(payload):", "    payload = payload or {}"] +
        lines[next_turn_body_idx:]
    )
    with open('qserver.py', 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    print(f"SUCCESS: qserver.py cleaned! Total lines before: {len(lines)}, after: {len(new_lines)}")
else:
    print("FAILED to find indices")
