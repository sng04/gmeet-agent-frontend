/**
 * Sanitize a string for safe HTML rendering.
 * Strips known model artifact tags, detects XSS payloads, then HTML-escapes.
 */
export function sanitize(str) {
  if (!str) return '';
  // Strip model thinking/reflection/scratchpad tags before XSS check
  let s = str
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')
    .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '')
    .replace(/<output>|<\/output>/gi, '')
    .replace(/<answer>|<\/answer>/gi, '')
    .replace(/<response>|<\/response>/gi, '')
    .trim();
  if (!s) return '';
  if (/<script|onerror|onload|javascript:|<img|<svg|<iframe|<embed|<object|onclick|onmouseover/i.test(s)) {
    return '[Invalid content]';
  }
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
