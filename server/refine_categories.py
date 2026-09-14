import sqlite3
import json
import re

conn = sqlite3.connect('database.sqlite')
cursor = conn.cursor()

cursor.execute("SELECT id, title, prompt_content FROM prompts WHERE category = 'General'")
rows = cursor.fetchall()

def determine_category(title, content):
    t = (title + " " + content[:500]).lower()
    
    # Check ASMR / Satisfying
    if any(k in t for k in ['asmr', 'satisfying', 'cleaning', 'pressure-washing', 'hydraulic press', 'slime', 'nail art', 'macro object']):
        return 'ASMR & Satisfying'
    
    # Check Kids & Family
    if any(k in t for k in ['toddler', 'baby', 'family', 'parents', 'kids', 'grandpa', 'grandson', 'children', 'minions', 'stickman']):
        return 'Kids & Family'

    # Check Animal & Pets
    if any(k in t for k in ['dog', 'cat', 'puppy', 'pet', 'paws', 'parrot', 'beehive', 'animal', 'crow', 'goat', 'dachshund', 'bulldog', 'chihuahua', 'pug', 'raccoon']):
        return 'Animal & Pets'

    # Check Art & Animation
    if any(k in t for k in ['3d cartoon', 'pixar', 'animation', 'cgi', 'drawing', 'cosmic clucks', 'doodle', 'stickman', 'vox style', 'claymation', 'anime']):
        return 'Art & Animation'

    # Check Food & Cooking
    if any(k in t for k in ['cake', 'food', 'cooking', 'gelato', 'seafood', 'recipe', 'kitchen', 'eating']):
        return 'Food & Cooking'

    # Check Sports & Action
    if any(k in t for k in ['sports', 'slap war', 'stadium', 'football', 'fifa', 'extreme pov', 'hypercar', 'ramp walk', 'water obstacle', 'workout', 'gym']):
        return 'Sports & Action'

    # Check DIY & Crafts
    if any(k in t for k in ['diy', 'cardboard', 'repair', 'garden', 'crafts', 'woodworking', 'sculpture']):
        return 'DIY & Crafts'

    # Check Fantasy & Sci-Fi
    if any(k in t for k in ['fantasy', 'sci-fi', 'space', 'supernatural', 'creature', 'cryptid', 'dragon', 'time-travel', 'magic', 'robot', 'biomechanical', 'alien', 'portal']):
        return 'Fantasy & Sci-Fi'

    # Check Nature & Wildlife
    if any(k in t for k in ['wildlife', 'nest', 'forest', 'ocean', 'clouds', 'tornado', 'switzerland pov', 'underwater', 'deep sea']):
        return 'Nature & Wildlife'

    # Check Comedy & Entertainment
    if any(k in t for k in ['comedy', 'prank', 'funny', 'hilarious', 'parody', 'chaos', 'circus']):
        return 'Comedy & Entertainment'

    # Check Emotional & Inspirational
    if any(k in t for k in ['emotional', 'inspirational', 'memorial', 'farewell', 'military baby', 'virum', 'firum', 'sirum', 'drama']):
        return 'Emotional & Inspirational'

    # Check Historical & Nostalgia
    if any(k in t for k in ['historical', 'nostalgia', '1980s', 'ancient', 'vintage', 'retro', 'prehistoric']):
        return 'Historical & Nostalgia'

    return 'General'

updated_count = 0
for pid, title, content in rows:
    new_cat = determine_category(title, content)
    if new_cat != 'General':
        cursor.execute("UPDATE prompts SET category = ? WHERE id = ?", (new_cat, pid))
        updated_count += 1
        print(f"Updated #{pid} '{title[:35]}' -> {new_cat}")

conn.commit()
print(f"\nCategorized {updated_count} prompts out of {len(rows)} General prompts!")

# Also update server/prompts_dataset_full.json
cursor.execute("SELECT id, title, category, type, prompt_content, teaser, thumbnail, storyboards FROM prompts")
all_p = cursor.fetchall()
final_list = []
for r in all_p:
    final_list.append({
        'id': r[0],
        'title': r[1],
        'category': r[2],
        'type': r[3],
        'prompt_content': r[4],
        'teaser': r[5],
        'thumbnail': r[6],
        'storyboards': json.loads(r[7]) if r[7] else []
    })

with open('server/prompts_dataset_full.json', 'w', encoding='utf-8') as f:
    json.dump(final_list, f, indent=2, ensure_ascii=False)

# Category breakdown
cursor.execute("SELECT category, count(*) as count FROM prompts GROUP BY category ORDER BY count DESC")
print("\nFinal Category Distribution:")
for cat, cnt in cursor.fetchall():
    print(f"  • {cat}: {cnt}")

conn.close()
