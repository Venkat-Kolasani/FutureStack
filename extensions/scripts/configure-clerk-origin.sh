#!/usr/bin/env bash
# Add the FutureTracker extension origin to Clerk allowed_origins (Production instance).
# Usage: CLERK_SECRET_KEY=sk_live_... ./extensions/scripts/configure-clerk-origin.sh

set -euo pipefail

EXTENSION_ORIGIN="chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj"
SECRET="${CLERK_SECRET_KEY:-}"

if [[ -z "$SECRET" ]]; then
  echo "Set CLERK_SECRET_KEY to your Production secret (Clerk → API keys → Secret keys)." >&2
  exit 1
fi

current=$(curl -s "https://api.clerk.com/v1/instance" \
  -H "Authorization: Bearer ${SECRET}")

if echo "$current" | grep -q '"errors"'; then
  echo "Clerk API error:" >&2
  echo "$current" >&2
  exit 1
fi

origins=$(echo "$current" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    const j=JSON.parse(d);
    const list = Array.isArray(j.allowed_origins) ? j.allowed_origins.filter(Boolean) : [];
    if (!list.includes('${EXTENSION_ORIGIN}')) list.push('${EXTENSION_ORIGIN}');
    process.stdout.write(JSON.stringify({ allowed_origins: list }));
  });
")

curl -s -X PATCH "https://api.clerk.com/v1/instance" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d "$origins" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const j=JSON.parse(d);
      if (j.errors) { console.error(j); process.exit(1); }
      console.log('Clerk allowed_origins updated:', j.allowed_origins);
    });
  "
