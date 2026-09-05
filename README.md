# Sami Prompts — Viral AI Video Prompts Platform & Admin Studio

A high-performance full-stack web application custom-built for **Sami** to organize, curate, and publish viral AI video prompts (Seedance 2.0, Kling AI, Google Veo, Hailuo, Runway Gen-3).

Modeled after modern prompt discovery portals like Soniprompts, **Sami Prompts** is equipped with a comprehensive **Admin Studio & Control Center** where Sami can create prompts, categorize them, upload multi-frame storyboards, toggle free vs. VIP tiers, and manage community posts.

---

## 🚀 Key Features

### 👑 1. Sami's Admin Studio (`/admin`)
- **Category-Based Prompt Publishing**: Select an existing category or create a custom category on the fly.
- **Master Prompt Composer**: Write rich formatted prompts with timing, camera lenses, lighting, and negative prompts.
- **Quick Template Injectors**: 1-click buttons to inject:
  - ⏱️ *11-Shot Timing Grid*
  - 🎥 *Cinematic Lens Ladder (24mm, 50mm, 85mm)*
  - 📐 *Overlay & Aspect Specs*
  - 🎵 *Audio & Foley Specs*
  - 🚫 *Negative Prompt Safety Block*
- **Storyboard Multi-Uploader**: Drag-and-drop or pick up to 8 storyboard images.
- **Instant Free / Premium Switch**: 1-click toggle to set prompts to Free (publicly viewable) or VIP (gated).
- **Prompt Library Management**: Live search, inline edit modal, and prompt deletion.
- **Category Manager**: Add, inspect, and delete categories with auto-slug generation.
- **Community Moderation**: Delete unwanted posts directly from the admin panel.
- **Live Creator Metrics**: Real-time stats for Total Prompts, Categories, Cumulative Views, and Prompt Copies.

### 🌐 2. Public & Member Features
- **Curated Prompt Feeds**: Hero slider with 6 banners, category pills, and search filters.
- **Prompt Detail Pages (`/prompt?id=...`)**:
  - Gated access: Free prompts are open to all; VIP prompts are locked with preview teasers for visitors and unlocked for active members.
  - One-click **"📋 Copy Master Prompt"** with toast notifications.
  - Interactive **Storyboard Lightbox** with full-resolution zoom and download buttons.
- **Social Corner / Community (`/community`)**:
  - Community post creator with media previews.
  - Interactive like and comment counter.
  - Verified **Creator ✔** badge on Sami's posts.
- **Membership & Pricing (`/pricing`)**:
  - $5/month VIP membership plan.
  - Realistic interactive checkout simulation modal with instant VIP activation.
- **Account Hub (`/account`)**:
  - Live countdown of remaining VIP membership days.
  - Saved bookmarks list.
  - Quick link to the Admin Studio for admin accounts.

---

## 🔑 Configured Accounts

| Account | Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **Sami (Owner & Super Admin)** | `abdusami660@gmail.com` | `Sami1234!` | **Admin + VIP Creator** (Full control over Admin Studio, prompt creation, categories, and moderation) |
| **Demo Free User** | `free@samiprompts.com` | `user123` | **Free Tier User** (Can browse free prompts, sees locked teaser for VIP prompts) |

> 💡 **Quick Login Tip**: On the `/login` page, click the **"⚡ Fill Sami Credentials"** button to auto-fill `abdusami660@gmail.com` and log in instantly.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js & Express
- **Database**: SQLite3 (`database.sqlite`) with tables: `users`, `categories`, `prompts`, `community_posts`, `community_comments`, `community_likes`, `bookmarks`, `orders`.
- **Authentication**: `express-session`, HTTP-only cookies, `bcryptjs` password hashing.
- **Uploads**: `multer` for storyboard media files stored under `/uploads/`.
- **Frontend**: Vanilla HTML5, semantic modern CSS3 (soft-purple dark/light accents, glassmorphism), vanilla JS.
- **Test Suite**: Native Node test assertions (`test/verify.js`) covering static routes, access gating, auth, and complete admin CRUD.

---

## 🏁 Quick Start & Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (14 assertions)
npm test

# 3. Start the server
npm start
```

Open your browser at:
👉 **`http://localhost:3000`**

### Direct Navigation Links
- **Homepage**: `http://localhost:3000/`
- **Browse Prompts**: `http://localhost:3000/browse`
- **Admin Studio**: `http://localhost:3000/admin` *(Requires login as Sami)*
- **Community Feed**: `http://localhost:3000/community`
- **Pricing**: `http://localhost:3000/pricing`
- **Login**: `http://localhost:3000/login`
- **Account**: `http://localhost:3000/account`
