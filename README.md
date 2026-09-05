# NavPrompts — Viral AI Video Prompts Platform

A high-performance full-stack web application modeled after **Soniprompts** (`https://soniprompts.com/`), built for viral AI video creators across YouTube Shorts, Instagram Reels, and TikTok.

---

## 🚀 Features

- **Prompt Library**: 16 real viral master prompts with storyboard references and tool compatibility badges (Seedance 2.5, Kling AI, Google Veo, Hailuo, Dreamina).
- **Access Gating**:
  - Free prompts are open to all visitors.
  - Premium prompts feature locked preview teasers for visitors and instant full master prompt access for active members.
- **Copy & Share Tools**: One-click "📋 Copy Master Prompt" with floating toast notifications and storyboard image downloads.
- **Community Social Hub**: Post composer with media attachments, likes counter, comments thread, and Creator verified badge (`Creator ✔`).
- **Subscription Simulation**: $5/month membership tier with interactive checkout modal and instant VIP upgrade.
- **User Authentication**: Secure cookie sessions, bcrypt password hashing, and user account dashboard with remaining membership days countdown.
- **Admin Panel**: Creator portal to publish new prompts, manage storyboard files, and moderate members.

---

## 🔑 Pre-Configured Accounts

| Account | Email | Password | Role & Status |
| :--- | :--- | :--- | :--- |
| **Sami** | `abdusami660@gmail.com` | `Sami1234!` | Active Premium Member (Valid until 13 Sep 2026) |
| **Shailendra Soni** | `admin@navprompts.com` | `admin123` | Administrator & VIP Creator |
| **Demo Free User** | `free@navprompts.com` | `user123` | Free Tier User (To test locked view) |

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, SQLite3, BcryptJS, Multer, Express-Session
- **Frontend**: Vanilla HTML5, Modern CSS (Glassmorphism, custom responsive tokens), Vanilla JS
- **Assets**: Locally served banners, creator avatar, and storyboard reference images

---

## 🏁 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run automated tests
npm test

# 3. Start development server
npm start
```

Visit the website at: **`http://localhost:3000`**
