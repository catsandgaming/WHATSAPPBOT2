# 🤖 Extreme Mod Bot

WhatsApp group moderation bot using Baileys.

---

## ⚠️ Why NOT Netlify?
Netlify only hosts **static websites**. This bot needs a **persistent server** running 24/7. Use **Railway** instead — it's free and perfect for this.

---

## 🚀 Deploy to Railway (Free)

### Step 1 — Push to GitHub
1. Create a new repo on [github.com](https://github.com)
2. Upload all these files to it

### Step 2 — Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your repo
4. Railway will auto-detect Node.js and run `npm start`

### Step 3 — Set Environment Variable
1. In Railway, go to your project → **Variables**
2. Add: `GROUP_ID` = `120363425771650708@g.us`

### Step 4 — Scan QR Code
1. Go to **Deployments → View Logs**
2. A QR code will appear in the logs
3. Open WhatsApp → Linked Devices → Scan the QR code
4. Bot is now live! ✅

---

## 🏃 Run Locally
```bash
npm install
node index.js
```

---

## 📋 Rules enforced
1. No swearing (75 keywords)
2. No nude content (75 keywords)
3. No TVD links (75 keywords)
4. No Freya Skye (75 keywords)
5. No face emojis (75 emojis)
6. No fancy keyboards (regex)
7. No Labubus (75 keywords)
8. No clickbaiting (75 keywords)
9. No Snapchat (75 keywords)
10. No filters (75 keywords)
11. No inappropriate images/GIFs (auto-deleted)

**3 warnings → removed from group**
**Violating message is deleted immediately**
