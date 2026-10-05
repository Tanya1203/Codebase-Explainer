import { logger } from './logger.js';

/** Detects a 429 / rate-limit error from any OpenAI-style API client. */
function isRateLimitError(err) {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  const message = String(err?.message || '');
  return status === 429 || /rate limit|too many requests/i.test(message);
}

/**
 * Runs `fn` with exponential-backoff retries on transient rate-limit errors.
 * Non-rate-limit errors (bad request, auth failure, etc.) are rethrown
 * immediately — retrying those would never help.
 *
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, baseDelayMs?: number, label?: string }} [options]
 */
export async function withRetry(fn, options = {}) {
  const { retries = 3, baseDelayMs = 1000, label = 'API call' } = options;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err)) throw err;

      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        logger.warn(`${label}: rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`${label}: exhausted retries due to rate limiting`, lastErr);
  throw new Error('OpenAI API rate limit hit repeatedly. Wait a moment and try again.');
}
