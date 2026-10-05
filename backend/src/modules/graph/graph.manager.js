// Day 3 "standout feature". Start simple: regex-scan JS/TS import statements
// to build a file-to-file dependency graph. This alone is usually enough to
// impress — you don't need a full AST parser for the MVP.

import path from 'path';
import { supabase } from '../../config/db.js';
import { listSourceFiles } from '../repo/repo.ingestion.js';
import { logger } from '../../utils/logger.js';

const IMPORT_REGEX = /import\s+(?:.+?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
const REQUIRE_REGEX = /require\(['"](\.{1,2}\/[^'"]+)['"]\)/g;
const HTML_ASSET_REGEX = /<(?:link|script|img|video|source|iframe)\b[^>]*?\b(?:href|src)=["']([^"']+)["']/gi;
const CSS_URL_REGEX = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

function resolveImportPath(fromFile, importPath) {
  const dir = path.dirname(fromFile);
  let resolved = path.normalize(path.join(dir, importPath));
  if (!path.extname(resolved)) resolved += '.js';
  return resolved;
}

function resolveAssetPath(fromFile, assetPath) {
  if (/^(?:https?:|data:|#|\/\/)/i.test(assetPath)) return null;
  if (assetPath.startsWith('/')) return path.normalize(assetPath.slice(1));
  return path.normalize(path.join(path.dirname(fromFile), assetPath));
}

/**
 * @param {Array<{filePath, content}>} files
 * @returns {Array<{source: string, target: string}>}
 */
export function buildDependencyEdges(files) {
  const edges = [];

  for (const file of files) {
    const imports = [
      ...file.content.matchAll(IMPORT_REGEX),
      ...file.content.matchAll(REQUIRE_REGEX),
    ];

    for (const match of imports) {
      edges.push({ source: file.filePath, target: resolveImportPath(file.filePath, match[1]) });
    }

    const extension = path.extname(file.filePath).toLowerCase();
    const assetMatches = extension === '.css'
      ? [...file.content.matchAll(CSS_URL_REGEX)]
      : ['.html', '.htm'].includes(extension)
        ? [...file.content.matchAll(HTML_ASSET_REGEX)]
        : [];

    for (const match of assetMatches) {
      const target = resolveAssetPath(file.filePath, match[1]);
      if (target) edges.push({ source: file.filePath, target });
    }
  }

  return [...new Map(edges.map((e) => [`${e.source}\u0000${e.target}`, e])).values()];
}

export async function storeDependencyEdges(repoId, edges) {
  if (edges.length === 0) return;
  const rows = edges.map((e) => ({ repo_id: repoId, source_file: e.source, target_file: e.target }));
  const { error } = await supabase.from('file_dependencies').insert(rows);
  if (error) throw error;
}

export async function deleteDependencyEdges(repoId) {
  const { error } = await supabase.from('file_dependencies').delete().eq('repo_id', repoId);
  if (error) throw error;
}

export async function getDependencyGraph(repoId) {
  const { data, error } = await supabase
    .from('file_dependencies')
    .select('source_file, target_file')
    .eq('repo_id', repoId);
  if (error) throw error;
  return data;
}

// ── Node classification + summaries ──────────────────────────────────────

/** Heuristic role detection from the file's path — free, instant, no API call. */
export function classifyNodeType(filePath) {
  const p = filePath.toLowerCase();
  const base = path.basename(p);

  if (/^(index|main|app|server)\.(js|ts|jsx|tsx)$/.test(base)) return 'entry';
  if (/\/(routes?)\//.test(p) || /\.routes?\.(js|ts)$/.test(p)) return 'route';
  if (/\/(middleware)\//.test(p) || /\.middleware\.(js|ts)$/.test(p)) return 'middleware';
  if (/\/(controllers?)\//.test(p) || /\.controller\.(js|ts)$/.test(p)) return 'controller';
  if (/\/(services?)\//.test(p) || /\.service\.(js|ts)$/.test(p)) return 'service';
  if (/\/(models?|schemas?|migrations?)\//.test(p) || /\.model\.(js|ts)$/.test(p)) return 'data';
  if (/\/(pages?|views?)\//.test(p)) return 'page';
  if (/\/(components?|context|hooks)\//.test(p)) return 'core';
  if (/\/(config)\//.test(p) || base === '.env.example') return 'core';
  if (/\/(utils?|helpers?|lib)\//.test(p)) return 'service';
  if (/(test|spec)\.(js|ts|jsx|tsx)$/.test(base) || /\/__tests__\//.test(p)) return 'external';
  return 'external';
}

export function summarizeFiles(files) {
  return files.map((f) => ({
    filePath: f.filePath,
    description: `${classifyNodeType(f.filePath)} file`,
  }));
}

export async function storeFileSummaries(repoId, files, summaries) {
  const summaryMap = new Map(summaries.map((s) => [s.filePath, s.description]));
  const rows = files.map((f) => ({
    repo_id: repoId,
    file_path: f.filePath,
    description: summaryMap.get(f.filePath) || 'No description available',
    node_type: classifyNodeType(f.filePath),
  }));

  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error } = await supabase
      .from('file_summaries')
      .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: 'repo_id,file_path' });
    if (error) throw error;
  }
}

export async function getFileSummaries(repoId) {
  const { data, error } = await supabase
    .from('file_summaries')
    .select('file_path, description, node_type')
    .eq('repo_id', repoId);
  if (error) throw error;
  return data;
}

export async function deleteFileSummaries(repoId) {
  const { error } = await supabase.from('file_summaries').delete().eq('repo_id', repoId);
  if (error) throw error;
}

// ── Full graph orchestration (used by graph.controller.js) ────────────────

async function rebuildGraphIfMissing(repoId, existingEdges) {
  if (existingEdges.length > 0 || !/^[a-zA-Z0-9_-]+$/.test(repoId)) {
    return existingEdges;
  }

  const localPath = path.resolve('tmp_repos', repoId);
  try {
    const files = await listSourceFiles(localPath);
    const rebuiltEdges = buildDependencyEdges(files);
    await deleteDependencyEdges(repoId);
    await storeDependencyEdges(repoId, rebuiltEdges);
    return rebuiltEdges.map((edge) => ({ source_file: edge.source, target_file: edge.target }));
  } catch (error) {
    // The checkout may have been cleaned up; returning the stored graph is
    // preferable to turning an empty graph into an API failure.
    if (error.code === 'ENOENT') return existingEdges;
    throw error;
  }
}

/** Builds the full { nodes, edges } response for GET /api/graph/:repoId. */
export async function getGraphForRepo(repoId) {
  const storedEdges = await getDependencyGraph(repoId);
  const edges = await rebuildGraphIfMissing(repoId, storedEdges);

  const nodeSet = new Set();
  edges.forEach((e) => {
    nodeSet.add(e.source_file);
    nodeSet.add(e.target_file);
  });

  const summaries = await getFileSummaries(repoId);
  const summaryMap = new Map(summaries.map((s) => [s.file_path, s]));

  const nodes = [...nodeSet].map((filePath) => {
    const summary = summaryMap.get(filePath);
    return {
      id: filePath,
      label: path.basename(filePath),
      type: summary?.node_type || classifyNodeType(filePath),
      description: summary?.description || 'Referenced file (no summary generated)',
    };
  });

  return {
    nodes,
    edges: edges.map((e) => ({ source: e.source_file, target: e.target_file })),
  };
}
