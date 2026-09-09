"""
Definitive surgical fix for qserver.py.
Strategy: read file as bytes, detect mixed line endings, 
and rebuild removing duplicate blocks.
"""

with open('qserver.py', 'rb') as f:
    raw = f.read()

# Decode preserving original encoding
text = raw.decode('utf-8')

# Work with all \n for processing
lines_raw = text.split('\n')
# Each "line" still has \r at the end if CRLF originally

def stripped(line):
    return line.rstrip('\r').rstrip()

# Find all key line numbers (0-indexed)
first_module_header = None   # first "# Module Leçons PDF"
second_module_header = None  # second "# Module Leçons PDF"

for i, line in enumerate(lines_raw):
    s = stripped(line)
    if '# Module Leçons PDF (Upload, Liste' in s:
        if first_module_header is None:
            first_module_header = i
        else:
            second_module_header = i

print(f"First module header at line {first_module_header + 1}")
print(f"Second module header at line {second_module_header + 1}")

# The plan:
# Keep everything BEFORE first_module_header (the old bad block)
# Then keep the second block (which is correct, has GDrive integration)
# The "second block" starts at second_module_header - 1 (the comment dashes)
# We need to find where the comment dashes are before second_module_header

dash_before_second = None
for i in range(second_module_header - 1, second_module_header - 5, -1):
    if '# ---' in stripped(lines_raw[i]):
        dash_before_second = i
        break

if dash_before_second is None:
    dash_before_second = second_module_header

print(f"Dash before second block at line {dash_before_second + 1}")

# Also find the end of the first module header block = where the second good block BEFORE gdrive starts
# We want to preserve everything before first_module_header (end_game and before)
# Then skip to dash_before_second

# Check what's at first_module_header - 1 (should be end of persist_state_to_disk)
print(f"Line before first module: '{stripped(lines_raw[first_module_header - 1])}'")
print(f"Line before first module -2: '{stripped(lines_raw[first_module_header - 2])}'")

# Build the new file:
# Part 1: lines 0 to (first_module_header - 1) inclusive
# Part 2: lines dash_before_second to end

part1 = lines_raw[:first_module_header]
part2 = lines_raw[dash_before_second:]

new_lines = part1 + part2
new_text = '\n'.join(new_lines)

# Write back
with open('qserver.py', 'w', encoding='utf-8') as f:
    f.write(new_text)

print(f"\nDone! Original: {len(lines_raw)} lines -> New: {len(new_lines)} lines")

# Verify: count serve_upload
serve_count = sum(1 for l in new_lines if 'def serve_upload' in l)
print(f"serve_upload count: {serve_count} (should be 1)")

upload_lesson_count = sum(1 for l in new_lines if 'def upload_lesson' in l)
print(f"upload_lesson count: {upload_lesson_count} (should be 1)")
