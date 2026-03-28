/**
 * Extract an array from a standard API response envelope.
 * Handles: { data: [...] }, { data: { items: [...] } }, { data: { agents: [...] } }, etc.
 * @param {object} res - The full API response
 * @returns {Array}
 */
export function extractList(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object') {
    // Find the first array value in data
    for (const val of Object.values(d)) {
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}

/**
 * Extract a single item from a standard API response envelope.
 * Handles: { data: { agent: {...} } }, { data: {...} }, etc.
 * @param {object} res - The full API response
 * @returns {object}
 */
export function extractItem(res) {
  const d = res?.data;
  if (!d || typeof d !== 'object') return d;
  // If data has typical envelope keys (statusCode, status, message), it's the item itself
  // Otherwise check if there's a single nested object that's the actual item
  const keys = Object.keys(d);
  if (keys.length === 1 && typeof d[keys[0]] === 'object' && !Array.isArray(d[keys[0]])) {
    return d[keys[0]];
  }
  return d;
}
