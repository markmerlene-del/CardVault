// api/ai-read-card.js
// POST — accepts a base64 image, returns extracted card fields using Claude

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
  const { imageData, mediaType } = body || {};

  if (!imageData) return res.status(400).json({ error: 'No image data — body keys: ' + Object.keys(body || {}).join(',') });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData }
            },
            {
              type: 'text',
              text: `Extract the information from this business card image and return ONLY a JSON object with these fields (use empty string if not found):
{
  "name": "full name of the person",
  "company": "company or business name",
  "phone": "phone number",
  "email": "email address",
  "tags": ["array", "of", "vendor", "type", "tags"]
}

For the tags array, infer 1-3 vendor type tags based on the business name and any services mentioned. Use simple lowercase terms like: roofer, plumber, electrician, landscaper, HVAC, painter, tree trimmer, handyman, contractor, fencer, pool, flooring, concrete, pest control, windows, gutters, siding, etc.

Return ONLY the JSON object. No explanation, no markdown, no backticks.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic error: ${response.status} — ${errText}`);
    }
    const data = await response.json();
    const text = data.content.find(b => b.type === 'text')?.text || '{}';

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      // Try to extract JSON from the response
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error('AI read error:', e);
    return res.status(500).json({ error: e.message });
  }
}
