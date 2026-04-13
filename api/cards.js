// api/cards.js
// Vercel serverless function — handles GET all cards, POST new card
// Card files stored in /public/cards/, metadata in /data/cards.json
// Uses GitHub API to commit files (Vercel filesystem is read-only in production)

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const formidable = require('formidable');

const config = { api: { bodyParser: false } };
module.exports.config = config;

const DATA_FILE = join(process.cwd(), 'data', 'cards.json');

function readCards() {
  try {
    if (!existsSync(DATA_FILE)) return [];
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch { return []; }
}

async function saveToGitHub(filename, content, isBase64 = false) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) throw new Error('GitHub env vars not set');

  const path = `public/cards/${filename}`;
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  let sha;
  try {
    const check = await fetch(url, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (check.ok) { const j = await check.json(); sha = j.sha; }
  } catch {}

  const body = {
    message: `Add card: ${filename}`,
    content: isBase64 ? content : Buffer.from(content).toString('base64'),
    branch,
    ...(sha ? { sha } : {})
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`GitHub error: ${res.status}`);
  return `https://raw.githubusercontent.com/${repo}/${branch}/public/cards/${filename}`;
}

async function saveCardsJson(cards) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    if (!existsSync(join(process.cwd(), 'data'))) {
      mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    }
    writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2));
    return;
  }

  const url = `https://api.github.com/repos/${repo}/contents/data/cards.json`;
  let sha;
  try {
    const check = await fetch(url, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (check.ok) { const j = await check.json(); sha = j.sha; }
  } catch {}

  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Update cards.json',
      content: Buffer.from(JSON.stringify(cards, null, 2)).toString('base64'),
      branch,
      ...(sha ? { sha } : {})
    })
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/cards ──────────────────────────────────────
  if (req.method === 'GET') {
    const cards = readCards();
    return res.status(200).json(cards);
  }

  // ── POST /api/cards ─────────────────────────────────────
  if (req.method === 'POST') {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (e) {
      return res.status(400).json({ error: 'Form parse error' });
    }

    const name     = Array.isArray(fields.name)     ? fields.name[0]     : fields.name     || '';
    const company  = Array.isArray(fields.company)  ? fields.company[0]  : fields.company  || '';
    const phone    = Array.isArray(fields.phone)    ? fields.phone[0]    : fields.phone    || '';
    const email    = Array.isArray(fields.email)    ? fields.email[0]    : fields.email    || '';
    const notes    = Array.isArray(fields.notes)    ? fields.notes[0]    : fields.notes    || '';
    const fileType = Array.isArray(fields.fileType) ? fields.fileType[0] : fields.fileType || 'none';
    const tagsRaw  = Array.isArray(fields.tags)     ? fields.tags[0]     : fields.tags     || '[]';

    let tags;
    try { tags = JSON.parse(tagsRaw); } catch { tags = ['vendor']; }

    const id = `card_${Date.now()}`;
    let fileUrl = null;

    const uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;
    if (uploadedFile && uploadedFile.size > 0) {
      try {
        const fileBuffer = readFileSync(uploadedFile.filepath);
        const base64 = fileBuffer.toString('base64');
        const ext = uploadedFile.originalFilename?.split('.').pop() || (fileType === 'pdf' ? 'pdf' : 'jpg');
        const filename = `${id}.${ext}`;
        fileUrl = await saveToGitHub(filename, base64, true);
      } catch (e) {
        console.error('File upload error:', e.message);
      }
    }

    const card = { id, name, company, phone, email, notes, tags, fileUrl, fileType, createdAt: new Date().toISOString() };

    const cards = readCards();
    cards.unshift(card);
    await saveCardsJson(cards);

    return res.status(201).json(card);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
module.exports.config = { api: { bodyParser: false } };
