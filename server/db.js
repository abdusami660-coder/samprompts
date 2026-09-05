const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Helper for promise-based queries
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      membership_status TEXT DEFAULT 'free',
      membership_expires_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'free',
      prompt_content TEXT NOT NULL,
      teaser TEXT,
      thumbnail TEXT,
      storyboards TEXT,
      views_count INTEGER DEFAULT 0,
      copies_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      author TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      content TEXT NOT NULL,
      media_url TEXT,
      likes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS community_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS community_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(post_id, user_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      prompt_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, prompt_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id TEXT NOT NULL,
      payment_id TEXT,
      amount REAL DEFAULT 5.00,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default categories
  const categoriesList = [
    { name: 'Animal & Pets', slug: 'animal-pets' },
    { name: 'Art & Animation', slug: 'art-animation' },
    { name: 'ASMR & Satisfying', slug: 'asmr-satisfying' },
    { name: 'Comedy & Entertainment', slug: 'comedy-entertainment' },
    { name: 'DIY & Crafts', slug: 'diy-crafts' },
    { name: 'Emotional & Inspirational', slug: 'emotional-inspirational' },
    { name: 'Fantasy & Sci-Fi', slug: 'fantasy-scifi' },
    { name: 'Food & Cooking', slug: 'food-cooking' },
    { name: 'Historical & Nostalgia', slug: 'historical-nostalgia' },
    { name: 'Kids & Family', slug: 'kids-family' },
    { name: 'Nature & Wildlife', slug: 'nature-wildlife' },
    { name: 'Sports & Action', slug: 'sports-action' }
  ];

  for (const cat of categoriesList) {
    await run(
      `INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`,
      [cat.name, cat.slug]
    );
  }

  // Seed Users
  const samiHash = await bcrypt.hash('Sami1234!', 10);
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  // 1. User Sami (Active Premium Member)
  await run(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, role, membership_status, membership_expires_at)
    VALUES (1, 'sami', 'abdusami660@gmail.com', ?, 'user', 'premium', '2026-09-13 23:59:59')
  `, [samiHash]);

  // 2. Admin Shailendra Soni
  await run(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, role, membership_status, membership_expires_at)
    VALUES (2, 'Shailendra Soni', 'admin@navprompts.com', ?, 'admin', 'premium', '2030-01-01 00:00:00')
  `, [adminHash]);

  // 3. Demo Free User
  await run(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, role, membership_status, membership_expires_at)
    VALUES (3, 'Alex Demo (Free)', 'free@navprompts.com', ?, 'user', 'free', NULL)
  `, [userHash]);

  // Check if prompts need seeding
  const existingCount = await get(`SELECT COUNT(*) as cnt FROM prompts`);
  if (!existingCount || existingCount.cnt === 0) {
    console.log("Seeding prompts dataset...");
    await seedPrompts();
  }

  // Check if community posts need seeding
  const existingPosts = await get(`SELECT COUNT(*) as cnt FROM community_posts`);
  if (!existingPosts || existingPosts.cnt === 0) {
    console.log("Seeding community posts...");
    await seedCommunity();
  }
}

async function seedPrompts() {
  const datasetPath = 'C:/Users/ML/.gemini/antigravity-ide/brain/e71b4ae9-aa1d-449a-9f24-f80cf10adef3/scratch/prompts_dataset.json';
  if (!fs.existsSync(datasetPath)) {
    console.log("prompts_dataset.json not found, using fallback prompts.");
    return;
  }

  const raw = fs.readFileSync(datasetPath, 'utf8');
  const prompts = JSON.parse(raw);

  const thumbMapping = {
    '270': 'c7c5ce2f29fdf9f62e2a2545.png',
    '264': 'dbe9af5b03ccb2169b2cea73.png',
    '255': '1dbf63269502e5f615d2f447.png',
    '246': 'c37a412728d35e531481d227.png',
    '282': 'a2ede462c16c58f6d48211c0.png',
    '281': '926cf2e4733cbb24b7e059a2.png',
    '280': 'f0d86bb85606e86cd901a2fc.png',
    '279': '3f566f82167873056e28bc52.png',
    '278': '0fd79ae859b0e0be3d3bddd7.png',
    '277': '97f21cf388255071b8e19356.png',
    '276': 'e79fe608fdb1d406e8472ef6.png',
    '275': 'a2088fa661997ec76f927df3.png',
    '274': '83582f661461f3401b0d347c.png',
    '273': '87b8a05a29c0fbfc2fa46e74.png',
    '272': '69e1b66e6eb6084b90980125.png',
    '271': 'b38896d306fab2115c65f280.png'
  };

  const categoryMapping = {
    '270': 'Animal & Pets',
    '264': 'Art & Animation',
    '255': 'Art & Animation',
    '246': 'Comedy & Entertainment',
    '282': 'Emotional & Inspirational',
    '281': 'ASMR & Satisfying',
    '280': 'Nature & Wildlife',
    '279': 'Fantasy & Sci-Fi',
    '278': 'Fantasy & Sci-Fi',
    '277': 'Kids & Family',
    '276': 'Emotional & Inspirational',
    '275': 'Historical & Nostalgia',
    '274': 'Kids & Family',
    '273': 'Nature & Wildlife',
    '272': 'DIY & Crafts',
    '271': 'Food & Cooking'
  };

  const freeIds = new Set(['270', '264', '255', '246']);

  for (const item of prompts) {
    const pid = parseInt(item.id, 10);
    const title = item.title.replace(/&amp;/g, '&');
    const isFree = freeIds.has(String(item.id));
    const type = isFree ? 'free' : 'premium';
    const category = categoryMapping[String(item.id)] || 'General';
    const thumbFilename = thumbMapping[String(item.id)] || (item.storyboards[0] ? path.basename(item.storyboards[0].split('?')[0]) : '');
    const thumbnail = thumbFilename ? `/uploads/${thumbFilename}` : '';
    
    // Clean local paths for storyboards
    const cleanStoryboards = (item.storyboards || []).map(url => {
      const f = path.basename(url.split('?')[0]);
      return `/uploads/${f}`;
    });

    const teaser = item.teaser || `This ${type} prompt includes the complete master prompt system — full scene structure, camera angles, timing breakdown, captions, viral hooks and reference storyboard images. Everything is ready to copy and paste into your AI video tool (Seedance, Kling, Veo, Dreamina).`;

    await run(`
      INSERT INTO prompts (id, title, category, type, prompt_content, teaser, thumbnail, storyboards, views_count, copies_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pid,
      title,
      category,
      type,
      item.prompt_content,
      teaser,
      thumbnail,
      JSON.stringify(cleanStoryboards),
      Math.floor(Math.random() * 200) + 50,
      Math.floor(Math.random() * 80) + 20
    ]);
  }
  console.log(`Seeded ${prompts.length} prompts successfully!`);
}

async function seedCommunity() {
  const communityPath = 'C:/Users/ML/.gemini/antigravity-ide/brain/e71b4ae9-aa1d-449a-9f24-f80cf10adef3/scratch/community_dataset.json';
  if (!fs.existsSync(communityPath)) return;

  const raw = fs.readFileSync(communityPath, 'utf8');
  const posts = JSON.parse(raw);

  for (const p of posts) {
    const res = await run(`
      INSERT INTO community_posts (id, author, is_admin, content, likes)
      VALUES (?, ?, ?, ?, ?)
    `, [
      parseInt(p.id, 10),
      p.author,
      p.is_admin ? 1 : 0,
      p.content,
      p.likes || 0
    ]);

    for (const c of (p.comments || [])) {
      await run(`
        INSERT INTO community_comments (post_id, author, content)
        VALUES (?, ?, ?)
      `, [parseInt(p.id, 10), c.author, c.text]);
    }
  }
  console.log(`Seeded ${posts.length} community posts!`);
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
