// ============================================================
// VERCEL SERVERLESS FUNCTION — AI Proxy (Gemini & OpenAI)
// Keeps API key server-side, never exposed to frontend
// Handles both Gemini and OpenAI keys automatically based on format
// ============================================================

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[api/ai-proxy] No AI API Key set in environment variables.');
    return res.status(500).json({ error: 'AI service is not configured. Set GEMINI_API_KEY or OPENAI_API_KEY in Vercel environment variables.' });
  }

  try {
    const { prompt, maxTokens = 16384, temperature = 0.1 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "prompt" field in request body.' });
    }

    // --- CASE A: OpenAI API Key (starts with sk-) ---
    if (apiKey.trim().startsWith('sk-')) {
      const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: Math.min(Math.max(temperature, 0), 2),
          max_tokens: Math.min(maxTokens, 16384)
        })
      });

      if (!openaiResp.ok) {
        const errBody = await openaiResp.json().catch(() => ({}));
        const errMsg = errBody?.error?.message || `OpenAI API returned HTTP ${openaiResp.status}`;
        console.error('[api/ai-proxy] OpenAI error:', errMsg);
        
        if (openaiResp.status === 429) {
          return res.status(429).json({ error: 'OpenAI API rate limit exceeded or insufficient credits.' });
        }
        return res.status(openaiResp.status).json({ error: errMsg });
      }

      const data = await openaiResp.json();
      const text = data?.choices?.[0]?.message?.content || '';
      return res.status(200).json({ text });
    }

    // --- CASE B: Google Gemini API Key ---
    const model = 'gemini-2.0-flash-lite';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

    const geminiResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: Math.min(Math.max(temperature, 0), 1),
          maxOutputTokens: Math.min(maxTokens, 8192),
        },
      }),
    });

    if (!geminiResp.ok) {
      const errBody = await geminiResp.json().catch(() => ({}));
      const errMsg = errBody?.error?.message || `Gemini API returned HTTP ${geminiResp.status}`;
      console.error('[api/ai-proxy] Gemini error:', errMsg);

      if (geminiResp.status === 429) {
        return res.status(429).json({ error: 'Gemini API rate limit reached. Please wait a minute and try again.' });
      }
      return res.status(geminiResp.status).json({ error: errMsg });
    }

    const data = await geminiResp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('[api/ai-proxy] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error while calling AI service.' });
  }
}
