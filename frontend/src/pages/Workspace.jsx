import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Send, FileCode, Share2, Loader2, ArrowLeft } from 'lucide-react';
import { askQuestion, isUpgradeRequiredError } from '../api.js';
import UpgradePrompt from '../components/UpgradePrompt.jsx';

export default function Workspace() {
  const { repoId } = useParams();
  const location = useLocation();
  const inputRef = useRef(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeSources, setActiveSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  // Arriving from the graph view's "Explain this file" button — prefill
  // the input but don't auto-send, so the user still controls whether
  // this spends their free trial/credit.
  useEffect(() => {
    if (location.state?.prefillQuestion) {
      setQuestion(location.state.prefillQuestion);
      inputRef.current?.focus();
      // Clear the router state so refreshing/revisiting doesn't re-prefill.
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const userMsg = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    setNeedsUpgrade(false);

    try {
      const { answer, sources } = await askQuestion(repoId, userMsg.content);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      setActiveSources(sources || []);
    } catch (err) {
      if (isUpgradeRequiredError(err)) {
        // Don't fake an assistant reply for this — show the real prompt instead.
        setNeedsUpgrade(true);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dashboard" className="text-muted hover:text-slate-100 shrink-0">
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm text-slate-200 font-medium truncate">{repoId.replace('__', '/')}</span>
        </div>
        <Link
          to={`/graph/${repoId}`}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent text-muted hover:text-slate-100 transition-colors shrink-0"
        >
          <Share2 size={14} /> Dependency graph
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar - referenced files from last answer */}
        <aside className="w-56 border-r border-border bg-surface/50 p-3 shrink-0 overflow-y-auto">
          <p className="text-xs uppercase tracking-wide text-muted mb-2 px-1">Referenced files</p>
          {activeSources.length === 0 && (
            <p className="text-xs text-muted px-1">Ask a question to see relevant files here.</p>
          )}
          {activeSources.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer">
              <FileCode size={13} className="text-accent2 shrink-0" />
              <span className="truncate">{s.filePath}</span>
            </div>
          ))}
        </aside>

        {/* chat area */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <p className="text-muted text-sm">Ask anything about this repo — "what does the auth flow look like?", "where is the DB connection created?"</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-accent/15 border border-accent/30 ml-auto'
                    : 'bg-surface border border-border'
                }`}
              >
                {m.role === 'assistant' ? (
                        <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                               {m.content}
                        </ReactMarkdown>
                        </div>
                    ) : (
                   m.content
                      )}
              </div>
            ))}
            {loading && <Loader2 size={16} className="animate-spin text-muted" />}
            {needsUpgrade && (
              <div className="max-w-2xl">
                <UpgradePrompt onUnlocked={() => setNeedsUpgrade(false)} />
              </div>
            )}
          </div>

          <form onSubmit={handleAsk} className="p-4 border-t border-border bg-surface/50">
            <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-2.5 focus-within:border-accent transition-colors">
              <input
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this codebase..."
                className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted"
              />
              <button type="submit" disabled={loading} className="text-accent disabled:opacity-40">
                <Send size={17} />
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
