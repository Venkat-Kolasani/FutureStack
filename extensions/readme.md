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
VITE_SYNC_HOST=https://futuretracker.online

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
Run this command with your Clerk Secret Key:
```bash
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY" \
  -H "Content-type: application/json" \
  -d '{"allowed_origins": ["chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj"]}'
```

## Backend CORS Setup

The backend reads from `CORS_ORIGIN` in `backend/.env`.
Add the extension ID to the comma-separated list:

**Local development:**
CORS_ORIGIN=http://localhost:3000,chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj

**Production:**
CORS_ORIGIN=https://futuretracker.online,chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj

## Manual Test Plan

1. Sign in at [futuretracker.online](https://futuretracker.online)
2. Visit any job listing page:
   - Google Jobs: `https://www.google.com/search?q=software+intern`
   - LinkedIn Jobs: `https://www.linkedin.com/jobs/`
     (Note: LinkedIn blocks content scripts — fill title manually)
   - Internshala: `https://internshala.com`
3. Click the FutureTracker extension icon
4. Review and edit the pre-filled title and description
5. Select category and status
6. Click **Save Opportunity**
7. Go to [Dashboard](https://futuretracker.online/dashboard) and confirm entry appears

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