// api/cards/[id].js
// DELETE /api/cards/:id

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.query;
  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  try {
    // Read current cards.json from GitHub
    const url = `https://api.github.com/repos/${repo}/contents/data/cards.json`;
    const getRes = await fetch(url, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!getRes.ok) throw new Error('Could not read cards');

    const ghData = await getRes.json();
    const cards = JSON.parse(Buffer.from(ghData.content, 'base64').toString('utf8'));
    const updated = cards.filter(c => c.id !== id);

    // Write updated list back
    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Delete card: ${id}`,
        content: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64'),
        sha: ghData.sha,
        branch
      })
    });

    return res.status(200).json({ deleted: id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
