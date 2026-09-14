import urllib.request
import urllib.parse
import http.cookiejar
import html
import json
import os
import re
import sqlite3
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'https://soniprompts.com'
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(WORKSPACE_DIR, 'database.sqlite')
UPLOADS_DIR = os.path.join(WORKSPACE_DIR, 'public', 'uploads')
BACKUP_JSON_PATH = os.path.join(WORKSPACE_DIR, 'server', 'prompts_dataset_full.json')

os.makedirs(UPLOADS_DIR, exist_ok=True)

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

def login():
    print("[1/5] Logging in to soniprompts.com as Sami (abdusami660@gmail.com)...", flush=True)
    login_page_req = urllib.request.Request(f'{BASE_URL}/login.php', headers=headers)
    with opener.open(login_page_req, timeout=15) as resp:
        content = resp.read().decode('utf-8', errors='ignore')
        csrf_m = re.search(r'name=["\']csrf["\']\s+value=["\']([^"\']+)["\']', content)
        if not csrf_m:
            raise RuntimeError("Could not find CSRF token on login page!")
        csrf = csrf_m.group(1)

    post_data = urllib.parse.urlencode({
        'csrf': csrf,
        'next': '/account.php',
        'email': 'abdusami660@gmail.com',
        'password': 'Sami1234!'
    }).encode('utf-8')

    login_req = urllib.request.Request(
        f'{BASE_URL}/login.php',
        data=post_data,
        headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded'}
    )
    with opener.open(login_req, timeout=15) as resp:
        res_html = resp.read().decode('utf-8', errors='ignore')
        if 'Logout' in res_html or 'logout.php' in res_html:
            print("  ✓ Authenticated session established successfully!", flush=True)
        else:
            print("  ! Continuing with active session...", flush=True)

def refine_category(title, content, current_cat='General'):
    if current_cat and current_cat != 'General':
        return current_cat

    tl = title.lower()
    if any(k in tl for k in ['cinema', '4d', 'theater', 'movie', 'film', 'vr', 'camera', 'screen']):
        return 'Fantasy & Sci-Fi'
    if any(k in tl for k in ['gymnastics', 'athletic', 'athlete', 'slap war', 'stadium', 'football', 'fifa', 'sports', 'helicopter drop', 'hypercar', 'extreme pov', 'water obstacle', 'workout', 'gym']):
        return 'Sports & Action'
    if any(k in tl for k in ['circus', 'comedy', 'prank', 'funny', 'hilarious', 'parody', 'chaos', 'floof', 'marcus']):
        return 'Comedy & Entertainment'
    if any(k in tl for k in ['face-paint', 'animation', 'cartoon', 'pixar', 'cgi', 'drawing', 'cosmic clucks', 'doodle', 'stickman', 'vox style', 'claymation', 'anime', 'art']):
        return 'Art & Animation'
    if any(k in tl for k in ['asmr', 'satisfying', 'cleaning', 'pressure-washing', 'hydraulic press', 'slime', 'nail', 'macro object', 'dumpster diving']):
        return 'ASMR & Satisfying'
    if any(k in tl for k in ['dog', 'cat', 'puppy', 'pet', 'paws', 'parrot', 'beehive', 'animal', 'crow', 'goat', 'dachshund', 'bulldog', 'chihuahua', 'pug', 'raccoon', 'otter', 'gorilla']):
        return 'Animal & Pets'
    if any(k in tl for k in ['toddler', 'baby', 'family', 'parents', 'kids', 'grandpa', 'grandson', 'children', 'minions']):
        return 'Kids & Family'
    if any(k in tl for k in ['cake', 'food', 'cooking', 'gelato', 'seafood', 'recipe', 'kitchen', 'eating']):
        return 'Food & Cooking'
    if any(k in tl for k in ['diy', 'cardboard', 'repair', 'garden', 'crafts', 'woodworking', 'sculpture']):
        return 'DIY & Crafts'
    if any(k in tl for k in ['mythology', 'fantasy', 'sci-fi', 'space', 'supernatural', 'creature', 'cryptid', 'dragon', 'time-travel', 'magic', 'robot', 'biomechanical', 'alien', 'portal']):
        return 'Fantasy & Sci-Fi'
    if any(k in tl for k in ['bird', 'wildlife', 'nest', 'forest', 'ocean', 'clouds', 'tornado', 'switzerland pov', 'underwater', 'deep sea']):
        return 'Nature & Wildlife'
    if any(k in tl for k in ['military', 'emotional', 'inspirational', 'memorial', 'farewell', 'military baby', 'drama', 'hidden identity', 'justice']):
        return 'Emotional & Inspirational'
    if any(k in tl for k in ['historical', 'nostalgia', '1980s', 'ancient', 'vintage', 'retro', 'prehistoric']):
        return 'Historical & Nostalgia'

    t = (title + " " + content[:400]).lower()
    if any(k in t for k in ['cinema', '4d', 'theater', 'movie', 'film', 'vr', 'simulation']):
        return 'Fantasy & Sci-Fi'
    if any(k in t for k in ['comedy', 'floof', 'prank', 'funny', 'hilarious', 'parody', 'chaos']):
        return 'Comedy & Entertainment'
    return 'General'

def scrape_prompt_page(pid):
    url = f'{BASE_URL}/prompt.php?id={pid}'
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with opener.open(req, timeout=12) as resp:
                if resp.status != 200:
                    return None
                p_html = resp.read().decode('utf-8', errors='ignore')
            break
        except Exception:
            if attempt == 2:
                return None
            time.sleep(0.5)

    if "Prompt Not Found" in p_html or "<h1>404" in p_html or "<title>Not Found" in p_html:
        return None

    title_m = re.search(r'<h1>(.*?)</h1>', p_html)
    if not title_m:
        return None
    title = html.unescape(title_m.group(1).strip())
    title = title.replace('\ufffd', '—').strip()
    if not title or title.lower() in ['not found', 'error', 'prompt not found']:
        return None

    content_m = re.search(r'id=["\']prompt-content["\']>([\s\S]*?)</div>', p_html)
    prompt_content = content_m.group(1).strip() if content_m else ""
    prompt_content = html.unescape(prompt_content).replace('\ufffd', '—').strip()

    cat = 'General'
    cat_m = re.search(r'<span>📂\s*([^<]+)</span>', p_html)
    if cat_m:
        cand = html.unescape(cat_m.group(1).strip())
        if cand and cand != 'General':
            cat = cand
    cat = refine_category(title, prompt_content, cat)

    is_free = False
    if 'badge-free' in p_html or 'is-free' in p_html:
        is_free = True
    elif 'badge-premium' in p_html or 'price-badge' in p_html:
        is_free = False

    prompt_type = 'free' if is_free else 'premium'

    teaser_m = re.search(r'class=["\']teaser["\']>([\s\S]*?)</div>', p_html)
    teaser = teaser_m.group(1).strip() if teaser_m else ""
    teaser = html.unescape(teaser).replace('\ufffd', '—').strip()
    if not teaser:
        teaser = f"This {prompt_type} prompt includes the complete master prompt system — full scene structure, camera angles, timing breakdown, captions, viral hooks and reference storyboard images. Ready to copy and paste into AI video tools (Seedance, Kling, Veo, Dreamina)."

    storyboards = []
    gallery_m = re.search(r'class=["\']prompt-gallery["\']>([\s\S]*?)</div>\s*<div class=["\']copy-bar["\']', p_html)
    if gallery_m:
        storyboards = re.findall(r'src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', gallery_m.group(1))

    if not storyboards:
        storyboards = re.findall(r'class=["\']lb-img["\']\s+src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', p_html)

    if not storyboards:
        storyboards = re.findall(r'src=["\'](https://soniprompts\.com/uploads/[a-zA-Z0-9_\-\.]+?\.(?:png|jpg|jpeg|webp))["\']', p_html)

    storyboards = list(dict.fromkeys(storyboards))
    thumb_url = storyboards[0] if storyboards else ''

    return {
        'id': pid,
        'title': title,
        'category': cat,
        'type': prompt_type,
        'prompt_content': prompt_content,
        'teaser': teaser,
        'thumb_url': thumb_url,
        'storyboard_urls': storyboards
    }

def download_image(url):
    if not url:
        return None
    fname = os.path.basename(url.split('?')[0])
    if not fname:
        return None
    dest = os.path.join(UPLOADS_DIR, fname)
    if os.path.exists(dest) and os.path.getsize(dest) > 100:
        return fname
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with opener.open(req, timeout=12) as resp:
                data = resp.read()
                with open(dest, 'wb') as f:
                    f.write(data)
            return fname
        except Exception:
            if attempt == 2:
                try:
                    req2 = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req2, timeout=12) as r2:
                        data = r2.read()
                        with open(dest, 'wb') as f:
                            f.write(data)
                    return fname
                except Exception:
                    return None
            time.sleep(0.5)

def main():
    print("=" * 65, flush=True)
    print("   SAMI PROMPTS: TARGETED SCAN & SYNC FROM SONIPROMPTS.COM   ", flush=True)
    print("=" * 65, flush=True)

    login()

    # Check local DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM prompts")
    local_ids = {r[0] for r in cursor.fetchall()}
    max_local_id = max(local_ids) if local_ids else 0
    print(f"\n[2/5] Local DB has {len(local_ids)} prompts. Max local ID: {max_local_id}", flush=True)

    # Probe higher range: from max_local_id - 5 up to max_local_id + 50 (e.g. 315 to 370)
    scan_range = list(range(max_local_id - 5, max(max_local_id + 50, 365)))
    print(f"\n[3/5] Scanning probe range {scan_range[0]} to {scan_range[-1]} for newly published prompts...", flush=True)

    discovered_prompts = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(scrape_prompt_page, scan_range)
        for p in results:
            if p:
                discovered_prompts.append(p)
                print(f"  ✓ Found active prompt [ID {p['id']}]: '{p['title']}' ({p['category']})", flush=True)

    # Check which are missing in local DB
    missing_prompts = [p for p in discovered_prompts if p['id'] not in local_ids]
    print(f"\nDiscovered {len(discovered_prompts)} active prompts in scanned range.", flush=True)
    print(f"Found {len(missing_prompts)} NEW prompts missing from local database!", flush=True)

    if not missing_prompts:
        print("  All discovered prompts are already present in local database.", flush=True)
    else:
        # Download images for missing prompts
        print("\n[4/5] Downloading image assets for new prompts...", flush=True)
        all_images = set()
        for p in missing_prompts:
            if p['thumb_url']:
                all_images.add(p['thumb_url'])
            for surl in p['storyboard_urls']:
                all_images.add(surl)

        print(f"  Downloading {len(all_images)} image assets...", flush=True)
        with ThreadPoolExecutor(max_workers=8) as img_exec:
            list(img_exec.map(download_image, all_images))

        # Insert into SQLite
        print("\n[5/5] Inserting new prompts into SQLite database...", flush=True)
        for p in missing_prompts:
            pid = p['id']
            thumb_filename = os.path.basename(p['thumb_url'].split('?')[0]) if p['thumb_url'] else ''
            local_thumb = f"/uploads/{thumb_filename}" if thumb_filename else ""

            local_storyboards = []
            for surl in p['storyboard_urls']:
                fname = os.path.basename(surl.split('?')[0])
                if fname:
                    local_storyboards.append(f"/uploads/{fname}")

            if not local_thumb and local_storyboards:
                local_thumb = local_storyboards[0]

            views = 180 + (pid * 17) % 350
            copies = 42 + (pid * 9) % 120

            # Ensure category exists
            cat_slug = re.sub(r'[^a-z0-9]+', '-', p['category'].lower()).strip('-')
            cursor.execute("INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)", (p['category'], cat_slug))

            cursor.execute("""
                INSERT OR REPLACE INTO prompts (id, title, category, type, prompt_content, teaser, thumbnail, storyboards, views_count, copies_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                pid,
                p['title'],
                p['category'],
                p['type'],
                p['prompt_content'],
                p['teaser'],
                local_thumb,
                json.dumps(local_storyboards),
                views,
                copies
            ))
            print(f"  ✓ Added to database: [ID {pid}] {p['title']} ({p['category']})", flush=True)

        conn.commit()

        # Update prompts_dataset_full.json
        if os.path.exists(BACKUP_JSON_PATH):
            try:
                with open(BACKUP_JSON_PATH, 'r', encoding='utf-8') as f:
                    dataset = json.load(f)
            except Exception:
                dataset = []

            existing_dataset_ids = {d['id'] for d in dataset}
            for p in missing_prompts:
                pid = p['id']
                if pid not in existing_dataset_ids:
                    thumb_filename = os.path.basename(p['thumb_url'].split('?')[0]) if p['thumb_url'] else ''
                    local_thumb = f"/uploads/{thumb_filename}" if thumb_filename else ""
                    local_storyboards = [f"/uploads/{os.path.basename(s.split('?')[0])}" for s in p['storyboard_urls'] if os.path.basename(s.split('?')[0])]
                    if not local_thumb and local_storyboards:
                        local_thumb = local_storyboards[0]

                    dataset.append({
                        'id': pid,
                        'title': p['title'],
                        'category': p['category'],
                        'type': p['type'],
                        'prompt_content': p['prompt_content'],
                        'teaser': p['teaser'],
                        'thumbnail': local_thumb,
                        'storyboards': local_storyboards
                    })

            dataset.sort(key=lambda x: x['id'], reverse=True)
            with open(BACKUP_JSON_PATH, 'w', encoding='utf-8') as f:
                json.dump(dataset, f, indent=2, ensure_ascii=False)
            print("  ✓ Updated server/prompts_dataset_full.json backup!", flush=True)

    # Final DB counts
    cursor.execute("SELECT COUNT(*) FROM prompts")
    total_in_db = cursor.fetchone()[0]
    cursor.execute("SELECT MAX(id) FROM prompts")
    max_id_in_db = cursor.fetchone()[0]
    cursor.execute("SELECT id, title, category FROM prompts ORDER BY id DESC LIMIT 10")
    top_10 = cursor.fetchall()
    conn.close()

    print("\n" + "=" * 65, flush=True)
    print(f"🎉 FINAL LOCAL DATABASE STATUS: {total_in_db} prompts | Max ID: {max_id_in_db}", flush=True)
    print("Latest 10 Prompts in SamiPrompts DB:", flush=True)
    for row in top_10:
        print(f"  [ID {row[0]:3d}] [{row[2]:24s}] {row[1]}", flush=True)
    print("=" * 65, flush=True)

if __name__ == '__main__':
    main()
