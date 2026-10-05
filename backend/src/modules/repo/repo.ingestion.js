import simpleGit from 'simple-git';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';

const TMP_DIR = path.resolve('tmp_repos');
const INCLUDED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.md', '.css', '.html', '.htm',
]);
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'venv', '__pycache__', 'coverage', '.cache',
]);

export async function cloneRepo(repoUrl, githubToken) {
  const repoId = repoUrl.replace(/https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\//g, '__');
  const localPath = path.join(TMP_DIR, repoId);
  await fs.mkdir(TMP_DIR, { recursive: true });
  const exists = await fs.stat(localPath).catch(() => null);
  if (!exists) {
    const authedUrl = githubToken ? repoUrl.replace('https://', `https://${githubToken}@`) : repoUrl;
    logger.info(`Cloning ${repoUrl} -> ${localPath}`);
    try {
      await simpleGit().clone(authedUrl, localPath, ['--depth', '1']);
    } catch (err) {
      const safeMessage = (err.message || '').replace(githubToken || '###', '***');
      throw new Error(`Failed to clone repo. If it's private, make sure you're signed in with GitHub and have access to it. (${safeMessage})`);
    }
  }
  return { repoId, localPath };
}

/** Extract ZIP from a disk path so the upload never has to remain in RAM. */
export async function extractZip(zipPath, originalFilename) {
  const safeName = originalFilename.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9-_]/g, '-');
  const repoId = `zip__${safeName}__${uuidv4().slice(0, 8)}`;
  const localPath = path.join(TMP_DIR, repoId);
  await fs.mkdir(localPath, { recursive: true });

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(localPath, true);
  } catch (err) {
    await fs.rm(localPath, { recursive: true, force: true }).catch(() => {});
    throw new Error(`Could not extract ZIP. Make sure it is a valid ZIP file. (${err.message})`);
  } finally {
    await fs.rm(zipPath, { force: true }).catch(() => {});
  }

  const entries = await fs.readdir(localPath, { withFileTypes: true });
  const onlyEntry = entries.length === 1 && entries[0].isDirectory() ? entries[0] : null;
  const effectivePath = onlyEntry ? path.join(localPath, onlyEntry.name) : localPath;
  logger.info(`Extracted zip -> ${effectivePath}`);
  return { repoId, localPath: effectivePath };
}

export async function listSourceFiles(localPath) {
  const results = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (INCLUDED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const content = await fs.readFile(fullPath, 'utf-8').catch(() => null);
        if (content && content.length <= 2_000_000) {
          results.push({ filePath: path.relative(localPath, fullPath), content });
        }
      }
    }
  }
  await walk(localPath);
  logger.info(`Found ${results.length} source files to process`);
  return results;
}
