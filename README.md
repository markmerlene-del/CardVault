# CardVault 📇
**Business card vault with voice search — built for DFW**

Search your vendor business cards by saying "roofer", "landscaper", "plumber" etc.
Add cards by taking a photo or uploading a PDF. Claude AI auto-reads the card and fills in the fields.

---

## Stack
- **Frontend**: Single-file HTML PWA (no framework, no build step)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Storage**: GitHub repo (card images + cards.json in /public/cards and /data)
- **AI**: Anthropic Claude — reads card images and extracts contact info + vendor tags

---

## Deploy to Vercel (Step by Step)

### 1. Create GitHub repo
```
Go to github.com → New repository → Name it "cardvault" → Create
```

### 2. Push this code
```bash
git init
git add .
git commit -m "Initial CardVault"
git remote add origin https://github.com/YOUR_USERNAME/cardvault.git
git push -u origin main
```

### 3. Create a GitHub Personal Access Token
```
GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
→ Generate new token → Check: repo (full control) → Copy the token
```

### 4. Deploy to Vercel
```
Go to vercel.com → New Project → Import your cardvault GitHub repo
→ Deploy (default settings are fine)
```

### 5. Set Environment Variables in Vercel
```
Vercel Dashboard → Your Project → Settings → Environment Variables

Add these 4 variables:

GITHUB_TOKEN    = ghp_xxxxxxxxxxxx  (your personal access token from step 3)
GITHUB_REPO     = YOUR_USERNAME/cardvault
GITHUB_BRANCH   = main
ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxx  (your existing Anthropic key)
```

### 6. Redeploy
```
Vercel Dashboard → Deployments → Redeploy (to pick up the env vars)
```

### 7. Add to your phone home screen
```
Open your Vercel URL in Safari (iPhone) or Chrome (Android)
→ Share → Add to Home Screen
→ CardVault icon appears on your home screen
```

---

## How It Works

### Adding a card
1. Tap **+** 
2. Take a photo with your phone camera OR upload a PDF
3. Tap **Auto-fill** — Claude reads the card image and fills Name, Company, Phone, Email, and suggests vendor tags
4. Review / edit fields, add any extra tags
5. Tap **Save Card**

The image/PDF is committed to your GitHub repo under `/public/cards/`.
The card metadata is stored in `/data/cards.json`.

### Searching cards
- **Voice**: Tap the mic → say "roofer" or "tree trimmer"
- **Type**: Type any vendor type, name, phone number, or company
- **Quick tags**: Tap any tag pill (Roofer, Landscaper, HVAC, etc.)

### Accessing from web
Your Vercel URL works on any device — phone, tablet, desktop.

---

## File Structure
```
cardvault/
├── public/
│   ├── index.html        ← entire app
│   ├── manifest.json     ← PWA manifest
│   ├── sw.js             ← service worker (offline)
│   └── cards/            ← uploaded card images/PDFs (auto-created)
├── api/
│   ├── cards.js          ← GET /api/cards, POST /api/cards
│   ├── cards/[id].js     ← DELETE /api/cards/:id
│   └── ai-read-card.js   ← POST /api/ai-read-card (Claude vision)
├── data/
│   └── cards.json        ← card metadata
├── package.json
├── vercel.json
└── README.md
```

---

## Adding icons (optional but recommended)
Create two PNG files and place them in `/public/icons/`:
- `icon-192.png` — 192×192 pixels
- `icon-512.png` — 512×512 pixels

You can use any image editor or a free tool like https://www.canva.com

---

## Troubleshooting

**"Saved locally" message instead of "Card saved!"**
→ Your Vercel env vars aren't set yet. Follow step 5 above.

**AI auto-fill not working**
→ Check that ANTHROPIC_API_KEY is set in Vercel env vars.

**Voice search not working**
→ Must be on HTTPS (Vercel provides this). Chrome on Android and Safari on iOS both support it.

**Cards not showing after save**
→ GitHub commits can take a few seconds. Refresh the page.
