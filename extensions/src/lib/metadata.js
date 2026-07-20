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
