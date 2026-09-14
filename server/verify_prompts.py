import sqlite3
import json

conn = sqlite3.connect('database.sqlite')
c = conn.cursor()

c.execute('SELECT COUNT(*), MIN(id), MAX(id) FROM prompts')
count, min_id, max_id = c.fetchone()
print(f"Total Prompts: {count}")
print(f"Min ID: {min_id}, Max ID: {max_id}")

c.execute('SELECT id, title, category, type, LENGTH(prompt_content), thumbnail, storyboards FROM prompts ORDER BY id DESC LIMIT 15')
print('\nTop 15 Latest Prompts in Database:')
for r in c.fetchall():
    st = json.loads(r[6]) if r[6] else []
    print(f"  [{r[0]:3d}] {r[3].upper():7s} | {r[2][:22]:22s} | {r[1][:45]:45s} | Content: {r[4]:5d} chars | Storyboards: {len(st)}")

# Check if any prompts have empty content
c.execute('SELECT id, title FROM prompts WHERE prompt_content IS NULL OR LENGTH(prompt_content) < 10')
empty_prompts = c.fetchall()
print(f"\nPrompts with empty or incomplete content: {len(empty_prompts)}")

conn.close()
