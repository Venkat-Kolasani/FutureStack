export const MAX_TITLE = 200;
export const MAX_DESCRIPTION = 5000;
export const MAX_LINK = 500;

export function sanitizeLink(link) {
  if (!link || typeof link !== 'string') return null;
  const trimmed = link.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const candidate = url.toString();
    if (candidate.length > MAX_LINK) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function describeLinkError(link) {
  if (link == null || String(link).trim() === '') return null;
  if (sanitizeLink(link)) return null;

  const trimmed = String(link).trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Use an http or https link.';
    }
    if (url.toString().length > MAX_LINK) {
      return `Link must be ${MAX_LINK} characters or fewer so the job identifier is kept.`;
    }
  } catch {
    return 'Enter a valid page URL.';
  }

  return 'Enter a valid page URL.';
}
