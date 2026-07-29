const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
const API_URL = API_BASE.endsWith('/api') || API_BASE.endsWith('/api/v1')
  ? `${API_BASE.replace(/\/v1$/, '')}/v1`
  : `${API_BASE}/api/v1`;

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_LINK = 500;

function sanitizeLink(link) {
  if (!link || typeof link !== 'string') return null;
  const trimmed = link.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    let candidate = url.toString();
    if (candidate.length > MAX_LINK) {
      candidate = `${url.origin}${url.pathname}`;
    }
    if (candidate.length > MAX_LINK) return null;
    return candidate;
  } catch {
    return null;
  }
}

function sanitizeCampusMode(campusMode) {
  if (campusMode === 'on_campus' || campusMode === 'off_campus') {
    return campusMode;
  }
  return null;
}

function sanitizePayload(payload) {
  const title = String(payload.title || '').trim().slice(0, MAX_TITLE);
  const description = String(payload.description || '').trim().slice(0, MAX_DESCRIPTION);
  const link = sanitizeLink(payload.link);

  return {
    title,
    description: description || null,
    link,
    category: payload.category || 'internship',
    status: payload.status || 'applied',
    campus_mode: sanitizeCampusMode(payload.campus_mode),
  };
}

async function readErrorMessage(res) {
  try {
    const body = await res.json();
    const detail = Array.isArray(body?.details)
      ? body.details.map((d) => d.message).filter(Boolean).join('; ')
      : '';
    return detail || body?.message || body?.error || `Save failed: ${res.status}`;
  } catch {
    return `Save failed: ${res.status}`;
  }
}

export async function saveOpportunity(token, payload, signal) {
  const body = sanitizePayload(payload);
  if (!body.title) {
    throw new Error('Title is required');
  }

  const res = await fetch(`${API_URL}/opportunities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return res.json();
}
