import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { supabase } from '../../config/db.js';
import { exchangeCodeForToken, fetchGithubProfile } from '../../integrations/github.client.js';
import { encrypt, decrypt } from '../../utils/encryption.js';

dotenv.config();

export const COOKIE_NAME = 'session';
export const COOKIE_OPTIONS = {
  httpOnly: true, // JS on the frontend can't read it — mitigates XSS token theft
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/** Builds the GitHub authorize URL the controller redirects the browser to. */
export function buildGithubAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    // "repo" scope is what lets us clone the user's PRIVATE repos too.
    scope: 'read:user repo',
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Full OAuth callback flow: exchange code -> fetch profile -> upsert user
 * -> issue our own session JWT. Returns the signed token for the controller
 * to set as a cookie.
 */
export async function completeGithubLogin(code) {
  const accessToken = await exchangeCodeForToken(code);
  const profile = await fetchGithubProfile(accessToken);

  // Recomputed on every login (not just first signup) so that changing
  // OWNER_GITHUB_USERNAME in .env takes effect on the owner's next login,
  // without needing a manual database edit.
  const isOwner =
    !!process.env.OWNER_GITHUB_USERNAME &&
    profile.login.toLowerCase() === process.env.OWNER_GITHUB_USERNAME.toLowerCase();

  // Upsert the user: create on first login, refresh token on every login
  // (tokens can expire/be revoked, so always store the latest one).
  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      {
        github_id: String(profile.id),
        username: profile.login,
        avatar_url: profile.avatar_url,
        github_access_token: encrypt(accessToken),
        is_owner: isOwner,
      },
      { onConflict: 'github_id' }
    )
    .select()
    .single();

  if (error) throw error;

  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export async function getUserProfile(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, avatar_url, created_at, is_owner')
    .eq('id', userId)
    .single();

  if (error || !user) return null;
  return user;
}

/** Returns a user's decrypted GitHub access token, or null. Used by the repo module for cloning. */
export async function getDecryptedGithubToken(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('github_access_token')
    .eq('id', userId)
    .single();

  if (error || !data?.github_access_token) return null;
  return decrypt(data.github_access_token);
}
