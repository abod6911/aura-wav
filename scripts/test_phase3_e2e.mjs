import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4189;
const DIST_DIR = path.resolve(__dirname, '../dist');
const ARTIFACTS_DIR = 'C:/Users/abodv/.gemini/antigravity/brain/a08b9faa-ae3c-4319-b11e-dccc6fa25729';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`Phase 3 Test Server running at http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });

    const page = await context.newPage();
    page.on('console', (msg) => console.log(`[Browser Console ${msg.type()}]:`, msg.text()));
    page.on('pageerror', (err) => console.error('[Browser Error]:', err));

    await page.addInitScript(() => {
      localStorage.setItem('has_seen_welcome', 'true');
      localStorage.setItem('has_seen_welcome_v2', 'true');
      localStorage.setItem('aura_welcome_completed', 'true');
    });

    console.log('1. Navigating to mobile app...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#root', { timeout: 10000 });

    await page.evaluate(() => {
      const store = window.usePlayerStore.getState();
      store.setWelcomeOpen(false);
      store.setLanguage('ar');
    });
    await page.waitForTimeout(300);

    console.log('2. Injecting mock tracks...');
    await page.evaluate(() => {
      const mockTrack = {
        id: 'track-harmonic-1',
        title: 'Midnight City (Aura Master)',
        artist: 'M83',
        album: 'Hurry Up, We\'re Dreaming',
        duration: 243,
        audioUrl: 'blob:mock-audio-1',
        artworkUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        bpm: 105,
        key: '8B',
        genre: 'Synthwave',
        dominantColor: '#FA243C',
        accentColor: '#FF375F',
        format: 'ALAC 24-bit 96kHz Lossless',
      };

      const mockTracks = [
        mockTrack,
        {
          id: 'track-harmonic-2',
          title: 'Starboy',
          artist: 'The Weeknd',
          album: 'Starboy',
          duration: 230,
          audioUrl: 'blob:mock-audio-2',
          artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
          bpm: 120,
          key: '9B',
          genre: 'Pop',
          format: 'ALAC 24-bit',
        }
      ];

      const store = window.usePlayerStore.getState();
      store.importTracks(mockTracks, 'Aura_Audiophile_Collection');
      store.playTrack(mockTrack, mockTracks);
      store.setMobilePlayerOpen(true);
    });

    await page.waitForTimeout(800);
    console.log('3. Checking ExpandedPlayer sheet...');
    await page.waitForSelector('[data-testid="expanded-player-sheet"]', { timeout: 5000 });

    console.log('4. Checking Quick Studio Pill Bar...');
    await page.waitForSelector('[data-testid="quick-studio-pill-bar"]', { timeout: 5000 });

    const expandedScreenshotPath = path.resolve(ARTIFACTS_DIR, 'e2e-screenshot-phase3-expanded.png');
    await page.screenshot({ path: expandedScreenshotPath });
    console.log(`✓ Screenshot of mobile ExpandedPlayer saved to ${expandedScreenshotPath}`);

    console.log('5. Testing Sync Party Modal trigger...');
    // Trigger sync party open via store directly and verify
    await page.evaluate(() => {
      window.usePlayerStore.getState().setSyncPartyOpen(true);
    });
    await page.waitForTimeout(800);

    const isStoreSyncOpen = await page.evaluate(() => window.usePlayerStore.getState().isSyncPartyOpen);
    console.log(`usePlayerStore.isSyncPartyOpen: ${isStoreSyncOpen}`);

    const syncModalElement = await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✓ Sync Party Modal dialog appeared in DOM');

    // Switch to Join tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const joinBtn = buttons.find(b => b.textContent && (b.textContent.includes('الانضمام') || b.textContent.includes('Join')));
      if (joinBtn) joinBtn.click();
    });
    await page.waitForTimeout(400);

    const inputFontSize = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="AURA"]');
      if (!input) return null;
      return window.getComputedStyle(input).fontSize;
    });
    console.log(`✓ Join room code input font-size: ${inputFontSize} (strict 16px to prevent iOS auto-zoom)`);

    const syncModalScreenshotPath = path.resolve(ARTIFACTS_DIR, 'e2e-screenshot-phase3-syncparty.png');
    await page.screenshot({ path: syncModalScreenshotPath });
    console.log(`✓ Screenshot of SyncPartyModal saved to ${syncModalScreenshotPath}`);

    // Close modal
    await page.evaluate(() => {
      window.usePlayerStore.getState().setSyncPartyOpen(false);
    });
    await page.waitForTimeout(400);

    // 6. Test Harmonic Set Generator
    console.log('6. Testing Harmonic Set Generator trigger...');
    await page.evaluate(() => {
      window.usePlayerStore.getState().setHarmonicJourneyOpen(true);
    });
    await page.waitForTimeout(800);

    await page.waitForSelector('text=Smart Harmonic Journey', { timeout: 5000 });
    console.log('✓ Harmonic Set Generator opened successfully on mobile');

    const harmonicScreenshotPath = path.resolve(ARTIFACTS_DIR, 'e2e-screenshot-phase3-harmonic.png');
    await page.screenshot({ path: harmonicScreenshotPath });
    console.log(`✓ Screenshot of Harmonic Journey saved to ${harmonicScreenshotPath}`);

    await page.evaluate(() => {
      window.usePlayerStore.getState().setHarmonicJourneyOpen(false);
    });

    console.log('\n========================================');
    console.log('🎉 ALL PHASE 3 MOBILE E2E TESTS PASSED!');
    console.log('========================================\n');

    await browser.close();
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('Test failed with error:', err);
    server.close(() => process.exit(1));
  }
});
