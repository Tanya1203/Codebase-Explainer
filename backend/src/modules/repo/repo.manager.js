import { cloneRepo, extractZip, listSourceFiles } from './repo.ingestion.js';
import { chunkFiles } from './repo.chunking.js';
import { storeChunks, getRepoChunkCount, deleteRepoChunks } from '../../integrations/vectorstore.client.js';
import { buildDependencyEdges, storeDependencyEdges, deleteDependencyEdges, summarizeFiles, storeFileSummaries, getFileSummaries, deleteFileSummaries } from '../graph/graph.manager.js';
import { upsertUserRepo, touchUserRepo, findUserRepo } from '../history/history.manager.js';
import { getDecryptedGithubToken } from '../auth/auth.manager.js';
import { logger } from '../../utils/logger.js';

async function indexAndRecord({ userId, repoId, localPath, displayName, sourceType, visibility }) {
  const files = await listSourceFiles(localPath);
  const chunks = chunkFiles(files);
  const indexedChunkCount = await getRepoChunkCount(repoId);
  const needsIndexing = indexedChunkCount !== chunks.length;

  let filesProcessed = null;
  let chunksStored = null;
  if (needsIndexing) {
    if (indexedChunkCount > 0) await deleteRepoChunks(repoId);
    logger.info(`Indexing ${chunks.length} chunks for ${repoId} without paid embeddings`);
    await storeChunks(repoId, chunks);
    filesProcessed = files.length;
    chunksStored = chunks.length;
  }

  const edges = buildDependencyEdges(files);
  await deleteDependencyEdges(repoId);
  await storeDependencyEdges(repoId, edges);

  const existingSummaries = await getFileSummaries(repoId);
  if (existingSummaries.length !== files.length) {
    const summaries = summarizeFiles(files);
    if (existingSummaries.length > 0) await deleteFileSummaries(repoId);
    await storeFileSummaries(repoId, files, summaries);
  }

  const existingForUser = await findUserRepo(userId, repoId);
  if (existingForUser) await touchUserRepo(userId, repoId);
  else await upsertUserRepo({ userId, repoId, displayName, sourceType, visibility, filesProcessed, chunksStored });

  return { repoId, filesProcessed, chunksStored, status: needsIndexing ? 'indexed' : 'already_indexed' };
}

export async function analyzeRepoFromUrl(userId, repoUrl) {
  const githubToken = await getDecryptedGithubToken(userId);
  const { repoId, localPath } = await cloneRepo(repoUrl, githubToken);
  return indexAndRecord({ userId, repoId, localPath, displayName: repoUrl, sourceType: 'git', visibility: 'unknown' });
}

export async function analyzeRepoFromZip(userId, zipPath, originalFilename) {
  const { repoId, localPath } = await extractZip(zipPath, originalFilename);
  return indexAndRecord({ userId, repoId, localPath, displayName: originalFilename, sourceType: 'zip', visibility: 'private' });
}
