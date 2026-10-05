import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, ArrowRight, Loader2, Upload, Clock, LogOut, FileArchive, Crown, Sparkles } from 'lucide-react';
import { analyzeRepo, uploadZipRepo, listMyRepos, getBillingStatus, isUpgradeRequiredError } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import UpgradePrompt from '../components/UpgradePrompt.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [billing, setBilling] = useState(null);

  const loadBillingStatus = () => {
    getBillingStatus()
      .then(setBilling)
      .catch(() => setBilling(null));
  };

  useEffect(() => {
    listMyRepos()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
    loadBillingStatus();
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);
    setNeedsUpgrade(false);
    try {
      const { repoId } = await analyzeRepo(repoUrl.trim());
      navigate(`/workspace/${repoId}`);
    } catch (err) {
      if (isUpgradeRequiredError(err)) {
        setNeedsUpgrade(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleZipSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setNeedsUpgrade(false);
    try {
      const { repoId } = await uploadZipRepo(file);
      navigate(`/workspace/${repoId}`);
    } catch (err) {
      if (isUpgradeRequiredError(err)) {
        setNeedsUpgrade(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // Small text describing what's left, shown next to the username.
  const billingLabel = () => {
    if (!billing) return null;
    if (billing.isOwner) return 'Owner · unlimited';
    if (billing.freeRepoAvailable) return '1 free repo available';
    if (billing.credits > 0) return `${billing.credits} credits left`;
    return 'Free trial used';
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-sm font-medium text-slate-200">Codebase Explainer</span>
        <div className="flex items-center gap-3">
          {billing && (
            <div className="flex items-center gap-1.5 text-xs text-muted border border-border rounded-full px-2.5 py-1">
              {billing.isOwner ? <Crown size={12} className="text-amber-400" /> : <Sparkles size={12} className="text-accent2" />}
              {billingLabel()}
            </div>
          )}
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
              {user.username}
            </div>
          )}
          <button onClick={logout} className="text-muted hover:text-slate-100" title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-16 pb-10">
        <h1 className="text-2xl font-semibold text-center">Analyze a repository</h1>
        <p className="text-muted text-sm text-center mt-2">
          Paste a GitHub URL (public or private) or upload a zip.
        </p>

        <form onSubmit={handleAnalyze} className="mt-8">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3 focus-within:border-accent transition-colors">
            <Github size={18} className="text-muted shrink-0" />
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Analyze <ArrowRight size={14} /></>}
            </button>
          </div>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted">or</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-6 text-sm text-muted hover:border-accent hover:text-slate-100 transition-colors disabled:opacity-50"
        >
          <Upload size={16} />
          Upload a .zip of your codebase
        </button>
        <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleZipSelect} />

        {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}

        {needsUpgrade && (
          <div className="mt-4">
            <UpgradePrompt
              onUnlocked={() => {
                setNeedsUpgrade(false);
                loadBillingStatus();
              }}
            />
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted mb-3">
          <Clock size={13} /> Your history
        </div>

        {historyLoading && <Loader2 size={16} className="animate-spin text-muted" />}
        {!historyLoading && history.length === 0 && (
          <p className="text-sm text-muted">No repos analyzed yet — try one above.</p>
        )}

        <div className="space-y-2">
          {history.map((repo) => (
            <button
              key={repo.id}
              onClick={() => navigate(`/workspace/${repo.repo_id}`)}
              className="w-full flex items-center justify-between text-left bg-surface border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {repo.source_type === 'zip' ? (
                  <FileArchive size={15} className="text-accent2 shrink-0" />
                ) : (
                  <Github size={15} className="text-accent2 shrink-0" />
                )}
                <span className="text-sm truncate">{repo.display_name}</span>
              </div>
              <span className="text-xs text-muted shrink-0 ml-3">
                {new Date(repo.last_opened_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
