/**
 * Template Loader utility
 *
 * Fetches HTML template files, parses them with DOMParser, caches parsed
 * Documents in a Map, and returns cloned DOM nodes by template ID.
 */

/** @type {Map<string, Document>} */
const cache = new Map();

/**
 * Fetches an HTML template file, parses it, caches the Document,
 * and returns a cloned DOM element for the given template ID.
 *
 * @param {string} filePath - Path to the .html template file
 * @param {string} templateId - The id attribute of the <template> element to clone
 * @returns {Promise<HTMLElement>} Cloned firstElementChild of the template's content
 * @throws {Error} If fetch fails (includes filePath and HTTP status)
 * @throws {Error} If templateId not found (includes templateId and filePath)
 */
export async function loadTemplate(filePath, templateId) {
  if (!cache.has(filePath)) {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${filePath} (HTTP ${response.status})`);
    }
    const text = await response.text();

    // If SPA fallback returned index.html instead of the template file, detect it
    if (text.includes('<!DOCTYPE html>') && text.includes('<div id="app">')) {
      throw new Error(`Template file not found on server: ${filePath} (got index.html fallback)`);
    }

    const doc = new DOMParser().parseFromString(text, 'text/html');
    cache.set(filePath, doc);
  }

  const doc = cache.get(filePath);
  // querySelector on the full document — DOMParser places <template> in <head>
  const template = doc.querySelector(`template[id="${templateId}"]`);

  if (!template) {
    throw new Error(`Template not found: #${templateId} in ${filePath}`);
  }

  return template.content.cloneNode(true).firstElementChild;
}

/**
 * Clears all entries from the template cache.
 */
export function clearCache() {
  cache.clear();
}
