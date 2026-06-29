// ============================================================
// GEMINI AI CLIENT — Frontend helper
// Calls the /api/gemini serverless function (key stays server-side)
// ============================================================

/**
 * Call Gemini AI through the secure server-side proxy.
 * @param {string} prompt - The full prompt to send
 * @param {object} opts - Optional: { maxTokens, temperature }
 * @returns {Promise<string>} The AI response text
 */
export async function callGeminiAI(prompt, { maxTokens = 16384, temperature = 0.1 } = {}) {
  const resp = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens, temperature }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.error || `AI request failed (HTTP ${resp.status})`);
  }

  return data.text || '';
}

/**
 * Parse raw text into structured data using Gemini AI.
 * @param {string} rawText - The raw text to parse
 * @param {string} promptBase - The system prompt for the entity type
 * @returns {Promise<Array>} Parsed array of records
 */
export async function parseWithGeminiAI(rawText, promptBase) {
  const fullPrompt = promptBase + '\n"""\n' + rawText + '\n"""';
  const responseText = await callGeminiAI(fullPrompt);

  // Extract JSON from response (remove markdown fences if any)
  const cleaned = responseText
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to find JSON array in text
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Could not parse AI response as JSON. Raw: ' + cleaned.slice(0, 200));
    }
  }

  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array from AI.');
  return parsed;
}
