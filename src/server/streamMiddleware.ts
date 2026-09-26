import type { IncomingMessage, ServerResponse } from 'http';
import http from 'http';
import https from 'https';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

// In-memory cache for resolved stream URLs to avoid re-invoking yt-dlp repeatedly
interface CachedStream {
  url: string;
  expiresAt: number;
}
const streamUrlCache = new Map<string, CachedStream>();

// Cache directory for downloaded/streamed audio tracks
const CACHE_DIR = path.resolve(process.cwd(), 'public', 'stream-cache');
const SONGS_DIR = path.resolve(process.cwd(), 'public', 'songs');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}

const activeDownloads = new Set<string>();

function triggerBackgroundDownload(query: string, targetPath: string): void {
  if (activeDownloads.has(query) || fs.existsSync(targetPath)) return;
  activeDownloads.add(query);

  const cleanQ = query.trim();
  const args = [
    '-f',
    '140/ba[ext=m4a]/ba[ext=mp3]/ba/b',
    '--no-playlist',
    '--no-warnings',
    '--extractor-args',
    'youtube:player_client=android,web',
    '-o',
    targetPath,
    `ytsearch1:${cleanQ} audio`,
  ];

  const child = spawn('yt-dlp', args, {
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });

  child.on('close', (code) => {
    activeDownloads.delete(query);
    if (code === 0 && fs.existsSync(targetPath)) {
      console.log(`[StreamServer] Background download cached: ${path.basename(targetPath)}`);
    }
  });

  child.on('error', () => {
    activeDownloads.delete(query);
  });
}

function cleanFilename(str: string): string {
  return str
    .replace(/[^\w\s\u0600-\u06FF.-]/gi, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Searches public/songs/ for an existing local audio file matching the query.
 */
function findExistingLocalSong(query: string): string | null {
  if (!fs.existsSync(SONGS_DIR)) return null;

  try {
    const files = fs.readdirSync(SONGS_DIR);
    const cleanQ = query.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/gi, ' ').trim();
    const tokens = cleanQ.split(/\s+/).filter(t => t.length > 2);

    if (tokens.length === 0) return null;

    // 1. Check exact match
    for (const file of files) {
      if (file.endsWith('.part') || file.endsWith('.ytdl')) continue;
      const cleanF = file.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/gi, ' ');
      if (cleanF.includes(cleanQ)) {
        return path.join(SONGS_DIR, file);
      }
    }

    // 2. Check if all query tokens match filename
    for (const file of files) {
      if (file.endsWith('.part') || file.endsWith('.ytdl')) continue;
      const cleanF = file.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/gi, ' ');
      const allTokensMatch = tokens.every(t => cleanF.includes(t));
      if (allTokensMatch) {
        return path.join(SONGS_DIR, file);
      }
    }
  } catch (err) {
    console.warn('[StreamServer] Error searching local songs:', err);
  }

  return null;
}

/**
 * Resolves a full-length YouTube audio stream URL using yt-dlp via spawn (UTF-8 safe for Arabic).
 * Prioritizes format 140 (AAC / m4a) which is universally compatible with iOS, Safari, CarPlay, Android & Windows.
 */
function resolveStreamUrlViaYtDlp(query: string): Promise<string> {
  const cacheKey = query.toLowerCase().trim();
  const cached = streamUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.url);
  }

  return new Promise((resolve, reject) => {
    const cleanQ = query.trim();
    const args = [
      '-f',
      '140/ba[ext=m4a]/ba[ext=mp3]/ba/b',
      '--no-playlist',
      '--no-warnings',
      '--extractor-args',
      'youtube:player_client=android,web',
      '-g',
      `ytsearch1:${cleanQ} audio`,
    ];

    const child = spawn('yt-dlp', args, {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {}
      reject(new Error(`yt-dlp timeout for query: ${cleanQ}`));
    }, 15000);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout) {
        const lines = stdout.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('http'));
        if (lines.length > 0) {
          const directUrl = lines[0];
          // Cache URL for 3 hours (GoogleVideo URLs expire in ~6 hours)
          streamUrlCache.set(cacheKey, {
            url: directUrl,
            expiresAt: Date.now() + 3 * 3600 * 1000,
          });
          resolve(directUrl);
          return;
        }
      }
      reject(new Error(`yt-dlp failed (code ${code}): ${stderr || 'No stream URL'}`));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Streams a local audio file with full HTTP Range request support (206 Partial Content).
 */
function streamLocalFile(filePath: string, req: IncomingMessage, res: ServerResponse): void {
  try {
    const stat = fs.statSync(filePath);
    const totalSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.webm' ? 'audio/webm' : ext === '.m4a' ? 'audio/mp4' : 'audio/mpeg';

    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.end();
      return;
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${totalSize}`,
          'Access-Control-Allow-Origin': '*',
        });
        res.end();
        return;
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[StreamServer] Error streaming local file:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
      res.end('File read error');
    }
  }
}

/**
 * Proxies a remote audio stream to client with full Range support, CORS headers, and redirect following.
 */
function proxyRemoteAudio(
  targetUrl: string,
  req: IncomingMessage,
  res: ServerResponse,
  redirectCount = 0
): void {
  if (redirectCount > 5) {
    if (!res.headersSent) {
      res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
      res.end('Too many redirects');
    }
    return;
  }

  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'http:' ? http : https;
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const remoteReq = client.get(targetUrl, { headers }, (remoteRes) => {
      // Follow redirects
      if (
        (remoteRes.statusCode === 301 ||
          remoteRes.statusCode === 302 ||
          remoteRes.statusCode === 303 ||
          remoteRes.statusCode === 307 ||
          remoteRes.statusCode === 308) &&
        remoteRes.headers.location
      ) {
        const nextUrl = new URL(remoteRes.headers.location, targetUrl).toString();
        proxyRemoteAudio(nextUrl, req, res, redirectCount + 1);
        return;
      }

      const rawType = (remoteRes.headers['content-type'] || '').toLowerCase();
      let contentType = 'audio/mp4';
      if (rawType.includes('webm') || targetUrl.includes('.webm') || targetUrl.includes('mime=audio%2Fwebm')) {
        contentType = 'audio/webm';
      } else if (rawType.includes('mpeg') || rawType.includes('mp3') || targetUrl.includes('.mp3')) {
        contentType = 'audio/mpeg';
      } else {
        contentType = 'audio/mp4';
      }

      const statusCode = remoteRes.statusCode || 200;
      const responseHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      };

      if (remoteRes.headers['content-length']) {
        responseHeaders['Content-Length'] = remoteRes.headers['content-length'];
      }
      if (remoteRes.headers['content-range']) {
        responseHeaders['Content-Range'] = remoteRes.headers['content-range'];
      }

      res.writeHead(statusCode, responseHeaders);

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      remoteRes.pipe(res);
    });

    remoteReq.on('error', (err) => {
      console.error('[StreamServer] Remote proxy error:', err);
      if (!res.headersSent) {
        res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
        res.end('Remote stream proxy error');
      }
    });
  } catch (err) {
    console.error('[StreamServer] Invalid proxy URL:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
      res.end('Stream URL error');
    }
  }
}

// Dynamic SoundCloud client ID holder
let scClientId = 'pmagYZKQF6mRtNmtRzPkXSQJ76jYHLN8';
let scClientIdExpiry = Date.now() + 24 * 3600 * 1000;

async function getWorkingSoundCloudClientId(): Promise<string> {
  if (scClientId && scClientIdExpiry > Date.now()) return scClientId;
  try {
    const pageRes = await fetch('https://soundcloud.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await pageRes.text();
    const scriptUrls = [...html.matchAll(/src="(https:\/\/[^"]+\.js)"/g)].map(m => m[1]);
    for (const s of scriptUrls.slice(-6).reverse()) {
      const sRes = await fetch(s);
      const jsText = await sRes.text();
      const m = jsText.match(/client_id[:=]"([a-zA-Z0-9]{32})"/);
      if (m) {
        scClientId = m[1];
        scClientIdExpiry = Date.now() + 12 * 3600 * 1000;
        return scClientId;
      }
    }
  } catch {}
  return scClientId || 'pmagYZKQF6mRtNmtRzPkXSQJ76jYHLN8';
}

async function resolveViaSoundCloud(query: string): Promise<{ url: string; duration: number; title: string } | null> {
  try {
    const clientId = await getWorkingSoundCloudClientId();
    const cleanQ = query
      .replace(/[([][^\])]*[)\]]/g, ' ')
      .replace(/ft\.?|feat\.?|remix|official|video|lyrics/gi, ' ')
      .replace(/[^\w\s\u0600-\u06FF-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(cleanQ)}&client_id=${clientId}&limit=10`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data || !data.collection || data.collection.length === 0) return null;

    const fullTracks = data.collection.filter((t: any) => t.duration > 60000);
    const candidates = fullTracks.length > 0 ? fullTracks : data.collection;

    for (const track of candidates) {
      const trans = track.media?.transcodings || [];
      const progressive = trans.find((t: any) => t.format?.protocol === 'progressive') ||
                          trans.find((t: any) => t.format?.mime_type?.includes('mpeg'));
      if (progressive && progressive.url) {
        const streamRes = await fetch(`${progressive.url}?client_id=${clientId}`);
        if (streamRes.ok) {
          const sData: any = await streamRes.json();
          if (sData && sData.url) {
            return {
              url: sData.url,
              duration: Math.round(track.duration / 1000),
              title: track.title,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('[StreamServer] SoundCloud resolution error:', err);
  }
  return null;
}

/**
 * Handles incoming /api/stream HTTP requests.
 */
export async function handleStreamRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '', 'http://localhost');
  const query = parsedUrl.searchParams.get('query') || parsedUrl.searchParams.get('q') || '';
  const videoId = parsedUrl.searchParams.get('id') || '';
  const previewUrl = parsedUrl.searchParams.get('preview') || '';
  const format = parsedUrl.searchParams.get('format') || '';

  const effectiveQuery = query || (videoId ? `videoId:${videoId}` : '');

  if (!effectiveQuery && !previewUrl) {
    res.writeHead(400, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing query or preview parameter' }));
    return;
  }

  // 1. Check if matching full song exists in public/songs/
  if (effectiveQuery) {
    const localSong = findExistingLocalSong(effectiveQuery);
    if (localSong) {
      if (format === 'json') {
        const relUrl = `/songs/${encodeURIComponent(path.basename(localSong))}`;
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: relUrl, source: 'local' }));
        return;
      }
      streamLocalFile(localSong, req, res);
      return;
    }
  }

  // 2. Check if cached in public/stream-cache/ (check m4a first, then mp3)
  if (effectiveQuery) {
    const safeBase = cleanFilename(effectiveQuery);
    const cachedM4a = path.join(CACHE_DIR, `${safeBase}.m4a`);
    const cachedMp3 = path.join(CACHE_DIR, `${safeBase}.mp3`);

    if (fs.existsSync(cachedM4a)) {
      if (format === 'json') {
        const relUrl = `/stream-cache/${encodeURIComponent(`${safeBase}.m4a`)}`;
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: relUrl, source: 'cache' }));
        return;
      }
      streamLocalFile(cachedM4a, req, res);
      return;
    }
    if (fs.existsSync(cachedMp3)) {
      if (format === 'json') {
        const relUrl = `/stream-cache/${encodeURIComponent(`${safeBase}.mp3`)}`;
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: relUrl, source: 'cache' }));
        return;
      }
      streamLocalFile(cachedMp3, req, res);
      return;
    }
  }

  // 3. Fast SoundCloud Cloudflare CDN resolution (300ms response, full track length)
  if (effectiveQuery) {
    const scResult = await resolveViaSoundCloud(effectiveQuery);
    if (scResult && scResult.url) {
      if (format === 'json') {
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: scResult.url, duration: scResult.duration, title: scResult.title, source: 'soundcloud-cdn' }));
        return;
      }
      // Redirect directly to high-speed Cloudflare CDN
      res.writeHead(307, {
        Location: scResult.url,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end();
      return;
    }
  }

  // 4. Resolve direct high-bitrate stream URL via yt-dlp
  if (effectiveQuery) {
    try {
      const streamUrl = await resolveStreamUrlViaYtDlp(effectiveQuery);
      if (format === 'json') {
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: streamUrl, source: 'yt-dlp' }));
        return;
      }
      proxyRemoteAudio(streamUrl, req, res);

      // Trigger background download to local cache as universal m4a so future plays/seeks are instant
      const safeBase = cleanFilename(effectiveQuery);
      const targetCachedPath = path.join(CACHE_DIR, `${safeBase}.m4a`);
      triggerBackgroundDownload(effectiveQuery, targetCachedPath);
      return;
    } catch (err) {
      console.warn(`[StreamServer] yt-dlp resolution failed for "${effectiveQuery}":`, err);
    }
  }

  // 5. Fallback to iTunes previewUrl if full resolution failed (proxied directly with CORS)
  if (previewUrl) {
    if (format === 'json') {
      res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, url: previewUrl, duration: 30, source: 'preview' }));
      return;
    }
    proxyRemoteAudio(previewUrl, req, res);
    return;
  }

  res.writeHead(404, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Stream not found' }));
}
