import { logger } from '../utils/logger.js';

export async function geminiComplete(contents, options = {}) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
    },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok) {
    logger.error('Gemini request failed', json);
    throw new Error(json?.error?.message || `Gemini request failed (${response.status})`);
  }
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}
