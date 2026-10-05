import { supabase } from '../../config/db.js';

async function getUser(userId) {
  const { data, error } = await supabase.from('users').select('is_owner, credits').eq('id', userId).single();
  if (error) throw error;
  return data;
}

async function getTodayUsage(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('user_usage').select('*').eq('user_id', userId).eq('usage_date', today).maybeSingle();
  if (error) throw error;
  return data || { user_id: userId, usage_date: today, repo_analyses: 0, ai_questions: 0, credits: 0 };
}

export async function getAllowance(userId, actionType) {
  const user = await getUser(userId);
  if (user.is_owner) return { allowed: true, reason: 'owner' };
  const usage = await getTodayUsage(userId);
  const freeUsed = actionType === 'repo' ? usage.repo_analyses >= 1 : usage.ai_questions >= 1;
  if (!freeUsed) return { allowed: true, reason: 'free_trial' };
  if ((user.credits || 0) > 0) return { allowed: true, reason: 'credits' };
  return { allowed: false, reason: 'blocked' };
}

export async function consumeAllowance(userId, actionType, reason) {
  if (reason === 'owner') return;
  const today = new Date().toISOString().slice(0, 10);
  const usage = await getTodayUsage(userId);
  const payload = {
    user_id: userId,
    usage_date: today,
    repo_analyses: usage.repo_analyses + (reason === 'free_trial' && actionType === 'repo' ? 1 : 0),
    ai_questions: usage.ai_questions + (reason === 'free_trial' && actionType === 'question' ? 1 : 0),
    credits: usage.credits || 0,
    updated_at: new Date().toISOString(),
  };
  if (reason === 'free_trial') {
    const { error } = await supabase.from('user_usage').upsert(payload, { onConflict: 'user_id,usage_date' });
    if (error) throw error;
    return;
  }
  if (reason === 'credits') {
    const user = await getUser(userId);
    const next = Math.max(0, (user.credits || 0) - 1);
    const { error } = await supabase.from('users').update({ credits: next }).eq('id', userId);
    if (error) throw error;
    const { error: txError } = await supabase.from('credit_transactions').insert({ user_id: userId, type: 'usage', amount: -1, description: actionType === 'repo' ? 'Repository analysis' : 'AI question' });
    if (txError) throw txError;
  }
}

export async function getBillingStatus(userId) {
  const user = await getUser(userId);
  const usage = await getTodayUsage(userId);
  return {
    isOwner: user.is_owner,
    freeRepoAvailable: usage.repo_analyses < 1,
    freeQuestionAvailable: usage.ai_questions < 1,
    credits: user.credits || 0,
  };
}

export async function addCredits(userId, amount) {
  const user = await getUser(userId);
  const next = (user.credits || 0) + amount;
  const { error } = await supabase.from('users').update({ credits: next }).eq('id', userId);
  if (error) throw error;
  const { error: txError } = await supabase.from('credit_transactions').insert({ user_id: userId, type: 'purchase', amount, description: 'Demo credit purchase' });
  if (txError) throw txError;
}
