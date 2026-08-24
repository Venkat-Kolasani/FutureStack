# FutureTracker Chrome Extension

Save job and internship listings to FutureTracker from a side panel that stays open while you copy from the page.

The toolbar icon opens the **side panel**, not a popup. Chrome destroys popups when they lose focus, which made multi-section copy/paste impossible. The side panel stays docked, so you can select title, then description, then more JD sections without losing the form.

## Extension ID

The stable extension ID is: `ocadhiiiainnijhhimhmpagfdmfcnfmj`

This ID is deterministic and generated from the public key in `manifest.json`. It will not change across reloads or reinstalls.

## Prerequisites

Before setup, make sure these are done in your Clerk dashboard:
- **Native API** is enabled for your Clerk application
- **Extension origin** `chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj` is added as an allowed origin
- **Bot protection** is disabled during development

## Setup

### 1. Install dependencies
```bash
cd extensions
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env` and fill in your values.

**Local development:**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_BASE=http://localhost:3001
VITE_SYNC_HOST=http://localhost:3000
```

**Production:**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
VITE_API_BASE=https://your-backend.onrender.com
VITE_SYNC_HOST=https://clerk.your-domain.com
```

### 3. Build the extension
```bash
npm run build
```

### 4. Load in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extensions/dist` folder
5. Pin **FutureTracker Saver** and click it — the save form opens in the side panel

### 5. Add to Clerk allowed origins

Read your Clerk Secret Key from your `.env` file and run:
```bash
CLERK_SECRET=$(grep CLERK_SECRET_KEY backend/.env | cut -d '=' -f2)
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer $CLERK_SECRET" \
  -H "Content-type: application/json" \
  -d '{"allowed_origins": ["chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj"]}'
```

> Never paste your secret key directly into terminal commands — it persists in shell history.

## Backend CORS Setup

The backend reads from `CORS_ORIGIN` in `backend/.env`.
Add the extension ID to the comma-separated list:

**Local development:**
```
CORS_ORIGIN=http://localhost:3000,chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj
```

**Production:**
```
CORS_ORIGIN=https://futuretracker.online,chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj
```

## What it extracts

The side panel injects a parser into the active tab and prefers structured job data over Open Graph blurbs:

| Site | How fields are filled |
| --- | --- |
| LinkedIn | Job heading and `#job-details` in the open job pane; ignores “See who you know” OG copy |
| Greenhouse | JSON-LD `JobPosting` on `boards.greenhouse.io` and `job-boards.greenhouse.io`, with DOM fallbacks |
| Lever | JSON-LD `@graph` / `JobPosting` on `jobs.lever.co`, with posting-body fallbacks |
| Other pages | JSON-LD when present, then `og:title` / `og:description` / `document.title` |

Company and location are shown as helper text and may be folded into the title (`Role at Company`). They are not separate API fields. After the first website sign-in, close and reopen the side panel so Clerk session sync is picked up.

## Copying multiple sections

If the parser misses a field, keep the side panel open and:

1. Select text on the listing
2. Click **Use selection** (replace) or **Add selection** (append to the description)
3. Or copy on the page and paste into the panel with Ctrl/Cmd+V

Drafts are stored per tab/listing in `chrome.storage.session` so an accidental panel close does not wipe pasted text. **Re-read page** fills empty or unedited fields after a slow SPA load. Edited fields are not overwritten.

## Manual Test Plan

1. Sign in at [futuretracker.online](https://futuretracker.online), then close and reopen the side panel
2. Visit a concrete job listing page, for example:
   - LinkedIn: `https://www.linkedin.com/jobs/view/4415735571/`
   - Greenhouse: a public `https://boards.greenhouse.io/{company}/jobs/{id}` posting
   - Lever: a public `https://jobs.lever.co/{company}/{id}` posting
   - Internshala or another board still uses the generic JSON-LD / Open Graph fallback
3. Verify the side panel pre-fills:
   - **Title** — the role, not the site name
   - **Description** — the job body, not a one-line OG summary
   - **URL** — the current page URL (editable)
4. Select another paragraph on the page, click **Add selection**, and confirm the panel stayed open
5. Select category and status
6. Click **Save opportunity**
7. Go to [Internships](https://futuretracker.online/internships) or [Hackathons](https://futuretracker.online/hackathons) and confirm the entry appears

## Running Tests
```bash
cd extensions
npm test
```

## Folder Structure
```
extensions/
├── src/
│   ├── background.js          # Clerk session sync + open side panel on icon click
│   ├── content.js             # Optional message-based extractor (not declared in the manifest)
│   ├── lib/
│   │   ├── extractJob.js      # LinkedIn / Greenhouse / Lever / JSON-LD / OG parsers
│   │   ├── htmlToText.js      # HTML job-description cleanup
│   │   ├── injectExtractJob.js# Isolated-world entry injected into the tab
│   │   ├── tab.js             # executeScript helpers
│   │   ├── draft.js           # Per-listing session drafts
│   │   ├── clerk.js           # Clerk config
│   │   └── api.js             # Backend API calls
│   └── sidepanel/             # Clerk-backed review and save UI
├── public/icons/              # Extension icons (16, 48, 128px)
├── tests/
│   ├── extractJob.test.js     # Parser and merge tests
│   ├── metadata.test.js       # Open Graph fallback tests
│   └── fixtures/              # LinkedIn, Greenhouse, Lever, and generic HTML
├── manifest.json              # Chrome MV3 manifest
├── vite.config.js             # Vite + crxjs build config
└── .env.example               # Environment variable template
```
