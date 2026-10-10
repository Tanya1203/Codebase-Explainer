const BASE_URL = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include', // sends/receives the httpOnly session cookie
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed: ${res.status}`);
    // Preserve these so callers can tell "upgrade required" apart from any
    // other failure (e.g. a bad repo URL) instead of just showing red text.
    error.status = res.status;
    error.code = body.code;
    throw error;
  }
  return res.json();
}

/** True for the specific "free trial used up" response from the billing gate. */
export const isUpgradeRequiredError = (err) => err?.status === 402 && err?.code === 'UPGRADE_REQUIRED';

// --- auth ---
export const getCurrentUser = () => request('/auth/me');
export const logout = () => request('/auth/logout', { method: 'POST' });
export const githubLoginUrl = () => `${BASE_URL}/auth/github`;

// --- repos ---
export const analyzeRepo = (repoUrl) =>
  request('/repo/analyze', { method: 'POST', body: JSON.stringify({ repoUrl }) });

export const uploadZipRepo = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/repo/upload-zip', { method: 'POST', body: formData });
};

export const listMyRepos = () => request('/repos');

// --- chat / graph ---
export const askQuestion = (repoId, question) =>
  request('/chat/ask', { method: 'POST', body: JSON.stringify({ repoId, question }) });

export const getGraph = (repoId) => request(`/graph/${repoId}`);

// --- billing ---
export const getBillingStatus = () => request('/billing/status');

// Dev-stub only — see billing.controller.js on the backend. Real Stripe
// checkout would replace what this calls, not how the frontend calls it.

export const createPaymentOrder = (planId) =>
  request('/billing/create-order', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });

export const verifyPayment = (paymentResponse) =>
  request('/billing/verify-payment', {
    method: 'POST',
    body: JSON.stringify(paymentResponse),
  });

