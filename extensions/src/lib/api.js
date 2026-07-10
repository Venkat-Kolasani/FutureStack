const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export async function saveOpportunity(token, payload, signal) {
  const res = await fetch(`${API_BASE}/api/opportunities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  return res.json();
}