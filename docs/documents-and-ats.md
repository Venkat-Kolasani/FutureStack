# Documents Vault, ATS Scorer & AI Resume Checker

> **Current availability:** the document vault and rule-based ATS scorer are available. The AI Resume Checker implementation is present but its frontend controls are gated off; see [PROJECT_STATUS.md](PROJECT_STATUS.md) and [ai-resume-checker.md](ai-resume-checker.md).

> **Interview talking point:** Two-tier resume analysis — (1) a fast client-side rule-based ATS
> scorer that extracts text in the browser and scores structure and content heuristically, and
> (2) a server-side agentic AI pipeline that calls an LLM to extract a structured JSON Resume,
> enrich with GitHub signals, and produce evidence-backed category scores with actionable
> suggestions.

## Documents vault

Users upload and manage resumes, cover letters, and portfolio links. Documents can be **assigned** to specific internship opportunities to track which materials were used for each application.

### Database

See [`documents-migration.sql`](documents-migration.sql):

| Table | Purpose |
|-------|---------|
| `documents` | User-owned files and external links |
| `opportunity_documents` | Many-to-many link between opportunities and documents |

ATS-related columns on `documents`:

| Column | Type | Purpose |
|--------|------|---------|
| `ats_score` | `INTEGER` | Total score 0–100 from client analysis |
| `ats_analyzed_at` | `TIMESTAMPTZ` | Last analysis timestamp |
| `ats_analysis` | `JSONB` | Full breakdown (sections, suggestions, keyword hints) |

### API (`/api/documents`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List user's documents |
| GET | `/:id` | Single document |
| GET | `/by-opportunity/:opportunityId` | Documents linked to an opportunity |
| POST | `/` | Create document (metadata / external URL) |
| POST | `/upload` | Multipart file upload |
| PATCH | `/:id` | Update metadata; can include `ats_score`, `ats_analysis` |
| DELETE | `/:id` | Delete document |
| POST | `/:id/assign` | Link document to opportunity |
| DELETE | `/:id/unassign/:opportunityId` | Remove link |

Frontend service: `documentService` in `src/services/api.js`.

### UI

```
src/
├── pages/Documents.jsx
└── components/documents/
    ├── DocumentUpload.jsx        # Upload + ATS analysis on save
    ├── DocumentCard.jsx          # Shows ATS score badge, AI check button, both panels
    ├── AtsAnalysisPanel.jsx      # Rule-based score breakdown (client-side)
    ├── AiResumeCheckPanel.jsx    # AI score ring, category bars, GitHub, evidence
    └── DocumentSelector.jsx      # Pick documents when applying
```

---

## ATS scorer (client-side)

**PR #60** added rule-based ATS-style feedback. This is **not** a third-party ATS integration — analysis runs entirely in the browser.

### Module

`src/utils/atsScorer.js`

| Export | Purpose |
|--------|---------|
| `analyzeText(text)` | Score plain text; returns `{ total, breakdown, suggestions, suggestedKeywords }` |
| `analyzeFile(file)` | Extract text from PDF (pdf.js) or DOCX (mammoth), then call `analyzeText` |

### Scoring model (v1)

| Category | Max points | What it checks |
|----------|------------|----------------|
| **Structure** | 60 | Presence of Contact, Education, Skills, Experience, Projects sections (regex heuristics) |
| **Content** | 25 | Skills depth, project mentions, experience bullet density |
| **ATS-friendly** | 15 | Length (~400–1000 words), email, LinkedIn/GitHub links |

Keywords (`KEYWORDS` array) are **suggested** to the user but do **not** change the numeric score in v1.

### Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as DocumentUpload
    participant ATS as atsScorer.js
    participant API as POST/PATCH /api/documents

    U->>UI: Select PDF or DOCX
    UI->>ATS: analyzeFile(file)
    ATS-->>UI: score + breakdown + suggestions
    U->>UI: Save document
    UI->>API: file + ats_score + ats_analysis
    API-->>UI: persisted document
```

Analysis happens **before** upload. The server stores the client-computed score; it does not re-run analysis.

### Dependencies

- `mammoth` — DOCX → text
- `pdfjs-dist` — PDF text extraction (`public/pdf.worker.min.js`)

### Tests

```bash
npm test -- atsScorer
```

Unit tests: `src/utils/__tests__/atsScorer.test.js`.

### UX disclaimer

UI shows: *"Rule-based hints — not an official ATS score."* Keep this when extending the feature.

---

## AI Resume Checker (server-side, LLM-powered)

For full details see [`ai-resume-checker.md`](ai-resume-checker.md).

### How it differs from the rule-based ATS scorer

| Aspect | Rule-based ATS | AI Resume Checker |
|---|---|---|
| Where it runs | Browser (client-side) | Express backend (server-side) |
| LLM required | No | Yes (Gemini / Ollama) |
| Scoring | Structure + content heuristics | 4 evidence-backed categories (0–100) |
| GitHub signals | No | Yes (optional enrichment) |
| Speed | < 1 second | 20–60 seconds |
| Cost | Free | LLM API call per analysis |
| Available for | Uploaded PDF/DOCX resumes | Uploaded PDF/DOCX resumes only |

Both scores appear on the same DocumentCard and are preserved independently.

### New API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/:id/ai-check` | Trigger a new AI evaluation |
| GET  | `/api/documents/:id/ai-check` | Fetch the latest AI result |

Rate-limited at 10 requests / 15 min per IP (independent of the general limiter).

---

## Setup checklist

1. Run `docs/documents-migration.sql` in Supabase (includes ATS columns if upgrading)
2. Run `docs/ai-resume-check-migration.sql` in Supabase (for the AI checker)
3. Set `GEMINI_API_KEY` (or configure `LLM_PROVIDER=ollama`) in `backend/.env`
4. Ensure backend `documents` and resume-checker routes are mounted (`backend/src/app.js`)
5. For PDF upload in dev, confirm `pdf.worker.min.js` is served from `public/`

---

## Interview one-liner

> "We have two complementary resume analysis layers. The first is fast and client-side: pdf.js
> and mammoth extract text in the browser, rule-based heuristics score structure and content, and
> the result is stored via the documents API. The second is agentic and server-side: we download
> the file from Supabase Storage, extract text with pdf-parse/mammoth, send it section-by-section
> to a Gemini LLM for structured extraction into a JSON Resume object, optionally enrich with
> GitHub repo signals, then run a scored evaluation that returns category scores with evidence.
> The design is inspired by and adapted from the open-source HackerRank hiring-agent pipeline."
