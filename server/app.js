const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { db, run, get, all, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload storage
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'sami-prompts-secret-key-2026-super-secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Serve static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper middleware to get current user
async function getCurrentUser(req) {
  if (!req.session || !req.session.userId) return null;
  const user = await get(
    `SELECT id, name, email, role, membership_status, membership_expires_at, created_at FROM users WHERE id = ?`,
    [req.session.userId]
  );
  if (!user) return null;
  
  // Check if premium has expired
  if (user.membership_status === 'premium' && user.membership_expires_at) {
    const expiry = new Date(user.membership_expires_at);
    if (expiry < new Date()) {
      await run(`UPDATE users SET membership_status = 'free' WHERE id = ?`, [user.id]);
      user.membership_status = 'free';
    }
  }
  return user;
}

// ----------------------------------------------------
// AUTH API
// ----------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.userId = user.id;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membership_status: user.membership_status,
        membership_expires_at: user.membership_expires_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await get(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await run(
      `INSERT INTO users (name, email, password_hash, role, membership_status) VALUES (?, ?, ?, 'user', 'free')`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );

    req.session.userId = result.lastID;

    res.json({
      success: true,
      user: {
        id: result.lastID,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'user',
        membership_status: 'free',
        membership_expires_at: null
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    res.json({ user: user || null });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user session.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ----------------------------------------------------
// PROMPTS API
// ----------------------------------------------------

app.get('/api/prompts', async (req, res) => {
  try {
    const { q, type, sort, limit = 20, offset = 0 } = req.query;
    const cat = req.query.cat || req.query.category;
    let sql = `SELECT id, title, category, type, thumbnail, teaser, storyboards, views_count, copies_count, created_at FROM prompts WHERE 1=1`;
    const params = [];

    if (q) {
      sql += ` AND (title LIKE ? OR prompt_content LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (type && (type === 'free' || type === 'premium')) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    if (cat && cat !== 'all') {
      sql += ` AND category = ?`;
      params.push(cat);
    }

    // Sorting
    switch (sort) {
      case 'old':
        sql += ` ORDER BY id ASC`;
        break;
      case 'az':
        sql += ` ORDER BY title ASC`;
        break;
      case 'za':
        sql += ` ORDER BY title DESC`;
        break;
      case 'popular':
        sql += ` ORDER BY copies_count DESC, views_count DESC`;
        break;
      case 'new':
      default:
        sql += ` ORDER BY id DESC`;
        break;
    }

    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const prompts = await all(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM prompts WHERE 1=1`;
    const countParams = [];
    if (q) {
      countSql += ` AND (title LIKE ? OR prompt_content LIKE ?)`;
      countParams.push(`%${q}%`, `%${q}%`);
    }
    if (type && (type === 'free' || type === 'premium')) {
      countSql += ` AND type = ?`;
      countParams.push(type);
    }
    if (cat && cat !== 'all') {
      countSql += ` AND category = ?`;
      countParams.push(cat);
    }
    const countRow = await get(countSql, countParams);

    res.json({
      prompts: prompts.map(p => ({
        ...p,
        storyboards: p.storyboards ? JSON.parse(p.storyboards) : []
      })),
      total: countRow ? countRow.total : prompts.length,
      has_more: (parseInt(offset, 10) + prompts.length) < (countRow ? countRow.total : 0)
    });
  } catch (err) {
    console.error('Prompts list error:', err);
    res.status(500).json({ error: 'Failed to fetch prompts.' });
  }
});

app.get('/api/prompts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const prompt = await get(`SELECT * FROM prompts WHERE id = ?`, [id]);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found.' });
    }

    // Increment views
    await run(`UPDATE prompts SET views_count = views_count + 1 WHERE id = ?`, [id]);

    const user = await getCurrentUser(req);
    const isPremiumUser = user && user.membership_status === 'premium';
    const isUnlocked = prompt.type === 'free' || isPremiumUser;

    const storyboards = prompt.storyboards ? JSON.parse(prompt.storyboards) : [];

    // Gated response
    if (!isUnlocked) {
      return res.json({
        id: prompt.id,
        title: prompt.title,
        category: prompt.category,
        type: prompt.type,
        thumbnail: prompt.thumbnail,
        teaser: prompt.teaser,
        views_count: prompt.views_count + 1,
        copies_count: prompt.copies_count,
        created_at: prompt.created_at,
        is_unlocked: false,
        requires_membership: true,
        user_logged_in: !!user,
        prompt_content: null,
        storyboards: [] // hide full storyboard downloads if locked
      });
    }

    // Unlocked response
    res.json({
      id: prompt.id,
      title: prompt.title,
      category: prompt.category,
      type: prompt.type,
      thumbnail: prompt.thumbnail,
      teaser: prompt.teaser,
      prompt_content: prompt.prompt_content,
      storyboards,
      views_count: prompt.views_count + 1,
      copies_count: prompt.copies_count,
      created_at: prompt.created_at,
      is_unlocked: true,
      requires_membership: false,
      user_logged_in: !!user
    });
  } catch (err) {
    console.error('Prompt detail error:', err);
    res.status(500).json({ error: 'Failed to fetch prompt detail.' });
  }
});

app.post('/api/prompts/:id/copy', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await run(`UPDATE prompts SET copies_count = copies_count + 1 WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error updating copy count.' });
  }
});

// ----------------------------------------------------
// BOOKMARKS API
// ----------------------------------------------------

app.post('/api/prompts/:id/bookmark', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please login to save bookmarks.' });

    const promptId = parseInt(req.params.id, 10);
    const existing = await get(`SELECT id FROM bookmarks WHERE user_id = ? AND prompt_id = ?`, [user.id, promptId]);

    if (existing) {
      await run(`DELETE FROM bookmarks WHERE id = ?`, [existing.id]);
      res.json({ bookmarked: false });
    } else {
      await run(`INSERT INTO bookmarks (user_id, prompt_id) VALUES (?, ?)`, [user.id, promptId]);
      res.json({ bookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error toggling bookmark.' });
  }
});

app.get('/api/prompts/:id/is-bookmarked', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.json({ bookmarked: false });

    const promptId = parseInt(req.params.id, 10);
    const existing = await get(`SELECT id FROM bookmarks WHERE user_id = ? AND prompt_id = ?`, [user.id, promptId]);
    res.json({ bookmarked: !!existing });
  } catch (err) {
    res.json({ bookmarked: false });
  }
});

app.get('/api/bookmarks', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized.' });

    const prompts = await all(`
      SELECT p.id, p.title, p.category, p.type, p.thumbnail, p.teaser, p.created_at
      FROM bookmarks b
      JOIN prompts p ON b.prompt_id = p.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [user.id]);

    res.json({ prompts });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching bookmarks.' });
  }
});

// ----------------------------------------------------
// CATEGORIES API
// ----------------------------------------------------

app.get('/api/categories', async (req, res) => {
  try {
    const rows = await all(`
      SELECT c.name, c.slug, COUNT(p.id) as count
      FROM categories c
      LEFT JOIN prompts p ON c.name = p.category
      GROUP BY c.id
      ORDER BY count DESC, c.name ASC
    `);
    res.json({ categories: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// ----------------------------------------------------
// COMMUNITY API
// ----------------------------------------------------

app.get('/api/community/posts', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const posts = await all(`
      SELECT id, user_id, author, is_admin, content, media_url, likes, created_at
      FROM community_posts
      ORDER BY id DESC
    `);

    // Load comments and user like states
    for (const post of posts) {
      post.comments = await all(`
        SELECT id, author, content, created_at
        FROM community_comments
        WHERE post_id = ?
        ORDER BY id ASC
      `, [post.id]);

      if (user) {
        const hasLiked = await get(`SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?`, [post.id, user.id]);
        post.has_liked = !!hasLiked;
      } else {
        post.has_liked = false;
      }
    }

    res.json({ posts });
  } catch (err) {
    console.error('Community posts error:', err);
    res.status(500).json({ error: 'Failed to load community feed.' });
  }
});

app.post('/api/community/posts', upload.single('media'), async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const authorName = user ? user.name : (req.body.author_name || 'Community Member');
    const content = req.body.content;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const isAdmin = user && user.role === 'admin' ? 1 : 0;

    const result = await run(`
      INSERT INTO community_posts (user_id, author, is_admin, content, media_url, likes)
      VALUES (?, ?, ?, ?, ?, 0)
    `, [user ? user.id : null, authorName, isAdmin, content.trim(), mediaUrl]);

    res.json({
      success: true,
      post: {
        id: result.lastID,
        author: authorName,
        is_admin: isAdmin,
        content: content.trim(),
        media_url: mediaUrl,
        likes: 0,
        comments: [],
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

app.post('/api/community/posts/:id/like', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please login to like posts.' });

    const postId = parseInt(req.params.id, 10);
    const existing = await get(`SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?`, [postId, user.id]);

    if (existing) {
      await run(`DELETE FROM community_likes WHERE id = ?`, [existing.id]);
      await run(`UPDATE community_posts SET likes = MAX(0, likes - 1) WHERE id = ?`, [postId]);
      const updated = await get(`SELECT likes FROM community_posts WHERE id = ?`, [postId]);
      res.json({ liked: false, likes: updated.likes });
    } else {
      await run(`INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)`, [postId, user.id]);
      await run(`UPDATE community_posts SET likes = likes + 1 WHERE id = ?`, [postId]);
      const updated = await get(`SELECT likes FROM community_posts WHERE id = ?`, [postId]);
      res.json({ liked: true, likes: updated.likes });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error toggling like.' });
  }
});

app.post('/api/community/posts/:id/comments', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const author = user ? user.name : (req.body.author || 'Guest Member');
    const content = req.body.content;
    const postId = parseInt(req.params.id, 10);

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    const result = await run(`
      INSERT INTO community_comments (post_id, user_id, author, content)
      VALUES (?, ?, ?, ?)
    `, [postId, user ? user.id : null, author, content.trim()]);

    res.json({
      success: true,
      comment: {
        id: result.lastID,
        post_id: postId,
        author,
        content: content.trim(),
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error adding comment.' });
  }
});

// ----------------------------------------------------
// CHECKOUT & PAYMENT SIMULATION API
// ----------------------------------------------------

app.post('/api/checkout/create-order', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please login to subscribe.' });

    const orderId = 'order_' + Math.random().toString(36).substring(2, 12);
    res.json({
      success: true,
      order_id: orderId,
      amount: 999, // 999 PKR
      currency: 'PKR',
      user_name: user.name,
      user_email: user.email,
      key_id: 'rzp_live_simulated_key'
    });
  } catch (err) {
    res.status(500).json({ error: 'Order creation failed.' });
  }
});

app.post('/api/checkout/verify-payment', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please login to complete payment.' });

    const { order_id, payment_id } = req.body;
    const payId = payment_id || 'pay_' + Math.random().toString(36).substring(2, 14);

    // Calculate 30 days ahead
    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiryStr = expiry.toISOString().replace('T', ' ').substring(0, 19);

    // Record order
    await run(`
      INSERT INTO orders (user_id, order_id, payment_id, amount, currency, status)
      VALUES (?, ?, ?, 999, 'PKR', 'completed')
    `, [user.id, order_id || 'manual_order', payId]);

    // Activate membership
    await run(`
      UPDATE users SET membership_status = 'premium', membership_expires_at = ? WHERE id = ?
    `, [expiryStr, user.id]);

    res.json({
      success: true,
      message: 'Payment verified! Premium membership activated for 30 days.',
      membership_status: 'premium',
      membership_expires_at: expiryStr
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// ----------------------------------------------------
// LOCAL & INTERNATIONAL PAYMENT GATEWAYS (EasyPaisa, SadaPay, Meezan Bank)
// ----------------------------------------------------

// Get public payment settings and account numbers
app.get('/api/payment/settings', async (req, res) => {
  try {
    const rows = await all(`SELECT key, value FROM payment_settings`);
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payment settings' });
  }
});

// Submit manual payment proof (EasyPaisa / SadaPay / Meezan)
app.post('/api/payment/submit', upload.single('screenshot'), async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Please login to submit payment.' });

    const { payment_method, transaction_id, sender_name, sender_number, notes } = req.body;

    if (!payment_method || !transaction_id) {
      return res.status(400).json({ error: 'Payment method and Transaction ID (TID) are required.' });
    }

    // Get current PKR price
    const priceRow = await get(`SELECT value FROM payment_settings WHERE key = 'price_pkr'`);
    const price = priceRow ? parseFloat(priceRow.value) : 999;

    const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await run(`
      INSERT INTO payment_requests (user_id, user_name, user_email, payment_method, amount, currency, sender_name, sender_number, transaction_id, screenshot_url, notes, status)
      VALUES (?, ?, ?, ?, ?, 'PKR', ?, ?, ?, ?, ?, 'pending')
    `, [
      user.id,
      user.name,
      user.email,
      payment_method,
      price,
      sender_name || user.name,
      sender_number || '',
      transaction_id.trim(),
      screenshotUrl,
      notes || ''
    ]);

    res.json({
      success: true,
      request_id: result.lastID,
      message: 'Payment proof submitted successfully! Your VIP access will be activated shortly after verification.'
    });
  } catch (err) {
    console.error('Payment submit error:', err);
    res.status(500).json({ error: 'Failed to submit payment proof.' });
  }
});

// Get user payment history
app.get('/api/payment/my-requests', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Login required.' });

    const requests = await all(
      `SELECT * FROM payment_requests WHERE user_id = ? ORDER BY created_at DESC`,
      [user.id]
    );
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history.' });
  }
});

// Admin: List all payment requests
app.get('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const payments = await all(`
      SELECT p.*, u.email as current_user_email, u.membership_status, u.membership_expires_at 
      FROM payment_requests p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY 
        CASE p.status WHEN 'pending' THEN 1 ELSE 2 END,
        p.created_at DESC
    `);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// Admin: Approve payment request & activate VIP
app.post('/api/admin/payments/:id/approve', requireAdmin, async (req, res) => {
  try {
    const payment = await get(`SELECT * FROM payment_requests WHERE id = ?`, [req.params.id]);
    if (!payment) return res.status(404).json({ error: 'Payment request not found.' });

    const user = await get(`SELECT * FROM users WHERE id = ?`, [payment.user_id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Calculate 30 days extension
    let baseTime = new Date();
    if (user.membership_status === 'premium' && user.membership_expires_at) {
      const currentExpiry = new Date(user.membership_expires_at);
      if (currentExpiry > baseTime) {
        baseTime = currentExpiry;
      }
    }
    const newExpiry = new Date(baseTime.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiryStr = newExpiry.toISOString().replace('T', ' ').substring(0, 19);

    // Update payment request
    await run(`
      UPDATE payment_requests 
      SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, admin_notes = ? 
      WHERE id = ?
    `, [req.body.admin_notes || 'Approved by Admin', payment.id]);

    // Update user to premium
    await run(`
      UPDATE users SET membership_status = 'premium', membership_expires_at = ? WHERE id = ?
    `, [expiryStr, user.id]);

    // Record in orders table
    await run(`
      INSERT INTO orders (user_id, order_id, payment_id, amount, currency, status)
      VALUES (?, ?, ?, ?, ?, 'completed')
    `, [user.id, `manual_${payment.id}`, payment.transaction_id, payment.amount, payment.currency]);

    res.json({
      success: true,
      message: `Payment approved! VIP membership for ${user.email} activated until ${expiryStr}.`,
      membership_expires_at: expiryStr
    });
  } catch (err) {
    console.error('Payment approval error:', err);
    res.status(500).json({ error: 'Failed to approve payment.' });
  }
});

// Admin: Reject payment request
app.post('/api/admin/payments/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { admin_notes } = req.body;
    await run(`
      UPDATE payment_requests 
      SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP, admin_notes = ? 
      WHERE id = ?
    `, [admin_notes || 'Invalid transaction ID or payment not received.', req.params.id]);

    res.json({ success: true, message: 'Payment request marked as rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject payment.' });
  }
});

// Admin: Update Payment Settings
app.put('/api/admin/payment-settings', requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await run(`INSERT OR REPLACE INTO payment_settings (key, value) VALUES (?, ?)`, [key, String(value)]);
    }
    res.json({ success: true, message: 'Payment settings updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payment settings.' });
  }
});

// ----------------------------------------------------
// SOCIAL MEDIA PORTFOLIO & ANALYTICS API
// ----------------------------------------------------

const PLATFORM_COLORS = {
  tiktok: '#00F2FE',
  youtube: '#FF0000',
  instagram: '#E1306C',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  x: '#FFFFFF',
  linkedin: '#0A66C2',
  pinterest: '#E60023',
  twitch: '#9146FF',
  threads: '#10B981',
  custom: '#6366F1'
};

function generateDefaultHistory(currentFollowers) {
  const months = ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'];
  const cur = parseInt(currentFollowers, 10) || 1000;
  const ratios = [0.65, 0.72, 0.80, 0.87, 0.94, 1.0];
  return months.map((month, idx) => ({
    month,
    followers: Math.round(cur * ratios[idx])
  }));
}

// 1. Get all social accounts + high-level omnichannel metrics
app.get('/api/portfolio', async (req, res) => {
  try {
    const accounts = await all(`
      SELECT * FROM social_accounts 
      ORDER BY followers_count DESC, id ASC
    `);

    let totalFollowers = 0;
    let totalViews = 0;
    let totalPosts = 0;
    let totalEngagement = 0;
    let activeCount = 0;

    const formatted = accounts.map(acc => {
      let hist = [];
      try {
        hist = typeof acc.history === 'string' ? JSON.parse(acc.history) : (acc.history || []);
      } catch (e) {
        hist = generateDefaultHistory(acc.followers_count);
      }

      totalFollowers += Number(acc.followers_count || 0);
      totalViews += Number(acc.total_views || 0);
      totalPosts += Number(acc.posts_count || 0);
      totalEngagement += Number(acc.engagement_rate || 0);
      if (acc.status === 'active') activeCount++;

      const goal = Number(acc.goal_target) || 100000;
      const progressPercent = Math.min(100, Math.round(((acc.followers_count || 0) / goal) * 100));

      return {
        ...acc,
        history: hist,
        goal_progress: progressPercent,
        color: PLATFORM_COLORS[acc.platform.toLowerCase()] || '#6366F1'
      };
    });

    const avgEngagement = accounts.length > 0 
      ? Number((totalEngagement / accounts.length).toFixed(2)) 
      : 0;

    const metrics = {
      total_accounts: accounts.length,
      active_accounts: activeCount,
      total_followers: totalFollowers,
      total_views: totalViews,
      total_posts: totalPosts,
      avg_engagement: avgEngagement,
      top_platform: accounts.length > 0 ? accounts[0].platform : null
    };

    res.json({
      success: true,
      metrics,
      accounts: formatted
    });
  } catch (err) {
    console.error('Error fetching social portfolio:', err);
    res.status(500).json({ error: 'Failed to fetch social media portfolio.' });
  }
});

// 2. Dedicated Analytics endpoint for Chart.js
app.get('/api/portfolio/analytics', async (req, res) => {
  try {
    const accounts = await all(`
      SELECT * FROM social_accounts 
      ORDER BY followers_count DESC
    `);

    const months = ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'];
    
    // Build datasets for growth timeline
    const datasets = accounts.map(acc => {
      let hist = [];
      try {
        hist = typeof acc.history === 'string' ? JSON.parse(acc.history) : (acc.history || []);
      } catch (e) {
        hist = generateDefaultHistory(acc.followers_count);
      }

      const dataMap = {};
      hist.forEach(h => { dataMap[h.month] = h.followers; });
      const data = months.map(m => dataMap[m] !== undefined ? dataMap[m] : (acc.followers_count || 0));

      return {
        label: acc.account_name || acc.platform,
        platform: acc.platform,
        color: PLATFORM_COLORS[acc.platform.toLowerCase()] || '#6366F1',
        data
      };
    });

    const aggregateGrowth = months.map((m, idx) => {
      return datasets.reduce((sum, ds) => sum + (ds.data[idx] || 0), 0);
    });

    const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers_count || 0), 0);
    const platformShare = accounts.map(acc => ({
      platform: acc.platform,
      name: acc.account_name,
      followers: acc.followers_count,
      percentage: totalFollowers > 0 ? Number(((acc.followers_count / totalFollowers) * 100).toFixed(1)) : 0,
      color: PLATFORM_COLORS[acc.platform.toLowerCase()] || '#6366F1'
    }));

    const viewsBreakdown = accounts.map(acc => ({
      platform: acc.platform,
      name: acc.account_name,
      views: acc.total_views || 0,
      posts: acc.posts_count || 0,
      avg_views_per_post: acc.posts_count > 0 ? Math.round((acc.total_views || 0) / acc.posts_count) : 0,
      color: PLATFORM_COLORS[acc.platform.toLowerCase()] || '#6366F1'
    }));

    res.json({
      success: true,
      months,
      growthTimeline: {
        months,
        datasets,
        aggregateGrowth
      },
      platformShare,
      viewsBreakdown
    });
  } catch (err) {
    console.error('Analytics endpoint error:', err);
    res.status(500).json({ error: 'Failed to generate analytics data.' });
  }
});

// 3. Create new social media account
app.post('/api/portfolio', async (req, res) => {
  try {
    const {
      platform,
      account_name,
      handle,
      profile_url,
      followers_count = 0,
      following_count = 0,
      posts_count = 0,
      total_views = 0,
      engagement_rate = 0,
      category = 'Content Creator',
      goal_target = 100000,
      monthly_growth = '+5.0%',
      status = 'active',
      notes = '',
      history
    } = req.body;

    if (!platform || !account_name || !profile_url) {
      return res.status(400).json({ error: 'Platform, Account Name, and Profile URL are required.' });
    }

    const cleanPlatform = platform.toLowerCase().trim();
    const cleanHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : `@${account_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const fCount = parseInt(followers_count, 10) || 0;
    const flwCount = parseInt(following_count, 10) || 0;
    const pCount = parseInt(posts_count, 10) || 0;
    const vCount = parseInt(total_views, 10) || 0;
    const engRate = parseFloat(engagement_rate) || 0.0;
    const gTarget = parseInt(goal_target, 10) || 100000;

    let histJson = '';
    if (history) {
      histJson = typeof history === 'string' ? history : JSON.stringify(history);
    } else {
      histJson = JSON.stringify(generateDefaultHistory(fCount));
    }

    const result = await run(`
      INSERT INTO social_accounts (
        user_id, platform, account_name, handle, profile_url,
        followers_count, following_count, posts_count, total_views,
        engagement_rate, category, goal_target, monthly_growth,
        status, notes, history
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanPlatform,
      account_name.trim(),
      cleanHandle.trim(),
      profile_url.trim(),
      fCount,
      flwCount,
      pCount,
      vCount,
      engRate,
      category.trim(),
      gTarget,
      monthly_growth.trim(),
      status,
      notes ? notes.trim() : '',
      histJson
    ]);

    const created = await get(`SELECT * FROM social_accounts WHERE id = ?`, [result.lastID]);
    res.json({
      success: true,
      message: 'Social account added successfully!',
      account: {
        ...created,
        history: JSON.parse(created.history || '[]'),
        color: PLATFORM_COLORS[created.platform.toLowerCase()] || '#6366F1'
      }
    });
  } catch (err) {
    console.error('Error creating social account:', err);
    res.status(500).json({ error: 'Failed to create social account.' });
  }
});

// 4. Update existing social media account
app.put('/api/portfolio/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await get(`SELECT * FROM social_accounts WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const {
      platform = existing.platform,
      account_name = existing.account_name,
      handle = existing.handle,
      profile_url = existing.profile_url,
      followers_count = existing.followers_count,
      following_count = existing.following_count,
      posts_count = existing.posts_count,
      total_views = existing.total_views,
      engagement_rate = existing.engagement_rate,
      category = existing.category,
      goal_target = existing.goal_target,
      monthly_growth = existing.monthly_growth,
      status = existing.status,
      notes = existing.notes,
      history
    } = req.body;

    const fCount = parseInt(followers_count, 10) || 0;
    let histJson = existing.history;
    if (history) {
      histJson = typeof history === 'string' ? history : JSON.stringify(history);
    } else if (fCount !== existing.followers_count) {
      try {
        const parsed = JSON.parse(existing.history || '[]');
        if (parsed.length > 0) {
          parsed[parsed.length - 1].followers = fCount;
          histJson = JSON.stringify(parsed);
        } else {
          histJson = JSON.stringify(generateDefaultHistory(fCount));
        }
      } catch (e) {
        histJson = JSON.stringify(generateDefaultHistory(fCount));
      }
    }

    await run(`
      UPDATE social_accounts SET
        platform = ?,
        account_name = ?,
        handle = ?,
        profile_url = ?,
        followers_count = ?,
        following_count = ?,
        posts_count = ?,
        total_views = ?,
        engagement_rate = ?,
        category = ?,
        goal_target = ?,
        monthly_growth = ?,
        status = ?,
        notes = ?,
        history = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      platform.toLowerCase().trim(),
      account_name.trim(),
      handle.trim(),
      profile_url.trim(),
      fCount,
      parseInt(following_count, 10) || 0,
      parseInt(posts_count, 10) || 0,
      parseInt(total_views, 10) || 0,
      parseFloat(engagement_rate) || 0.0,
      category.trim(),
      parseInt(goal_target, 10) || 100000,
      monthly_growth.trim(),
      status,
      notes ? notes.trim() : '',
      histJson,
      id
    ]);

    const updated = await get(`SELECT * FROM social_accounts WHERE id = ?`, [id]);
    res.json({
      success: true,
      message: 'Account updated successfully!',
      account: {
        ...updated,
        history: JSON.parse(updated.history || '[]'),
        color: PLATFORM_COLORS[updated.platform.toLowerCase()] || '#6366F1'
      }
    });
  } catch (err) {
    console.error('Error updating social account:', err);
    res.status(500).json({ error: 'Failed to update social account.' });
  }
});

// 5. Delete social account
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await get(`SELECT id FROM social_accounts WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    await run(`DELETE FROM social_accounts WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Error deleting social account:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// ----------------------------------------------------
// ADMIN API
// ----------------------------------------------------

async function requireAdmin(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const promptsCount = await get(`SELECT COUNT(*) as count, SUM(views_count) as views, SUM(copies_count) as copies FROM prompts`);
    const catsCount = await get(`SELECT COUNT(*) as count FROM categories`);
    const usersCount = await get(`SELECT COUNT(*) as count FROM users`);
    const postsCount = await get(`SELECT COUNT(*) as count FROM community_posts`);

    res.json({
      totalPrompts: promptsCount.count || 0,
      totalViews: promptsCount.views || 0,
      totalCopies: promptsCount.copies || 0,
      totalCategories: catsCount.count || 0,
      totalUsers: usersCount.count || 0,
      totalPosts: postsCount.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

app.post('/api/admin/prompts', requireAdmin, upload.array('storyboard_files', 8), async (req, res) => {
  try {
    const { title, category, type = 'premium', prompt_content, teaser, custom_category } = req.body;
    if (!title || !prompt_content) {
      return res.status(400).json({ error: 'Title and prompt content are required.' });
    }

    let finalCategory = (category || 'General').trim();
    if (custom_category && custom_category.trim()) {
      finalCategory = custom_category.trim();
      const slug = finalCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await run(`INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`, [finalCategory, slug]);
    }

    const storyboards = (req.files || []).map(f => `/uploads/${f.filename}`);
    const thumbnail = storyboards[0] || (req.body.thumbnail || '/assets/img/cover.jpg');

    const result = await run(`
      INSERT INTO prompts (title, category, type, prompt_content, teaser, thumbnail, storyboards, views_count, copies_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
    `, [
      title.trim(),
      finalCategory,
      type,
      prompt_content.trim(),
      teaser ? teaser.trim() : `Master viral AI prompt for ${title.trim()}. Includes full timing, camera shots, and negative prompts.`,
      thumbnail,
      JSON.stringify(storyboards)
    ]);

    res.json({ success: true, prompt_id: result.lastID });
  } catch (err) {
    console.error('Create prompt error:', err);
    res.status(500).json({ error: 'Failed to create prompt.' });
  }
});

app.get('/api/admin/prompts/:id', requireAdmin, async (req, res) => {
  try {
    const prompt = await get(`SELECT * FROM prompts WHERE id = ?`, [parseInt(req.params.id, 10)]);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    prompt.storyboards = prompt.storyboards ? JSON.parse(prompt.storyboards) : [];
    res.json({ prompt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prompt.' });
  }
});

app.put('/api/admin/prompts/:id', requireAdmin, upload.array('storyboard_files', 8), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await get(`SELECT * FROM prompts WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Prompt not found.' });

    const { title, category, type, prompt_content, teaser, custom_category } = req.body;
    let finalCategory = (category || existing.category).trim();
    if (custom_category && custom_category.trim()) {
      finalCategory = custom_category.trim();
      const slug = finalCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await run(`INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`, [finalCategory, slug]);
    }

    let storyboards = existing.storyboards ? JSON.parse(existing.storyboards) : [];
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/${f.filename}`);
      storyboards = [...storyboards, ...newImages];
    }
    const thumbnail = storyboards[0] || existing.thumbnail;

    await run(`
      UPDATE prompts
      SET title = ?, category = ?, type = ?, prompt_content = ?, teaser = ?, thumbnail = ?, storyboards = ?
      WHERE id = ?
    `, [
      title ? title.trim() : existing.title,
      finalCategory,
      type || existing.type,
      prompt_content ? prompt_content.trim() : existing.prompt_content,
      teaser ? teaser.trim() : existing.teaser,
      thumbnail,
      JSON.stringify(storyboards),
      id
    ]);

    res.json({ success: true, message: 'Prompt updated successfully!' });
  } catch (err) {
    console.error('Update prompt error:', err);
    res.status(500).json({ error: 'Failed to update prompt.' });
  }
});

app.patch('/api/admin/prompts/:id/toggle-type', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const prompt = await get(`SELECT type FROM prompts WHERE id = ?`, [id]);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

    const newType = prompt.type === 'free' ? 'premium' : 'free';
    await run(`UPDATE prompts SET type = ? WHERE id = ?`, [newType, id]);
    res.json({ success: true, new_type: newType });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle prompt type.' });
  }
});

app.delete('/api/admin/prompts/:id', requireAdmin, async (req, res) => {
  try {
    await run(`DELETE FROM prompts WHERE id = ?`, [parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete prompt.' });
  }
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required.' });

    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await run(`INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`, [cleanName, slug]);
    const cat = await get(`SELECT * FROM categories WHERE slug = ?`, [slug]);
    res.json({ success: true, category: cat, id: cat ? cat.id : null, name: cleanName, slug });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    await run(`DELETE FROM categories WHERE id = ?`, [parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

app.delete('/api/admin/community/posts/:id', requireAdmin, async (req, res) => {
  try {
    await run(`DELETE FROM community_posts WHERE id = ?`, [parseInt(req.params.id, 10)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete community post.' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await all(`SELECT id, name, email, role, membership_status, membership_expires_at, created_at FROM users ORDER BY id DESC`);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

// ----------------------------------------------------
// PAGE ROUTING & HTML FALLBACKS
// ----------------------------------------------------

const publicDir = path.join(__dirname, '..', 'public');

app.get(['/', '/index.php'], (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get(['/browse', '/browse.php'], (req, res) => res.sendFile(path.join(publicDir, 'browse.html')));
app.get(['/prompt', '/prompt.php'], (req, res) => res.sendFile(path.join(publicDir, 'prompt.html')));
app.get(['/community', '/community.php'], (req, res) => res.sendFile(path.join(publicDir, 'community.html')));
app.get(['/portfolio', '/portfolio.html', '/portfolio.php', '/social-portfolio'], (req, res) => res.sendFile(path.join(publicDir, 'portfolio.html')));
app.get(['/pricing', '/pricing.php'], (req, res) => res.sendFile(path.join(publicDir, 'pricing.html')));
app.get(['/account', '/account.php'], (req, res) => res.sendFile(path.join(publicDir, 'account.html')));
app.get(['/login', '/login.php'], (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get(['/register', '/register.php'], (req, res) => res.sendFile(path.join(publicDir, 'register.html')));
app.get(['/admin', '/admin.php'], (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
app.get(['/contact', '/contact.php'], (req, res) => res.sendFile(path.join(publicDir, 'contact.html')));
app.get(['/terms', '/terms.php'], (req, res) => res.sendFile(path.join(publicDir, 'terms.html')));
app.get(['/privacy', '/privacy.php'], (req, res) => res.sendFile(path.join(publicDir, 'privacy.html')));
app.get(['/refund', '/refund.php'], (req, res) => res.sendFile(path.join(publicDir, 'refund.html')));

// Fallback for clean 404 or index
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

// Start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Sami Prompts Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Fatal DB error on startup:', err);
});

module.exports = app;
