/**
 * Safely normalizes audio and artwork URLs without double-encoding existing
 * `%XX` percent-escapes (such as `%2C`, `%26`, `%2B`, `%20`).
 *
 * Avoids the classic `encodeURI(decodeURI(url))` bug where `decodeURI` skips
 * reserved escapes like `%2C` and `encodeURI` turns them into `%252C` (HTTP 404).
 */
export function normalizeStreamUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Separate query/hash if present
  const hashIdx = trimmed.indexOf('#');
  const withoutHash = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const hashPart = hashIdx >= 0 ? trimmed.slice(hashIdx) : '';

  const queryIdx = withoutHash.indexOf('?');
  const basePath = queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash;
  const queryPart = queryIdx >= 0 ? withoutHash.slice(queryIdx) : '';

  // Encode raw spaces and non-ASCII chars ONLY, preserving valid %XX escapes intact
  const encodedBase = basePath.replace(/(%[0-9A-Fa-f]{2})|([^\x21-\x7E])/g, (match, pct, nonAscii) => {
    if (pct) return pct;
    if (nonAscii) return encodeURIComponent(nonAscii);
    return match;
  }).replace(/ /g, '%20');

  return `${encodedBase}${queryPart}${hashPart}`;
}
