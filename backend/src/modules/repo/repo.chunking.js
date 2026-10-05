// Simple line-window chunking. Good enough for MVP — upgrade later to
// AST-aware chunking (split on function/class boundaries) as a stretch goal.

const CHUNK_LINES = 60;
const OVERLAP_LINES = 10;

/**
 * @param {{filePath: string, content: string}} file
 * @returns {Array<{filePath, content, startLine, endLine}>}
 */
export function chunkFile(file) {
  const lines = file.content.split('\n');
  const chunks = [];

  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const chunkContent = lines.slice(start, end).join('\n').trim();

    if (chunkContent.length > 0) {
      chunks.push({ filePath: file.filePath, content: chunkContent, startLine: start + 1, endLine: end });
    }

    if (end === lines.length) break;
    start += CHUNK_LINES - OVERLAP_LINES;
  }

  return chunks;
}

export function chunkFiles(files) {
  return files.flatMap(chunkFile);
}
