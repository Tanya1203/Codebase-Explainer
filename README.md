# Codebase Explainer — RAG-based Code Intelligence Tool

Sign in with GitHub → paste a repo URL (public or private) or upload a zip →
ask questions about it in plain English → see an interactive dependency
graph → revisit anything from your history.

## Stack
- **Backend:** Node.js + Express, Google Gemini for embeddings (`gemini-embedding-001`) + chat (`gemini-2.5-flash`) — free tier, no card required
- **Auth:** GitHub OAuth, session via httpOnly JWT cookie
- **Vector store:** Supabase (Postgres + pgvector) — free tier is enough; also stores users + history
- **Frontend:** React (Vite) + Tailwind, `react-force-graph-2d` for the graph

## Setup

### 1. Supabase (5 min)
1. Create a free project at supabase.com
2. Open the SQL editor, paste and run `backend/src/config/schema.sql` (creates
   `code_chunks`, `file_dependencies`, `users`, `repos`)
3. Copy your Project URL and `service_role` key into `backend/.env`

### 2. Gemini API key (2 min, free)
1. Go to aistudio.google.com/apikey
2. Create a key — no credit card needed
3. Copy it into `GEMINI_API_KEY` in `backend/.env`

### 3. GitHub OAuth App (5 min)
1. github.com/settings/developers → **New OAuth App**
2. Homepage URL: `http://localhost:5173`
3. Authorization callback URL: `http://localhost:5000/api/auth/github/callback`
4. Copy the Client ID and generate a Client Secret into `backend/.env`

### 4. Backend
```bash
cd backend
cp .env.example .env
# fill in: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#          GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET, ENCRYPTION_KEY
npm install
npm run dev             # http://localhost:5000
```

Every route except `/api/auth/*` now requires a logged-in session — you'll
need to sign in through the frontend (or copy the session cookie) before
`curl`-testing `/api/repo/analyze`, etc.

### 5. Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

Try it: paste a small public repo URL on the landing page (start with something
tiny, e.g. a 10-file repo, to keep embedding costs/time low while testing).

## 3-Day Build Plan

**Day 1 — Backend core (do this first, minimal UI needed)**
Since every data route now requires auth, the fastest path is:
1. Run backend + frontend, sign in with GitHub through the UI once.
2. Open DevTools → Application → Cookies, copy the `session` cookie value.
3. Use it in curl to keep testing without the UI:
```bash
curl -X POST http://localhost:5000/api/repo/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: session=PASTE_TOKEN_HERE" \
  -d '{"repoUrl":"https://github.com/some/small-repo"}'

curl -X POST http://localhost:5000/api/chat/ask \
  -H "Content-Type: application/json" \
  -H "Cookie: session=PASTE_TOKEN_HERE" \
  -d '{"repoId":"some__small-repo","question":"What does this repo do?"}'
```
Once both return sensible JSON, Day 1 is done.

**Day 2 — Frontend**
Landing page → Workspace (chat) already scaffolded. Wire up, test end to end
with a real repo, fix rough edges in the RAG answers (prompt tuning, chunk size).

**Day 3 — Standout feature + polish**
Dependency graph is scaffolded (regex-based import parsing — good enough for
JS/TS repos). Stretch goals if you have time, roughly in order of impact:
1. **Impact analysis**: "if I change file X, what else might break?" — just
   walk `file_dependencies` in reverse from a given file.
2. Click a graph node → jump to asking about that file in the chat.
3. Smart repo summary generated once at analyze-time and shown on the workspace page.
4. Deploy (Render/Railway for backend, Vercel for frontend) + demo GIF in your README.

## Notes / things you'll likely need to tune
- Chunking is line-window based (60 lines, 10 overlap) — fine for MVP, an
  AST-aware chunker (split on function boundaries) is a nice upgrade to
  mention in interviews if you have time.
- The dependency graph uses regex import parsing, so it only reliably handles
  JS/TS relative imports (`./foo`, `../bar`) — good enough for a demo repo,
  won't resolve `node_modules` packages or Python imports (extend
  `graph.service.js` if your target repo is Python-heavy).
- Costs: Gemini's free tier covers embeddings and chat for typical demo/testing
  volume at $0. Free tiers do have rate limits that can tighten without much
  warning, so if you hit 429s while testing, just slow down/batch your requests
  or add simple retry logic in `embedding.service.js`.
