import { geminiComplete } from '../../integrations/gemini.client.js';
import { searchChunks } from '../../integrations/vectorstore.client.js';

export async function answerQuestion(repoId, question) {
  const matches = await searchChunks(repoId, question, 6);
  const context = matches
    .map((m) => `File: ${m.file_path} (lines ${m.start_line}-${m.end_line})\n\`\`\`\n${m.content}\n\`\`\``)
    .join('\n\n');

  const prompt = `You are a senior engineer explaining a codebase to a teammate.\nAnswer ONLY using the provided code context. If the context does not contain the answer, say so explicitly instead of guessing. Reference file paths and line numbers when relevant.\n\nContext:\n${context}\n\nQuestion: ${question}`;
  const answer = await geminiComplete([{ role: 'user', parts: [{ text: prompt }] }], { maxOutputTokens: 1200 });

  return {
    answer,
    sources: matches.map((m) => ({ filePath: m.file_path, startLine: m.start_line, endLine: m.end_line, similarity: m.similarity })),
  };
}
