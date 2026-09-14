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

# Set stdout encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'https://soniprompts.com'
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(WORKSPACE_DIR, 'database.sqlite')
UPLOADS_DIR = os.path.join(WORKSPACE_DIR, 'public', 'uploads')
BACKUP_JSON_PATH = os.path.join(WORKSPACE_DIR, 'server', 'prompts_dataset_full.json')

os.makedirs(UPLOADS_DIR, exist_ok=True)

# 1. Setup Session with CookieJar
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

def login():
    print("[1/5] Logging in to soniprompts.com as Sami (abdusami660@gmail.com)...")
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
            print("  ✓ Authenticated session established successfully!")
        else:
            print("  ! Warning: Logout link not detected, continuing with active session...")

def get_categories_and_prompt_mappings():
    print("\n[2/5] Crawling categories and building prompt-to-category index...")
    category_map = {} # prompt_id -> category_name
    category_names = {} # cat_id -> category_name
    card_thumbnails = {} # prompt_id -> thumbnail_url
    free_prompt_ids = set()

    # Fetch browse.php to extract category names
    browse_req = urllib.request.Request(f'{BASE_URL}/browse.php', headers=headers)
    with opener.open(browse_req, timeout=15) as resp:
        browse_html = resp.read().decode('utf-8', errors='ignore')

    # Categories pills: <a href="https://soniprompts.com/browse.php?cat=10" class="pill "> Animal &amp; Pets (40) </a>
    cat_matches = re.findall(r'href=["\'](?:https://soniprompts\.com/)?browse\.php\?cat=(\d+)["\'][^>]*>([\s\S]*?)</a>', browse_html)
    for cid, ctext in cat_matches:
        clean_name = re.sub(r'\s*\(\d+\)\s*', '', ctext).strip()
        clean_name = html.unescape(clean_name)
        category_names[int(cid)] = clean_name

    print(f"  Found {len(category_names)} categories on soniprompts.com:")
    for cid, cname in sorted(category_names.items()):
        print(f"    - [{cid:2d}] {cname}")

    # Crawl each category page
    for cid, cname in category_names.items():
        cat_url = f'{BASE_URL}/browse.php?cat={cid}'
        try:
            with opener.open(urllib.request.Request(cat_url, headers=headers), timeout=15) as resp:
                cat_html = resp.read().decode('utf-8', errors='ignore')
                cards = re.findall(r'<a[^>]+href=["\'](?:https://soniprompts\.com/)?prompt\.php\?id=(\d+)["\']([\s\S]*?)</a>', cat_html)
                for pid_str, card_body in cards:
                    pid = int(pid_str)
                    category_map[pid] = cname
                    thumb_m = re.search(r'src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', card_body)
                    if thumb_m:
                        card_thumbnails[pid] = thumb_m.group(1)
                    if 'is-free' in card_body or 'prow-btn-free' in card_body or 'Free' in card_body:
                        free_prompt_ids.add(pid)
        except Exception as e:
            print(f"  ! Error crawling cat {cid} ({cname}): {e}")

    # Also extract cards from general browse.php
    cards = re.findall(r'<a[^>]+href=["\'](?:https://soniprompts\.com/)?prompt\.php\?id=(\d+)["\']([\s\S]*?)</a>', browse_html)
    for pid_str, card_body in cards:
        pid = int(pid_str)
        thumb_m = re.search(r'src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', card_body)
        if thumb_m and pid not in card_thumbnails:
            card_thumbnails[pid] = thumb_m.group(1)
        if 'is-free' in card_body or 'prow-btn-free' in card_body:
            free_prompt_ids.add(pid)

    # Also home page cards
    try:
        with opener.open(urllib.request.Request(f'{BASE_URL}/', headers=headers), timeout=15) as resp:
            home_html = resp.read().decode('utf-8', errors='ignore')
        cards = re.findall(r'<a[^>]+href=["\'](?:https://soniprompts\.com/)?prompt\.php\?id=(\d+)["\']([\s\S]*?)</a>', home_html)
        for pid_str, card_body in cards:
            pid = int(pid_str)
            thumb_m = re.search(r'src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', card_body)
            if thumb_m and pid not in card_thumbnails:
                card_thumbnails[pid] = thumb_m.group(1)
            if 'is-free' in card_body or 'prow-btn-free' in card_body:
                free_prompt_ids.add(pid)
    except Exception as e:
        print(f"  ! Error reading homepage cards: {e}")

    # Also load_more.php cards
    offset = 0
    while True:
        try:
            req = urllib.request.Request(f'{BASE_URL}/api/load_more.php?type=all&offset={offset}', headers=headers)
            with opener.open(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8', errors='ignore'))
                html_snippet = data.get('html', '')
                cards = re.findall(r'<a[^>]+href=["\'](?:https://soniprompts\.com/)?prompt\.php\?id=(\d+)["\']([\s\S]*?)</a>', html_snippet)
                if not cards:
                    break
                for pid_str, card_body in cards:
                    pid = int(pid_str)
                    thumb_m = re.search(r'src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', card_body)
                    if thumb_m and pid not in card_thumbnails:
                        card_thumbnails[pid] = thumb_m.group(1)
                    if 'is-free' in card_body or 'prow-btn-free' in card_body or 'Free' in card_body:
                        free_prompt_ids.add(pid)
                if not data.get('has_more'):
                    break
                offset += data.get('count', len(cards))
        except Exception:
            break

    return category_names, category_map, card_thumbnails, free_prompt_ids

def refine_category(title, content, current_cat='General'):
    if current_cat and current_cat != 'General':
        return current_cat

    tl = title.lower()

    # Title-based check first (highest accuracy)
    if any(k in tl for k in ['gymnastics', 'athletic', 'athlete', 'slap war', 'stadium', 'football', 'fifa', 'sports', 'helicopter drop', 'hypercar', 'extreme pov', 'water obstacle', 'workout', 'gym']):
        return 'Sports & Action'
    if any(k in tl for k in ['circus', 'comedy', 'prank', 'funny', 'hilarious', 'parody', 'chaos']):
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

    # Fallback to content check
    t = (title + " " + content[:400]).lower()
    if any(k in t for k in ['asmr', 'satisfying', 'cleaning', 'pressure-washing', 'hydraulic press', 'slime', 'nail art', 'macro object', 'dumpster diving']):
        return 'ASMR & Satisfying'
    if any(k in t for k in ['sports', 'slap war', 'stadium', 'football', 'fifa', 'extreme pov', 'hypercar', 'ramp walk', 'water obstacle', 'workout', 'gym', 'gymnastics', 'athletic', 'drop', 'helicopter']):
        return 'Sports & Action'
    if any(k in t for k in ['dog', 'cat', 'puppy', 'pet', 'paws', 'parrot', 'beehive', 'crow', 'goat', 'dachshund', 'bulldog', 'chihuahua', 'pug']):
        return 'Animal & Pets'
    if any(k in t for k in ['3d cartoon', 'pixar', 'animation', 'cgi', 'drawing', 'cosmic clucks', 'doodle', 'stickman', 'vox style', 'claymation', 'anime', 'face-paint']):
        return 'Art & Animation'
    if any(k in t for k in ['toddler', 'baby', 'family', 'parents', 'kids', 'grandpa', 'grandson', 'children', 'minions']):
        return 'Kids & Family'
    if any(k in t for k in ['cake', 'food', 'cooking', 'gelato', 'seafood', 'recipe', 'kitchen', 'eating']):
        return 'Food & Cooking'
    if any(k in t for k in ['diy', 'cardboard', 'repair', 'garden', 'crafts', 'woodworking', 'sculpture']):
        return 'DIY & Crafts'
    if any(k in t for k in ['fantasy', 'sci-fi', 'space', 'supernatural', 'creature', 'cryptid', 'dragon', 'time-travel', 'magic', 'robot', 'biomechanical', 'alien', 'portal']):
        return 'Fantasy & Sci-Fi'
    if any(k in t for k in ['wildlife', 'nest', 'forest', 'ocean', 'clouds', 'tornado', 'switzerland pov', 'underwater', 'deep sea']):
        return 'Nature & Wildlife'
    if any(k in t for k in ['comedy', 'prank', 'funny', 'hilarious', 'parody', 'chaos', 'circus']):
        return 'Comedy & Entertainment'
    if any(k in t for k in ['emotional', 'inspirational', 'memorial', 'farewell', 'military baby', 'drama', 'identity', 'justice']):
        return 'Emotional & Inspirational'
    if any(k in t for k in ['historical', 'nostalgia', '1980s', 'ancient', 'vintage', 'retro', 'prehistoric']):
        return 'Historical & Nostalgia'

    return 'General'

def scrape_single_prompt(pid, default_cat, card_thumb, is_known_free):
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

    # Check validity
    if "Prompt Not Found" in p_html or "<h1>404" in p_html or "<title>Not Found" in p_html:
        return None

    # Title
    title_m = re.search(r'<h1>(.*?)</h1>', p_html)
    if not title_m:
        return None
    title = html.unescape(title_m.group(1).strip())
    title = title.replace('\ufffd', '—').strip()
    if not title or title.lower() in ['not found', 'error', 'prompt not found']:
        return None

    # Content
    content_m = re.search(r'id=["\']prompt-content["\']>([\s\S]*?)</div>', p_html)
    prompt_content = content_m.group(1).strip() if content_m else ""
    prompt_content = html.unescape(prompt_content).replace('\ufffd', '—').strip()

    # Category from page or mapping
    cat = default_cat
    if not cat or cat == 'General':
        cat_m = re.search(r'<span>📂\s*([^<]+)</span>', p_html)
        if cat_m:
            cand = html.unescape(cat_m.group(1).strip())
            if cand and cand != 'General':
                cat = cand
    cat = refine_category(title, prompt_content, cat)

    # Type: Free vs Premium
    is_free = is_known_free
    if 'badge-free' in p_html or 'is-free' in p_html:
        is_free = True
    elif 'badge-premium' in p_html or 'price-badge' in p_html:
        is_free = False

    prompt_type = 'free' if is_free else 'premium'

    # Teaser
    teaser_m = re.search(r'class=["\']teaser["\']>([\s\S]*?)</div>', p_html)
    teaser = teaser_m.group(1).strip() if teaser_m else ""
    teaser = html.unescape(teaser).replace('\ufffd', '—').strip()
    if not teaser:
        if pid == 315 or 'anti-detect' in title.lower():
            teaser = "Anti-Detect Studio complete software download package and step-by-step setup guide for Facebook & TikTok content monetization, profile isolation, and multi-account automation."
        else:
            teaser = f"This {prompt_type} prompt includes the complete master prompt system — full scene structure, camera angles, timing breakdown, captions, viral hooks and reference storyboard images. Ready to copy and paste into AI video tools (Seedance, Kling, Veo, Dreamina)."

    # Storyboard images
    storyboards = []
    gallery_m = re.search(r'class=["\']prompt-gallery["\']>([\s\S]*?)</div>\s*<div class=["\']copy-bar["\']', p_html)
    if gallery_m:
        storyboards = re.findall(r'src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', gallery_m.group(1))

    if not storyboards:
        storyboards = re.findall(r'class=["\']lb-img["\']\s+src=["\'](https://soniprompts\.com/uploads/[^"\']+)["\']', p_html)

    if not storyboards:
        storyboards = re.findall(r'src=["\'](https://soniprompts\.com/uploads/[a-zA-Z0-9_\-\.]+?\.(?:png|jpg|jpeg|webp))["\']', p_html)

    storyboards = list(dict.fromkeys(storyboards))
    thumb_url = card_thumb or (storyboards[0] if storyboards else '')
    if not storyboards and thumb_url:
        storyboards = [thumb_url]

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
    print("=" * 65)
    print("   SAMI PROMPTS: FULL SONIPROMPTS.COM AUDIT & DEEP SYNCHRONIZER   ")
    print("=" * 65)

    # 1. Login
    login()

    # 2. Get Categories & Card mappings
    cat_names, cat_map, card_thumbs, free_ids = get_categories_and_prompt_mappings()

    # 3. Dynamic Max ID Discovery:
    # Discover all prompts up to max active ID on soniprompts.com
    print("\n[3/5] Discovering all prompt IDs from soniprompts.com (crawling api/load_more.php + ID scan)...")
    
    discovered_ids = set()
    # Paginating api/load_more.php
    offset = 0
    while True:
        try:
            req = urllib.request.Request(f'{BASE_URL}/api/load_more.php?type=all&offset={offset}', headers=headers)
            with opener.open(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8', errors='ignore'))
                pids = [int(x) for x in re.findall(r'prompt\.php\?id=(\d+)', data.get('html', ''))]
                if not pids:
                    break
                discovered_ids.update(pids)
                if not data.get('has_more'):
                    break
                offset += data.get('count', len(pids))
        except Exception:
            break

    max_discovered = max(discovered_ids) if discovered_ids else 314
    target_scan_max = max(max_discovered + 10, 340)
    all_pids = sorted(list(set(range(1, target_scan_max + 1)) | discovered_ids))
    print(f"  Total IDs queued for verification: {len(all_pids)} (Range: 1 to {target_scan_max})")

    scraped_prompts = []

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(scrape_single_prompt, pid, cat_map.get(pid, 'General'), card_thumbs.get(pid, ''), pid in free_ids): pid
            for pid in all_pids
        }
        for fut in futures:
            p = fut.result()
            if p:
                scraped_prompts.append(p)

    # Verify and retry any missing IDs that might exist
    scraped_id_set = {p['id'] for p in scraped_prompts}
    potential_max = max(scraped_id_set) if scraped_id_set else 312
    missing_to_retry = [pid for pid in all_pids if pid <= potential_max and pid not in scraped_id_set]
    if missing_to_retry:
        print(f"  Checking {len(missing_to_retry)} remaining IDs for any transient timeouts...")
        for pid in missing_to_retry:
            p = scrape_single_prompt(pid, cat_map.get(pid, 'General'), card_thumbs.get(pid, ''), pid in free_ids)
            if p:
                scraped_prompts.append(p)
                print(f"    ✓ Recovered [ID {p['id']}]: {p['title']}")

    scraped_prompts.sort(key=lambda x: x['id'], reverse=True)
    max_remote_id = scraped_prompts[0]['id'] if scraped_prompts else 0
    print(f"\n  ✓ Successfully scraped {len(scraped_prompts)} active prompts from soniprompts.com!")
    print(f"  ✓ Latest prompt on soniprompts.com: [ID {max_remote_id}] '{scraped_prompts[0]['title'] if scraped_prompts else 'None'}'")

    # 4. Download media assets in parallel
    print("\n[4/5] Downloading media assets (thumbnails & storyboards)...")
    all_image_urls = set()
    for p in scraped_prompts:
        if p['thumb_url']:
            all_image_urls.add(p['thumb_url'])
        for surl in p['storyboard_urls']:
            all_image_urls.add(surl)

    print(f"  Total unique images to sync: {len(all_image_urls)}")
    with ThreadPoolExecutor(max_workers=10) as img_executor:
        list(img_executor.map(download_image, all_image_urls))

    print("  ✓ Media asset downloads complete!")

    # 5. Insert into SQLite database & compare with existing
    print("\n[5/5] Updating SQLite database (database.sqlite)...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clean up stale duplicate 314 if present (on soniprompts.com 314 is 404)
    cursor.execute("DELETE FROM prompts WHERE id = 314 AND title LIKE '%IMPOSSIBLE LOAD TESTS%'")
    conn.commit()

    # Check existing IDs in DB
    cursor.execute("SELECT id FROM prompts")
    existing_db_ids = {r[0] for r in cursor.fetchall()}

    # Sync Categories
    for cid, cname in cat_names.items():
        slug = re.sub(r'[^a-z0-9]+', '-', cname.lower()).strip('-')
        cursor.execute("INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)", (cname, slug))
    cursor.execute("INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)", ('General', 'general'))
    conn.commit()

    # Prepare local paths and database records
    final_dataset = []
    newly_added_ids = []

    for p in scraped_prompts:
        pid = p['id']
        is_new = pid not in existing_db_ids
        if is_new:
            newly_added_ids.append(pid)

        thumb_filename = os.path.basename(p['thumb_url'].split('?')[0]) if p['thumb_url'] else ''
        local_thumb = f"/uploads/{thumb_filename}" if thumb_filename else ""

        local_storyboards = []
        for surl in p['storyboard_urls']:
            fname = os.path.basename(surl.split('?')[0])
            if fname:
                local_storyboards.append(f"/uploads/{fname}")

        if not local_thumb and local_storyboards:
            local_thumb = local_storyboards[0]

        record = {
            'id': p['id'],
            'title': p['title'],
            'category': p['category'],
            'type': p['type'],
            'prompt_content': p['prompt_content'],
            'teaser': p['teaser'],
            'thumbnail': local_thumb,
            'storyboards': local_storyboards
        }
        final_dataset.append(record)

        # Preserve existing views and copies count if already in db
        cursor.execute("SELECT views_count, copies_count FROM prompts WHERE id = ?", (pid,))
        row = cursor.fetchone()
        views = row[0] if row else (150 + (pid * 13) % 400)
        copies = row[1] if row else (35 + (pid * 7) % 150)

        cursor.execute("""
            INSERT OR REPLACE INTO prompts (id, title, category, type, prompt_content, teaser, thumbnail, storyboards, views_count, copies_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p['id'],
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

    conn.commit()

    # Get final counts
    cursor.execute("SELECT COUNT(*) FROM prompts")
    total_prompts = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM categories")
    total_categories = cursor.fetchone()[0]

    # Category breakdown
    cursor.execute("SELECT category, COUNT(*) as cnt FROM prompts GROUP BY category ORDER BY cnt DESC")
    cat_counts = cursor.fetchall()
    conn.close()

    # Save full backup JSON
    with open(BACKUP_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_dataset, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 65)
    print("🎉 SYNCHRONIZATION & AUDIT COMPLETE!")
    print(f"  • Newly Added Prompts to Database: {len(newly_added_ids)}")
    if newly_added_ids:
        print("  • Added IDs:")
        for nid in sorted(newly_added_ids):
            matching_p = next((x for x in scraped_prompts if x['id'] == nid), None)
            title = matching_p['title'] if matching_p else 'Unknown'
            cat = matching_p['category'] if matching_p else 'General'
            print(f"      + [ID {nid:3d}] [{cat:22s}] {title}")
    else:
        print("  • All prompts were already up to date!")

    print(f"\n  • Total Prompts in Database: {total_prompts}")
    print(f"  • Total Categories: {total_categories}")
    print(f"  • Category Distribution:")
    for cname, count in cat_counts:
        print(f"      - {cname:26s}: {count:3d} prompts")
    print(f"  • Media Stored In: {UPLOADS_DIR}")
    print(f"  • Backup Dataset Saved To: {BACKUP_JSON_PATH}")
    print("=" * 65)

if __name__ == '__main__':
    main()
