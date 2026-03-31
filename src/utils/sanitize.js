/**
 * Sanitize a string for safe HTML rendering.
 * Detects XSS payloads and replaces with placeholder, otherwise HTML-escapes.
 */
export function sanitize(str) {
  if (!str) return '';
  if (/<script|onerror|onload|javascript:|<img|<svg|<iframe|<embed|<object|onclick|onmouseover/i.test(str)) {
    return '[Invalid content]';
  }
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
