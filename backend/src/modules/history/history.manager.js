import { supabase } from '../../config/db.js';

/**
 * Records (or refreshes) a repo in a user's history. Called after a
 * successful analyze, and also when a user re-opens an already-indexed repo.
 */
export async function upsertUserRepo({
  userId,
  repoId,
  displayName,
  sourceType,
  visibility,
  filesProcessed,
  chunksStored,
}) {
  const { error } = await supabase.from('repos').upsert(
    {
      user_id: userId,
      repo_id: repoId,
      display_name: displayName,
      source_type: sourceType,
      visibility,
      files_processed: filesProcessed,
      chunks_stored: chunksStored,
      last_opened_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,repo_id' }
  );
  if (error) throw error;
}

/** Just bumps last_opened_at — used when a user revisits a repo without re-analyzing. */
export async function touchUserRepo(userId, repoId) {
  const { error } = await supabase
    .from('repos')
    .update({ last_opened_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('repo_id', repoId);
  if (error) throw error;
}

/** List a user's repo history, most recently opened first. */
export async function listUserRepos(userId) {
  const { data, error } = await supabase
    .from('repos')
    .select('*')
    .eq('user_id', userId)
    .order('last_opened_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Check if THIS user has already indexed this exact repo. */
export async function findUserRepo(userId, repoId) {
  const { data, error } = await supabase
    .from('repos')
    .select('*')
    .eq('user_id', userId)
    .eq('repo_id', repoId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
