# AI Resume Checker

> **Rollout status:** The API, persistence layer, provider settings, and UI components are implemented, but the user-facing controls are currently disabled by `AI_RESUME_CHECK_ENABLED = false` in `src/config/features.js`. This guide documents the implementation and the requirements to enable it safely; it does not mean the feature is live in the product.

> **Feature:** Agentic AI-powered resume evaluation inside the FutureTracker Documents vault.
> Scores overall quality across four evidence-backed categories, surfaces GitHub signals, and
> provides actionable suggestions — all powered by a server-side LLM pipeline.

---

## Overview

The AI Resume Checker is an agentic multi-stage pipeline that runs entirely on the Express
backend, calls a large language model (LLM) to extract and evaluate the resume, and persists
the result in Supabase. It lives **alongside** (not replacing) the existing client-side
rule-based ATS scorer.

### Architecture

The pipeline is inspired by and adapted from **[interviewstreet/hiring-agent](https://github.com/interviewstreet/hiring-agent)**
(MIT © HackerRank), reimplemented in Node.js and integrated with FutureTracker's auth, storage,
and data model.

```
Browser → POST /api/v1/documents/:id/ai-check
              ↓ requireAuth (Clerk JWT)
              ↓ aiCheckRunLimiter on POST only (30/15 min dev, 10/15 min prod, per user)
         routes/resume-checker.js
              ↓ verify document ownership + type = 'resume'
              ↓ insert resume_ai_checks (status='running')
         lib/resume-agent/runResumeCheck.js
          ├── extract.js     → download from Supabase Storage → PDF/DOCX → plain text
          ├── parser.js      → 1× LLM call → JSON Resume object
          ├── github.js      → GitHub API → repo metadata → LLM top-7 project selection
          └── evaluator.js   → LLM evaluation → category scores + evidence
              ↓ update resume_ai_checks (status='completed')
         JSON response to browser
              ↓
         AiResumeCheckPanel (DocumentCard)
```

---

## Pipeline stages

### 1. Text extraction (`lib/resume-agent/extract.js`)
Equivalent of `pymupdf_rag.py` / `pdf.py` from the reference.

- Downloads the file from **Supabase Storage** using `storage_path` on the document record
  (or `file_url` for external links).
- Extracts plain text from **PDF** (`pdf-parse`) or **DOCX** (`mammoth`).
- Normalises whitespace; throws if fewer than 50 characters are extracted.

### 2. Resume parsing (`lib/resume-agent/parser.js`)
Equivalent of `pdf.PDFHandler` + `transform.py` from the reference.

- Calls the LLM **once** with a full JSON Resume schema (basics, work, education, skills, projects, awards).
- Uses Zod + Vercel AI SDK `generateObject` for structured output.
- Quota errors surface as `429` with a clear message (no silent per-section degradation).
- Output is a **JSON Resume**-style object.

### 3. GitHub enrichment (`lib/resume-agent/github.js`)
Equivalent of `github.py` from the reference.

- Extracts a GitHub username from the structured resume's `profiles` array.
- Fetches public repos via the GitHub REST API (respects `GITHUB_TOKEN` for higher rate limits).
- Asks the LLM to select the top ≤7 most impressive projects.
- Returns null gracefully if no GitHub profile is found or if the API is unreachable.

### 4. Scored evaluation (`lib/resume-agent/evaluator.js`)
Equivalent of `evaluator.py` from the reference.

Scores four categories (0–25 each), plus optional bonus and deductions:

| Category | Max | Description |
|---|---|---|
| `open_source` | 25 | OSS contributions, public projects with usage |
| `self_projects` | 25 | Personal projects with real scope and impact |
| `production` | 25 | Real-world production experience at work or in projects |
| `technical_skills` | 25 | Breadth and depth of stated technical skills |
| **Bonus** | +10 | Awards, certifications, exceptional GitHub metrics |
| **Deductions** | -10 | Sparse resume, unsupported skills, unexplained gaps |

`overall_score = Σ categories + bonus − deductions`, clamped 0–100.

---

## Provider-agnostic LLM layer (`lib/llm/index.js`)

Uses the **[Vercel AI SDK](https://sdk.vercel.ai/)** (`ai` package) with pluggable providers:

| `LLM_PROVIDER` | Package | Default model |
|---|---|---|
| `gemini` (default) | `@ai-sdk/google` | `gemini-3.1-flash-lite` |
| `ollama` | `ollama-ai-provider` | `llama3.2` (or any pulled model) |

Adding a new provider (e.g. OpenAI) requires a single `case` in `lib/llm/index.js` and
installing `@ai-sdk/openai`.

---

## API endpoints

`POST` is protected by Clerk JWT auth and the AI rate limiter. `GET` (load saved results) is auth-only with no AI rate limit.

### `POST /api/v1/documents/:id/ai-check`

Trigger a new AI resume check for the given document.

**Requirements:**
- Document must belong to the authenticated user
- `type` must be `"resume"`
- Document must have a `storage_path` or `file_url`

**Response:** The completed (or failed) `resume_ai_checks` row.

**Errors:**
- `400` – document is not a resume, or has no accessible file
- `404` – document not found
- `429` – AI rate limit exceeded on **POST** (default: 30 checks / 15 min per user in dev, 10 in production)
- `500` – pipeline failure (persisted in DB with `status='failed'`)
- `503` – AI checker disabled (`RESUME_AI_ENABLED=false`)

### `GET /api/v1/documents/:id/ai-check`

Fetch the latest AI check result for a document without triggering a new run.

**Response:** Latest `resume_ai_checks` row, or `404` if none exists.

---

## Database

See [`ai-resume-check-migration.sql`](ai-resume-check-migration.sql).

Table: `resume_ai_checks`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `document_id` | UUID | FK → documents (cascade delete) |
| `status` | TEXT | `pending \| running \| completed \| failed` |
| `provider` | TEXT | e.g. `gemini`, `ollama` |
| `model` | TEXT | e.g. `gemini-3.1-flash-lite`, `gemini-2.5-flash` |
| `overall_score` | INTEGER | 0–100 |
| `category_scores` | JSONB | `{ open_source, self_projects, production, technical_skills }` |
| `bonus` | INTEGER | 0–10 |
| `deductions` | INTEGER | 0–10 |
| `structured_resume` | JSONB | JSON Resume object extracted by the parser |
| `github_summary` | JSONB | GitHub enrichment data (null if skipped) |
| `strengths` | JSONB | Array of strength strings |
| `suggestions` | JSONB | Array of actionable improvement strings |
| `evidence` | JSONB | Per-category evidence strings |
| `error` | TEXT | Failure reason (null on success) |

RLS policies mirror the pattern in `documents-migration.sql`.

---

## Environment variables

All AI-related vars are backend-only. See `backend/.env.example` for the full list.

| Variable | Default | Description |
|---|---|---|
| `RESUME_AI_ENABLED` | `true` | Set `false` to disable the feature |
| `LLM_PROVIDER` | `gemini` | `gemini` or `ollama` |
| `LLM_MODEL` | `gemini-3.1-flash-lite` | Model name for the selected provider |
| `GEMINI_API_KEY` | — | Required when `LLM_PROVIDER=gemini` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `GITHUB_TOKEN` | — | Optional; raises rate limit from 60→5000 req/hr |
| `LLM_TIMEOUT_MS` | `180000` | Per-call LLM timeout in ms (parse + evaluate each get this budget) |

### Switching to Ollama (local, no API key needed)

```bash
# backend/.env
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5   # or llama3.2, gemma3:4b, etc.
OLLAMA_BASE_URL=http://localhost:11434
RESUME_AI_ENABLED=true
```

Pull the model first: `ollama pull qwen2.5`

---

## Frontend components

| File | Description |
|---|---|
| `src/components/documents/AiResumeCheckPanel.jsx` | Score ring, category bars, strengths, suggestions, GitHub signals, evidence, disclaimer |
| `src/components/documents/DocumentCard.jsx` | "AI Resume Check" button (violet, resume+non-external only) wired to `onAiCheck` prop |
| `src/pages/Documents.jsx` | `handleAiCheck` handler, `aiCheckingId` state, `aiCheckResults` map |
| `src/services/api.js` | `resumeCheckerService.runCheck()` and `.getCheck()` |

---

## Rate limiting

`aiCheckRunLimiter` in `backend/src/middleware/aiLimiter.js` applies only to **POST**
(30 requests / 15 min per authenticated user in development, 10 in production).
`GET /ai-check` is unlimited — it only reads saved results from the database.
to control LLM costs. This is separate from the general and write-operation limiters.

---

## Latency

The full pipeline makes 7–8 sequential LLM calls (6 sections + evaluation + optional GitHub
project selection). Expect **20–60 seconds** end-to-end depending on the provider and model.

v1 is synchronous; the UI shows an "AI Running…" button state during this time. An async
job-queue upgrade (e.g. using Supabase Realtime to push completion) is listed in the follow-up
roadmap.

---

## Limitations and disclaimers

- Results are AI-generated and vary across runs, providers, and model versions.
- The score is not an official ATS score or a recruiter's evaluation.
- GitHub enrichment is optional; it degrades gracefully when no profile is found.
- LLM output may occasionally misparse dense or image-scanned resumes.

---

## Attribution

The pipeline architecture, scoring rubric, prompt design, and section-extraction patterns are
adapted from **[interviewstreet/hiring-agent](https://github.com/interviewstreet/hiring-agent)**,
MIT © HackerRank. The Node.js implementation, Vercel AI SDK integration, Supabase storage
adapter, and FutureTracker-specific features are original work.
