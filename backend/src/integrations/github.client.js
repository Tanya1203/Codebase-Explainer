import dotenv from 'dotenv';
dotenv.config();

/**
 * Step 2 of OAuth: exchange the temporary `code` GitHub sent us
 * for a real access token we can use to call the GitHub API / git clone.
 */
export async function exchangeCodeForToken(code) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  return data.access_token;
}

/** Fetch the logged-in GitHub user's basic profile. */
export async function fetchGithubProfile(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error('Failed to fetch GitHub profile');
  return response.json(); // { id, login, avatar_url, ... }
}
