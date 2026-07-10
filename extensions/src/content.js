function getMeta(name) {
  const el = document.querySelector(
    `meta[property="${name}"], meta[name="${name}"]`
  );
  return el ? el.content : null;
}

function getPageMetadata() {
  return {
    title: getMeta('og:title') || document.title,
    description: getMeta('og:description') || '',
    link: window.location.href,
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_METADATA') {
    sendResponse(getPageMetadata());
  }
  return true;
});