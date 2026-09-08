import { NextRequest, NextResponse } from 'next/server';

/**
 * Production-Grade YouTube Music Audio Stream Resolver & Proxy
 * Supports HTTP 206 Partial Content Range Requests for fast audio seeking.
 */

// Fallback high-availability Invidious & Piped public instances
const STREAM_PROVIDERS = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
];

interface AudioFormat {
  url: string;
  mimeType: string;
  bitrate?: number;
  contentLength?: string;
}

async function resolveDirectAudioUrl(videoId: string): Promise<string | null> {
  // 1. Try Invidious video metadata endpoint
  for (const baseUrl of STREAM_PROVIDERS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${baseUrl}/api/v1/videos/${encodeURIComponent(videoId)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();

      if (data && Array.isArray(data.adaptiveFormats)) {
        // Find best audio format (Opus or AAC with highest bitrate)
        const audioFormats = data.adaptiveFormats
          .filter((f: AudioFormat) => f.mimeType && f.mimeType.startsWith('audio/'))
          .sort((a: AudioFormat, b: AudioFormat) => (b.bitrate || 0) - (a.bitrate || 0));

        if (audioFormats.length > 0 && audioFormats[0].url) {
          return audioFormats[0].url;
        }
      }
    } catch {
      // Try next provider on timeout or error
      continue;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid track ID' }, { status: 400 });
  }

  try {
    const directAudioUrl = await resolveDirectAudioUrl(id);

    if (!directAudioUrl) {
      return NextResponse.json(
        { error: 'Unable to resolve audio stream for track: ' + id },
        { status: 502 }
      );
    }

    // Prepare range headers for proxying
    const rangeHeader = req.headers.get('range');
    const upstreamHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const upstreamResponse = await fetch(directAudioUrl, {
      headers: upstreamHeaders,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamResponse.headers.get('content-type') || 'audio/webm; codecs="opus"');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range');
    responseHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');

    if (upstreamResponse.headers.has('content-length')) {
      responseHeaders.set('Content-Length', upstreamResponse.headers.get('content-length')!);
    }
    if (upstreamResponse.headers.has('content-range')) {
      responseHeaders.set('Content-Range', upstreamResponse.headers.get('content-range')!);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('Audio Stream Resolver Error:', err);
    return NextResponse.json(
      { error: 'Internal streaming error', details: err?.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
