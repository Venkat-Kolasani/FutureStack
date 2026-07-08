function getMeta(name) {
  const el = document.querySelector(
    `meta[property="${name}"], meta[name="${name}"]`
  );
  return el ? el.content : null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_METADATA') {
    sendResponse({
      title: getMeta('og:title') || document.title,
      description: getMeta('og:description') || '',
      link: window.location.href,
    });
  }
  return true;
});