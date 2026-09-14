import urllib.request
import urllib.parse
import http.cookiejar
import html
import json
import os
import re
import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'https://soniprompts.com'
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

def login():
    print("[1] Logging in to soniprompts.com as Sami (abdusami660@gmail.com)...")
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
            print("  ! Continuing with active session...")

def check_soniprompts():
    login()

    print("\n[2] Checking latest prompts on soniprompts.com...")
    # Fetch browse.php
    browse_req = urllib.request.Request(f'{BASE_URL}/browse.php', headers=headers)
    with opener.open(browse_req, timeout=15) as resp:
        browse_html = resp.read().decode('utf-8', errors='ignore')

    browse_ids = [int(x) for x in re.findall(r'prompt\.php\?id=(\d+)', browse_html)]
    print(f"  Browse page has {len(browse_ids)} prompt links. Max ID on browse page: {max(browse_ids) if browse_ids else 'None'}")

    # Paginating api/load_more.php
    offset = 0
    all_discovered = set(browse_ids)
    while True:
        try:
            req = urllib.request.Request(f'{BASE_URL}/api/load_more.php?type=all&offset={offset}', headers=headers)
            with opener.open(req, timeout=10) as resp:
                raw = resp.read().decode('utf-8', errors='ignore')
                data = json.loads(raw)
                pids = [int(x) for x in re.findall(r'prompt\.php\?id=(\d+)', data.get('html', ''))]
                if not pids:
                    break
                all_discovered.update(pids)
                if not data.get('has_more'):
                    break
                offset += data.get('count', len(pids))
        except Exception as e:
            print(f"  Load more reached end or error: {e}")
            break

    print(f"  Total discovered via browse + load_more: {len(all_discovered)} prompts. Max ID: {max(all_discovered) if all_discovered else 'None'}")

    # Now let's probe higher IDs from max(all_discovered) up to max(all_discovered) + 50 to see if newer prompts exist
    current_max = max(all_discovered) if all_discovered else 320
    print(f"\n[3] Probing higher IDs beyond {current_max} (testing up to {current_max + 40})...")
    found_higher = []
    for test_id in range(current_max - 5, current_max + 41):
        try:
            url = f'{BASE_URL}/prompt.php?id={test_id}'
            req = urllib.request.Request(url, headers=headers)
            with opener.open(req, timeout=8) as resp:
                html_text = resp.read().decode('utf-8', errors='ignore')
                if "Prompt Not Found" not in html_text and "<h1>404" not in html_text and "<title>Not Found" not in html_text:
                    title_m = re.search(r'<h1>(.*?)</h1>', html_text)
                    title = html.unescape(title_m.group(1).strip()) if title_m else 'No title'
                    found_higher.append((test_id, title))
                    all_discovered.add(test_id)
                    print(f"  -> Found active prompt ID {test_id}: '{title}'")
        except Exception:
            pass

    # Compare with local sqlite
    conn = sqlite3.connect('database.sqlite')
    c = conn.cursor()
    c.execute('SELECT id, title FROM prompts')
    local_prompts = dict(c.fetchall())
    conn.close()

    print(f"\n[4] Comparison:")
    print(f"  Total on soniprompts.com: {len(all_discovered)} active prompts")
    print(f"  Total in local DB: {len(local_prompts)} prompts")
    
    missing_in_local = sorted([pid for pid in all_discovered if pid not in local_prompts])
    print(f"  Missing in local DB: {len(missing_in_local)} prompts -> {missing_in_local}")

    # Also list top 15 newest on soniprompts
    sorted_remote = sorted(all_discovered, reverse=True)
    print(f"\nTop 15 Newest Prompts on soniprompts.com:")
    for pid in sorted_remote[:15]:
        title = "..."
        for tid, tname in found_higher:
            if tid == pid:
                title = tname
        print(f"  - ID {pid:3d} | {'[IN DB]' if pid in local_prompts else '[MISSING]':9s} | {local_prompts.get(pid, title)}")

if __name__ == '__main__':
    check_soniprompts()
