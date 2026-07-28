# FutureTracker Chrome Extension

Save job/internship listings to FutureTracker with one click.

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
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_BASE=http://localhost:3001
VITE_SYNC_HOST=http://localhost:3000

**Production:**
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here
VITE_API_BASE=https://your-backend.onrender.com
VITE_SYNC_HOST=https://clerk.your-domain.com

### 3. Build the extension
```bash
npm run build
```

### 4. Load in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extensions/dist` folder

### 5. Add to Clerk allowed origins

Read your Clerk Secret Key from your `.env` file and run:
```bash
CLERK_SECRET=$(grep CLERK_SECRET_KEY backend/.env | cut -d '=' -f2)
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer $CLERK_SECRET" \
  -H "Content-type: application/json" \
  -d '{"allowed_origins": ["chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj"]}'
```

> ⚠️ Never paste your secret key directly into terminal commands — it persists in shell history.

## Backend CORS Setup

The backend reads from `CORS_ORIGIN` in `backend/.env`.
Add the extension ID to the comma-separated list:

**Local development:**
CORS_ORIGIN=http://localhost:3000,chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj

**Production:**
CORS_ORIGIN=https://futuretracker.online,chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj

## Manual Test Plan

1. Sign in at [futuretracker.online](https://futuretracker.online)
2. Visit a concrete job listing page, for example:
   - Internshala: `https://internshala.com/internship/detail/software-development-work-from-home-job-internship-at-skillible1749535640`
   - LinkedIn: `https://www.linkedin.com/jobs/view/4415735571/`
     (Note: LinkedIn blocks content scripts — title may need manual entry)
3. Verify the popup pre-fills:
   - **Title** — matches the job/internship title on the page
   - **Description** — matches the company or role description
   - **URL** — matches the current page URL
4. Select category and status
5. Click **Save Opportunity**
6. Go to [Dashboard](https://futuretracker.online/dashboard) and confirm entry appears

## Running Tests
```bash
cd extensions
npm test
```

## Folder Structure
extensions/
├── src/
│   ├── background.js     # Clerk session sync
│   ├── content.js        # Page metadata scraper (injected on demand)
│   ├── lib/
│   │   ├── clerk.js      # Clerk config
│   │   └── api.js        # Backend API calls with timeout
│   └── popup/
│       ├── index.html    # Popup HTML shell
│       ├── main.jsx      # React entry point
│       └── popup.jsx     # Popup UI component
├── public/icons/         # Extension icons (16, 48, 128px)
├── tests/
│   └── metadata.test.js  # Unit tests for metadata extraction
├── manifest.json         # Chrome MV3 manifest
├── vite.config.js        # Vite + crxjs build config
└── .env.example          # Environment variable template