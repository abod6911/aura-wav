import https from 'https';
import http from 'http';
import { URL } from 'url';

// In-memory stream cache to avoid repeated external queries
const streamCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

let cachedClientId = 'pmagYZKQF6mRtNmtRzPkXSQJ76jYHLN8';
let clientIdExpiry = Date.now() + 24 * 3600 * 1000;

function fetchJson(url, headers = {}, timeoutMs = 2500) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'http:' ? http : https;
      const req = client.get(
        parsed,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
            ...headers,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 200, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode || 200, data: null });
            }
          });
        }
      );
      req.on('error', () => resolve({ status: 0, data: null }));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve({ status: 408, data: null });
      });
    } catch {
      resolve({ status: 0, data: null });
    }
  });
}

function fetchText(url, headers = {}, timeoutMs = 2500) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'http:' ? http : https;
      const req = client.get(
        parsed,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...headers,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ status: res.statusCode || 200, data }));
        }
      );
      req.on('error', () => resolve({ status: 0, data: '' }));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve({ status: 408, data: '' });
      });
    } catch {
      resolve({ status: 0, data: '' });
    }
  });
}

async function getWorkingClientId(forceRefresh = false) {
  if (!forceRefresh && cachedClientId && clientIdExpiry > Date.now()) {
    return cachedClientId;
  }

  try {
    const page = await fetchText('https://soundcloud.com', {}, 2500);
    const scriptUrls = [...page.data.matchAll(/src="(https:\/\/[^"]+\.js)"/g)].map((m) => m[1]);
    for (const s of scriptUrls.slice(-6).reverse()) {
      const sRes = await fetchText(s, {}, 2000);
      const m = sRes.data.match(/client_id[:=]"([a-zA-Z0-9]{32})"/);
      if (m) {
        cachedClientId = m[1];
        clientIdExpiry = Date.now() + 12 * 3600 * 1000;
        return cachedClientId;
      }
    }
  } catch {}

  return cachedClientId || 'pmagYZKQF6mRtNmtRzPkXSQJ76jYHLN8';
}

function cleanQueryString(q) {
  return q
    .replace(/[([][^\])]*[)\]]/g, ' ')
    .replace(/ft\.?|feat\.?|remix|official|video|lyrics/gi, ' ')
    .replace(/[^\w\s\u0600-\u06FF-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves full-length audio stream via SoundCloud global Cloudflare CDN.
 * Prioritizes tracks with duration > 60s to completely prevent 30-second previews.
 * On 401/403, invalidates cached client_id, re-fetches once, and retries.
 */
async function resolveViaSoundCloud(query, isRetry = false) {
  let clientId = await getWorkingClientId();
  const cleanQ = cleanQueryString(query);

  const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(cleanQ)}&client_id=${clientId}&limit=8`;
  const res = await fetchJson(searchUrl, {}, 2500);

  // Auto-renew clientId on 401 or 403 and retry once
  if ((res.status === 401 || res.status === 403) && !isRetry) {
    cachedClientId = null;
    clientId = await getWorkingClientId(true);
    return resolveViaSoundCloud(query, true);
  }

  if (!res.data || !res.data.collection || res.data.collection.length === 0) {
    return null;
  }

  // Filter for full-length tracks (> 60s)
  const fullTracks = res.data.collection.filter((t) => t.duration > 60000);
  const candidates = fullTracks.length > 0 ? fullTracks : res.data.collection;

  for (const track of candidates) {
    const transcodings = track.media?.transcodings || [];
    const progressive =
      transcodings.find((t) => t.format?.protocol === 'progressive') ||
      transcodings.find((t) => t.format?.mime_type?.includes('mpeg'));

    if (progressive && progressive.url) {
      let streamRes = await fetchJson(`${progressive.url}?client_id=${clientId}`, {}, 2000);

      if ((streamRes.status === 401 || streamRes.status === 403) && !isRetry) {
        cachedClientId = null;
        clientId = await getWorkingClientId(true);
        streamRes = await fetchJson(`${progressive.url}?client_id=${clientId}`, {}, 2000);
      }

      if (streamRes.data && streamRes.data.url) {
        return {
          url: streamRes.data.url,
          duration: Math.round(track.duration / 1000),
          title: track.title,
          source: 'soundcloud-cdn',
          isPreview: false,
        };
      }
    }
  }

  return null;
}

/**
 * Resolves full-length audio from Archive.org as heritage/tarab fallback.
 */
async function resolveViaArchive(query) {
  try {
    const cleanQ = cleanQueryString(query);
    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(cleanQ + ' mediatype:audio')}&fl[]=identifier,title,duration&rows=3&page=1&output=json`;
    const res = await fetchJson(searchUrl, {}, 2500);
    const docs = res.data?.response?.docs || [];

    for (const doc of docs) {
      if (doc.identifier) {
        const metaUrl = `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}/files`;
        const metaRes = await fetchJson(metaUrl, {}, 2000);
        const files = metaRes.data?.result || [];
        const mp3 = files.find(
          (f) => f.name?.toLowerCase().endsWith('.mp3') && (f.length || f.size > 1000000)
        );
        if (mp3 && mp3.name) {
          const directUrl = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${encodeURIComponent(mp3.name)}`;
          return {
            url: directUrl,
            duration: Math.round(parseFloat(mp3.length || doc.duration || '240')),
            title: doc.title || query,
            source: 'archive-org',
            isPreview: false,
          };
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Fallback to official iTunes 30-second preview stream if all full-length sources fail.
 */
async function resolveViaItunes(query) {
  try {
    const cleanQ = cleanQueryString(query);
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=1`;
    const res = await fetchJson(itunesUrl, {}, 2000);
    const item = res.data?.results?.[0];
    if (item && item.previewUrl) {
      return {
        url: item.previewUrl,
        duration: 30,
        title: item.trackName || query,
        source: 'itunes-preview',
        isPreview: true,
      };
    }
  } catch {}
  return null;
}

export default async function handler(req, res) {
  // CORS Preflight & Universal Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host || 'aura-wav.vercel.app';
  const parsedUrl = new URL(req.url, `https://${host}`);
  const query = parsedUrl.searchParams.get('query') || parsedUrl.searchParams.get('q') || '';
  const preview = parsedUrl.searchParams.get('preview') || '';
  const format = parsedUrl.searchParams.get('format') || '';

  if (!query && !preview) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing query or preview parameter' }));
    return;
  }

  const cacheKey = (query || preview).toLowerCase().trim();
  const cached = streamCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    if (format === 'json') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(JSON.stringify({ success: true, ...cached }));
      return;
    }
    res.writeHead(307, {
      Location: cached.url,
      'Cache-Control': 'public, max-age=3600',
    });
    res.end();
    return;
  }

  // 1. Resolve full-length stream via SoundCloud Cloudflare CDN (with auto-token refresh)
  let resolved = null;
  if (query) {
    resolved = await resolveViaSoundCloud(query);
  }

  // 2. Fallback to Archive.org for Arabic classical / Tarab catalog
  if (!resolved && query) {
    resolved = await resolveViaArchive(query);
  }

  // 3. Fallback to direct previewUrl if passed
  if (!resolved && preview) {
    resolved = {
      url: preview,
      duration: 30,
      title: query || 'Preview Stream',
      source: 'itunes-preview',
      isPreview: true,
    };
  }

  // 4. Fallback to iTunes search preview if neither full stream nor preview URL was available
  if (!resolved && query) {
    resolved = await resolveViaItunes(query);
  }

  if (resolved && resolved.url) {
    // Cache stream for 2 hours
    streamCache.set(cacheKey, {
      url: resolved.url,
      duration: resolved.duration,
      title: resolved.title,
      source: resolved.source,
      isPreview: !!resolved.isPreview,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    if (format === 'json') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(JSON.stringify({ success: true, ...resolved }));
      return;
    }

    // HTTP 307 Temporary Redirect directly to high-speed CDN audio stream
    res.writeHead(307, {
      Location: resolved.url,
      'Cache-Control': 'public, max-age=3600',
    });
    res.end();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Audio stream not found', query }));
}
