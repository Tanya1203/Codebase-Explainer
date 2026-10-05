import { Github } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { githubLoginUrl } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <div className="flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-border bg-surface text-xs text-muted">
        <span className="w-2 h-2 rounded-full bg-accent2 animate-pulse" />
        RAG-powered code intelligence
      </div>

      <h1 className="text-4xl md:text-5xl font-semibold text-center max-w-2xl leading-tight">
        Understand any codebase
        <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent"> instantly</span>
      </h1>
      <p className="mt-4 text-muted text-center max-w-md">
        Sign in to analyze repos, ask questions, and pick up where you left off.
      </p>

      <a
        href={githubLoginUrl()}
        className="mt-10 flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-3 rounded-xl hover:bg-slate-200 transition-colors"
      >
        <Github size={18} />
        Sign in with GitHub
      </a>

      <p className="mt-4 text-xs text-muted max-w-sm text-center">
        We request repo access so you can analyze your private repositories too —
        we only ever clone what you explicitly submit.
      </p>
    </div>
  );
}
