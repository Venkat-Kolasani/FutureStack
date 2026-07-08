# FutureTracker Chrome Extension

Save job/internship listings to FutureTracker with one click.

## Prerequisites

Before setup, make sure these are done in your Clerk dashboard:
- **Native API** is enabled for your Clerk application
- **Extension origin** is added as an allowed origin: `chrome-extension://<YOUR_EXTENSION_ID>`
- **Bot protection** is disabled during development

## Setup

### 1. Install dependencies
```bash
cd extensions
npm install
```

### 2. Environment variables
Copy `.env.example` to `.env` and fill in your values:
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_BASE=http://localhost:3001

### 3. Build the extension
```bash
npm run build
```

### 4. Load in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extensions/dist` folder

### 5. Get a stable Extension ID
1. Go to `chrome://extensions`
2. Copy your extension ID
3. Add `chrome-extension://<YOUR_ID>` to allowed origins in Clerk dashboard

## Testing against local vs prod API

Local: `VITE_API_BASE=http://localhost:3001`

Production: `VITE_API_BASE=https://your-backend.onrender.com`

Rebuild after changing `.env`: `npm run build`

## Manual Test Plan

1. Sign in at futuretracker.online
2. Visit any job listing page
3. Click the FutureTracker extension icon
4. Review and edit the pre-filled title and description
5. Click **Save Opportunity**
6. Go to Dashboard and confirm the entry appears

## Backend CORS

Add to `backend/.env`:
EXTENSION_ID=your_extension_id_here

## Folder Structure
extensions/
├── src/
│   ├── background.js
│   ├── content.js
│   ├── lib/
│   │   ├── clerk.js
│   │   └── api.js
│   └── popup/
│       ├── index.html
│       ├── main.jsx
│       └── Popup.jsx
├── public/icons/
├── manifest.json
└── vite.config.js