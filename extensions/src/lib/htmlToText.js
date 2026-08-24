const BLOCK_TAGS = new Set([
  'p',
  'div',
  'section',
  'article',
  'li',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'br',
  'tr',
  'blockquote',
  'pre',
  'header',
  'footer',
  'dt',
  'dd',
]);

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'iframe']);

export function normalizeText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function serializeNode(node, parts) {
  if (!node) return;

  if (node.nodeType === 3) {
    parts.push(node.nodeValue || '');
    return;
  }

  if (node.nodeType !== 1) return;

  const tag = node.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return;
  if (tag === 'br') {
    parts.push('\n');
    return;
  }

  if (BLOCK_TAGS.has(tag)) parts.push('\n');
  const children = node.childNodes || [];
  for (let i = 0; i < children.length; i += 1) {
    serializeNode(children[i], parts);
  }
  if (BLOCK_TAGS.has(tag) && tag !== 'br') parts.push('\n');
}

export function htmlToText(html, documentObject = globalThis.document) {
  const raw = String(html || '');
  if (!raw.trim()) return '';

  if (documentObject?.createElement) {
    const wrap = documentObject.createElement('div');
    wrap.innerHTML = raw;
    const parts = [];
    serializeNode(wrap, parts);
    return normalizeText(parts.join(''));
  }

  const stripped = raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote|header|footer)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return normalizeText(decodeEntities(stripped));
}

export function elementToText(element) {
  if (!element) return '';
  const doc = element.ownerDocument || globalThis.document;
  return htmlToText(element.innerHTML || element.textContent || '', doc);
}
