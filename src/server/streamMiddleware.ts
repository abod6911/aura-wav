import type { IncomingMessage, ServerResponse } from 'http';
import http from 'http';
import https from 'https';
import { exec } from 'child_process';
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

  const safeQuery = query.replace(/["$`\\]/g, ' ').trim();
  const cmd = `yt-dlp -f "ba/b" --no-playlist -o "${targetPath}" "ytsearch1:${safeQuery} audio"`;

  exec(cmd, { timeout: 60000 }, (err) => {
    activeDownloads.delete(query);
    if (!err && fs.existsSync(targetPath)) {
      console.log(`[StreamServer] Background download cached: ${path.basename(targetPath)}`);
    }
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
 * Resolves a full-length YouTube audio stream URL using yt-dlp.
 */
function resolveStreamUrlViaYtDlp(query: string): Promise<string> {
  const cacheKey = query.toLowerCase().trim();
  const cached = streamUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.url);
  }

  return new Promise((resolve, reject) => {
    // Sanitize query for shell safety
    const safeQuery = query.replace(/["$`\\]/g, ' ').trim();
    const cmd = `yt-dlp -f "ba/b" -g "ytsearch1:${safeQuery} audio"`;

    exec(cmd, { timeout: 15000 }, (error, stdout, _stderr) => {
      if (error) {
        console.warn(`[StreamServer] yt-dlp error for "${safeQuery}":`, error.message);
        return reject(error);
      }

      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
      if (lines.length > 0) {
        const directUrl = lines[0];
        // Cache URL for 3 hours (GoogleVideo URLs expire in ~6 hours)
        streamUrlCache.set(cacheKey, {
          url: directUrl,
          expiresAt: Date.now() + 3 * 3600 * 1000,
        });
        resolve(directUrl);
      } else {
        reject(new Error(`No stream URL output for query: ${query}`));
      }
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
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
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

      const statusCode = remoteRes.statusCode || 200;
      const responseHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
        'Content-Type': remoteRes.headers['content-type'] || 'audio/webm',
        'Accept-Ranges': 'bytes',
      };

      if (remoteRes.headers['content-length']) {
        responseHeaders['Content-Length'] = remoteRes.headers['content-length'];
      }
      if (remoteRes.headers['content-range']) {
        responseHeaders['Content-Range'] = remoteRes.headers['content-range'];
      }

      res.writeHead(statusCode, responseHeaders);
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
      streamLocalFile(localSong, req, res);
      return;
    }
  }

  // 2. Check if cached in public/stream-cache/
  if (effectiveQuery) {
    const safeBase = cleanFilename(effectiveQuery);
    const cachedWebm = path.join(CACHE_DIR, `${safeBase}.webm`);
    const cachedMp3 = path.join(CACHE_DIR, `${safeBase}.mp3`);

    if (fs.existsSync(cachedWebm)) {
      streamLocalFile(cachedWebm, req, res);
      return;
    }
    if (fs.existsSync(cachedMp3)) {
      streamLocalFile(cachedMp3, req, res);
      return;
    }
  }

  // 3. Resolve direct high-bitrate stream URL via yt-dlp
  if (effectiveQuery) {
    try {
      const streamUrl = await resolveStreamUrlViaYtDlp(effectiveQuery);
      proxyRemoteAudio(streamUrl, req, res);

      // Trigger background download to local cache so future plays/seeks are instant
      const safeBase = cleanFilename(effectiveQuery);
      const targetCachedPath = path.join(CACHE_DIR, `${safeBase}.webm`);
      triggerBackgroundDownload(effectiveQuery, targetCachedPath);
      return;
    } catch (err) {
      console.warn(`[StreamServer] yt-dlp resolution failed for "${effectiveQuery}":`, err);
    }
  }

  // 4. Fallback to iTunes previewUrl if yt-dlp failed or not found (proxied directly with CORS)
  if (previewUrl) {
    proxyRemoteAudio(previewUrl, req, res);
    return;
  }

  res.writeHead(404, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Stream not found' }));
}
