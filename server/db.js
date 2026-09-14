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
  const userHash = await bcrypt.hash('user123', 10);

  // 1. User Sami (Super Admin & Platform Creator)
  await run(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, role, membership_status, membership_expires_at)
    VALUES (1, 'Sami', 'abdusami660@gmail.com', ?, 'admin', 'premium', '2030-01-01 00:00:00')
  `, [samiHash]);

  // 2. Demo Free User (for testing visitor/free view)
  await run(`
    INSERT OR REPLACE INTO users (id, name, email, password_hash, role, membership_status, membership_expires_at)
    VALUES (2, 'Demo Visitor (Free)', 'free@samiprompts.com', ?, 'user', 'free', NULL)
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

  // Check if social_accounts table exists and seed if empty
  await run(`
    CREATE TABLE IF NOT EXISTS social_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      handle TEXT NOT NULL,
      profile_url TEXT NOT NULL,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      posts_count INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      engagement_rate REAL DEFAULT 0.0,
      category TEXT DEFAULT 'AI Video & Prompts',
      goal_target INTEGER DEFAULT 100000,
      monthly_growth INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      notes TEXT,
      history TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existingSocial = await get(`SELECT COUNT(*) as cnt FROM social_accounts`);
  if (!existingSocial || existingSocial.cnt === 0) {
    console.log("Seeding initial social accounts portfolio...");
    await seedSocialAccounts();
  }
}

async function seedPrompts() {
  const datasetPath = path.join(__dirname, 'prompts_dataset_full.json');
  if (!fs.existsSync(datasetPath)) {
    console.log("prompts_dataset_full.json not found, skipping seeding.");
    return;
  }

  const raw = fs.readFileSync(datasetPath, 'utf8');
  const prompts = JSON.parse(raw);

  for (const item of prompts) {
    const pid = parseInt(item.id, 10);
    const title = (item.title || `Prompt #${pid}`).replace(/&amp;/g, '&');
    const type = item.type || 'premium';
    const category = item.category || 'General';
    const thumbnail = item.thumbnail || '';
    const storyboards = Array.isArray(item.storyboards) ? item.storyboards : [];
    const teaser = item.teaser || `This ${type} prompt includes the complete master prompt system — full scene structure, camera angles, timing breakdown, captions, viral hooks and reference storyboard images. Everything is ready to copy and paste into your AI video tool (Seedance, Kling, Veo, Dreamina).`;

    await run(`
      INSERT OR REPLACE INTO prompts (id, title, category, type, prompt_content, teaser, thumbnail, storyboards, views_count, copies_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pid,
      title,
      category,
      type,
      item.prompt_content,
      teaser,
      thumbnail,
      JSON.stringify(storyboards),
      Math.floor(Math.random() * 200) + 50,
      Math.floor(Math.random() * 80) + 20
    ]);
  }
  console.log(`Seeded ${prompts.length} prompts successfully!`);
}

async function seedCommunity() {
  const communityPath = path.join(__dirname, 'community_dataset.json');
  if (!fs.existsSync(communityPath)) return;

  const raw = fs.readFileSync(communityPath, 'utf8');
  const posts = JSON.parse(raw);

  for (const p of posts) {
    const authorName = p.is_admin ? 'Sami' : p.author;
    const res = await run(`
      INSERT INTO community_posts (id, author, is_admin, content, likes)
      VALUES (?, ?, ?, ?, ?)
    `, [
      parseInt(p.id, 10),
      authorName,
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

async function seedSocialAccounts() {
  const defaultAccounts = [
    {
      platform: 'tiktok',
      account_name: 'Sami Prompts TikTok',
      handle: '@samiprompts',
      profile_url: 'https://www.tiktok.com/@samiprompts',
      followers_count: 384500,
      following_count: 142,
      posts_count: 186,
      total_views: 12400000,
      engagement_rate: 6.8,
      category: 'Viral AI Videos',
      goal_target: 500000,
      monthly_growth: 32000,
      status: 'growing',
      notes: 'Primary short-form viral funnel for Kling & Seedance 2.0 prompts.',
      history: JSON.stringify([
        { month: 'Apr', followers: 210000, views: 5200000 },
        { month: 'May', followers: 255000, views: 6800000 },
        { month: 'Jun', followers: 298000, views: 8400000 },
        { month: 'Jul', followers: 332000, views: 9900000 },
        { month: 'Aug', followers: 361000, views: 11200000 },
        { month: 'Sep', followers: 384500, views: 12400000 }
      ])
    },
    {
      platform: 'youtube',
      account_name: 'Sami AI Cinema',
      handle: '@samiprompts',
      profile_url: 'https://www.youtube.com/@samiprompts',
      followers_count: 94200,
      following_count: 65,
      posts_count: 92,
      total_views: 6800000,
      engagement_rate: 5.4,
      category: 'Cinematic Tutorials',
      goal_target: 100000,
      monthly_growth: 8400,
      status: 'active',
      notes: 'Targeting 100K Silver Creator Award milestone by Q4.',
      history: JSON.stringify([
        { month: 'Apr', followers: 54000, views: 3100000 },
        { month: 'May', followers: 62500, views: 3900000 },
        { month: 'Jun', followers: 71000, views: 4700000 },
        { month: 'Jul', followers: 79200, views: 5400000 },
        { month: 'Aug', followers: 87100, views: 6100000 },
        { month: 'Sep', followers: 94200, views: 6800000 }
      ])
    },
    {
      platform: 'instagram',
      account_name: 'Sami Prompts Studio',
      handle: '@sami.prompts',
      profile_url: 'https://www.instagram.com/sami.prompts',
      followers_count: 48600,
      following_count: 310,
      posts_count: 124,
      total_views: 2400000,
      engagement_rate: 4.9,
      category: 'Reels & Storyboards',
      goal_target: 500000,
      monthly_growth: 4200,
      status: 'active',
      notes: 'Showcasing 4K storyboard image packs and prompt carousels.',
      history: JSON.stringify([
        { month: 'Apr', followers: 28000, views: 1100000 },
        { month: 'May', followers: 32400, views: 1350000 },
        { month: 'Jun', followers: 36800, views: 1650000 },
        { month: 'Jul', followers: 41200, views: 1900000 },
        { month: 'Aug', followers: 45100, views: 2150000 },
        { month: 'Sep', followers: 48600, views: 2400000 }
      ])
    },
    {
      platform: 'facebook',
      account_name: 'Sami AI Video Creators',
      handle: 'SamiPromptsOfficial',
      profile_url: 'https://www.facebook.com/som.soni.965',
      followers_count: 29400,
      following_count: 45,
      posts_count: 88,
      total_views: 1100000,
      engagement_rate: 3.8,
      category: 'Creator Community',
      goal_target: 50000,
      monthly_growth: 2100,
      status: 'active',
      notes: 'Facebook page and group for AI video makers.',
      history: JSON.stringify([
        { month: 'Apr', followers: 18000, views: 550000 },
        { month: 'May', followers: 20500, views: 680000 },
        { month: 'Jun', followers: 23100, views: 800000 },
        { month: 'Jul', followers: 25400, views: 910000 },
        { month: 'Aug', followers: 27500, views: 1010000 },
        { month: 'Sep', followers: 29400, views: 1100000 }
      ])
    },
    {
      platform: 'twitter',
      account_name: 'Sami AI Prompts',
      handle: '@samiai_prompts',
      profile_url: 'https://twitter.com/samiai_prompts',
      followers_count: 16800,
      following_count: 215,
      posts_count: 420,
      total_views: 890000,
      engagement_rate: 4.2,
      category: 'AI News & Drops',
      goal_target: 25000,
      monthly_growth: 1500,
      status: 'active',
      notes: 'Fast prompt updates, viral video breakdowns, and AI tool announcements.',
      history: JSON.stringify([
        { month: 'Apr', followers: 9800, views: 420000 },
        { month: 'May', followers: 11200, views: 510000 },
        { month: 'Jun', followers: 12600, views: 600000 },
        { month: 'Jul', followers: 14100, views: 710000 },
        { month: 'Aug', followers: 15500, views: 800000 },
        { month: 'Sep', followers: 16800, views: 890000 }
      ])
    }
  ];

  for (const acc of defaultAccounts) {
    await run(`
      INSERT INTO social_accounts (
        user_id, platform, account_name, handle, profile_url,
        followers_count, following_count, posts_count, total_views,
        engagement_rate, category, goal_target, monthly_growth,
        status, notes, history
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      acc.platform, acc.account_name, acc.handle, acc.profile_url,
      acc.followers_count, acc.following_count, acc.posts_count, acc.total_views,
      acc.engagement_rate, acc.category, acc.goal_target, acc.monthly_growth,
      acc.status, acc.notes, acc.history
    ]);
  }
  console.log(`Seeded ${defaultAccounts.length} social accounts into portfolio!`);
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
