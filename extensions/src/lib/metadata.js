export function getMeta(name, documentObject = document) {
  const element = documentObject.querySelector(
    `meta[property="${name}"], meta[name="${name}"]`
  );
  return element ? element.content : null;
}

export function getPageMetadata(documentObject = document, locationObject = window.location) {
  return {
    title: getMeta('og:title', documentObject) || documentObject.title,
    description: getMeta('og:description', documentObject) || '',
    link: locationObject.href,
  };
}

/**
 * Self-contained scraper for chrome.scripting.executeScript({ func }).
 * Must not close over imports — Chrome serializes only this function body.
 */
export function scrapePageInTab() {
  const readMeta = (name) => {
    const element = document.querySelector(
      `meta[property="${name}"], meta[name="${name}"]`
    );
    return element ? element.content : null;
  };

  return {
    title: readMeta('og:title') || document.title,
    description: readMeta('og:description') || '',
    link: window.location.href,
  };
}
