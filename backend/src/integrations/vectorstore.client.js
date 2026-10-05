import { supabase } from '../config/db.js';
import { logger } from '../utils/logger.js';

export async function storeChunks(repoId, chunks) {
  const rows = chunks.map((chunk) => ({
    repo_id: repoId,
    file_path: chunk.filePath,
    content: chunk.content,
    start_line: chunk.startLine,
    end_line: chunk.endLine,
  }));
  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error } = await supabase.from('code_chunks').insert(rows.slice(i, i + BATCH_SIZE));
    if (error) throw error;
  }
  logger.info(`Stored ${rows.length} chunks for repo ${repoId}`);
}

function scoreChunk(content, question) {
  const tokens = question.toLowerCase().match(/[a-zA-Z0-9_]+/g) || [];
  const text = content.toLowerCase();
  const unique = [...new Set(tokens)].filter((t) => t.length > 2);
  if (!unique.length) return 0;
  return unique.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0) / unique.length;
}

/** Free local retrieval: no embedding API and no vector database required. */
export async function searchChunks(repoId, question, matchCount = 6) {
  const { data, error } = await supabase
    .from('code_chunks')
    .select('file_path, content, start_line, end_line')
    .eq('repo_id', repoId)
    .limit(1000);
  if (error) throw error;

  return (data || [])
    .map((row) => ({ ...row, similarity: scoreChunk(row.content, question) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
}

export async function repoExists(repoId) {
  return (await getRepoChunkCount(repoId)) > 0;
}

export async function getRepoChunkCount(repoId) {
  const { count, error } = await supabase.from('code_chunks').select('id', { count: 'exact', head: true }).eq('repo_id', repoId);
  if (error) throw error;
  return count ?? 0;
}

export async function deleteRepoChunks(repoId) {
  const { error } = await supabase.from('code_chunks').delete().eq('repo_id', repoId);
  if (error) throw error;
}
