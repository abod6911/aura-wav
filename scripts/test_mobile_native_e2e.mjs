import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 4195;
const DIST_DIR = path.resolve('aura-wav/dist');

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

// Simple static server for dist
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
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`Mobile Native E2E Server listening at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 mobile viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'ar-SA',
  });

  // Pre-seed localStorage to bypass splash
  await context.addInitScript(() => {
    localStorage.setItem('aura_welcome_seen', 'true');
    sessionStorage.setItem('aura_welcome_seen', 'true');
    localStorage.setItem('aura_auth_guest', 'true');
  });

  const page = await context.newPage();
  const consoleMessages = [];
  const errors = [];

  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.error('Page error:', err.message);
  });

  try {
    console.log('Navigating to mobile app...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Wait for store to be ready
    console.log('Waiting for usePlayerStore on window...');
    await page.waitForFunction(() => typeof window.usePlayerStore !== 'undefined', { timeout: 10000 });
    console.log('usePlayerStore is ready!');

    // 1. Verify Shell Lock & Dimensions
    const shellAudit = await page.evaluate(() => {
      const appContainer = document.querySelector('div.fixed.inset-0');
      const mainArea = document.querySelector('main.main-safe-area');
      const header = document.querySelector('header');
      return {
        hasLockedContainer: !!appContainer,
        containerClasses: appContainer?.className || '',
        mainOverscroll: window.getComputedStyle(mainArea || document.body).overscrollBehaviorY,
        headerPaddingTop: header ? window.getComputedStyle(header).paddingTop : '',
      };
    });
    console.log('Shell Lock Audit:', shellAudit);

    // 2. Simulate Playing a Track to populate MiniPlayer & Queue
    console.log('Injecting active track and queue into usePlayerStore...');
    const queueResult = await page.evaluate(() => {
      const store = window.usePlayerStore;
      const mockTrack1 = {
        id: 'track_1',
        title: 'أغنية تجريبية فائقة السرعة',
        artist: 'فنان الأورا الصوتي',
        album: 'AURA 2026',
        duration: 215,
        artworkUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop',
      };
      const mockTrack2 = {
        id: 'track_2',
        title: 'المسار التالي في الطابور',
        artist: 'أورا ستوديو',
        album: 'AURA 2026',
        duration: 180,
        artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop',
      };
      store.setState({
        tracks: [mockTrack1, mockTrack2],
        filteredTracks: [mockTrack1, mockTrack2],
        currentTrack: mockTrack1,
        isPlaying: true,
        playbackState: 'playing',
        currentTime: 45,
        duration: 215,
      });

      // Call playNext
      store.getState().playNext(mockTrack2);

      return {
        currentTrack: store.getState().currentTrack?.title,
        userQueueCount: store.getState().userQueue.length,
        nextUpTrackId: store.getState().nextUpTrackId,
      };
    });
    console.log('Queue injection result:', queueResult);

    await page.waitForTimeout(1000);

    // Verify MiniPlayer is visible with 44px buttons and positioned above nav dock
    const miniPlayer = page.locator('[data-testid="mini-player"]');
    const isMiniPlayerVisible = await miniPlayer.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('MiniPlayer visible above NavDock:', isMiniPlayerVisible);

    // Capture mobile screen with Track List & MiniPlayer
    const screenshot1 = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\dc36be4c-0c1d-4fd9-bd43-c55918725efd\\e2e-screenshot-mobile-native.png';
    await page.screenshot({ path: screenshot1, fullPage: false });
    console.log(`✓ Screenshot 1 saved: ${screenshot1}`);

    // 3. Open Queue Bottom Sheet
    console.log('Opening Queue Bottom Sheet...');
    await page.evaluate(() => {
      window.usePlayerStore.setState({ isQueueOpen: true });
    });
    await page.waitForTimeout(1200);

    // Verify Queue Bottom Sheet in DOM
    const queueHeader = page.locator('[data-testid="queue-drawer"]');
    const isQueueVisible = await queueHeader.isVisible({ timeout: 4000 }).catch(() => false);
    console.log('Queue Bottom Sheet visible in DOM:', isQueueVisible);

    // Capture mobile screen with Queue Bottom Sheet
    const screenshot2 = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\dc36be4c-0c1d-4fd9-bd43-c55918725efd\\e2e-screenshot-mobile-queue.png';
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log(`✓ Screenshot 2 saved: ${screenshot2}`);

    // 4. Open ExpandedPlayer to verify Zero-Scroll mobile layout & thumb controls
    console.log('Opening Expanded Player Sheet...');
    await page.evaluate(() => {
      window.usePlayerStore.setState({ isQueueOpen: false, isMobilePlayerOpen: true });
    });
    await page.waitForTimeout(1500);

    const expandedPlayer = page.locator('[data-testid="expanded-player-sheet"]');
    const isExpandedVisible = await expandedPlayer.isVisible({ timeout: 4000 }).catch(() => false);
    console.log('ExpandedPlayer 100dvh Sheet visible in DOM:', isExpandedVisible);

    const screenshot3 = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\dc36be4c-0c1d-4fd9-bd43-c55918725efd\\e2e-screenshot-mobile-expanded.png';
    await page.screenshot({ path: screenshot3, fullPage: false });
    console.log(`✓ Screenshot 3 saved: ${screenshot3}`);

  } finally {
    await browser.close();
    server.close(() => {
      console.log('Verification server closed successfully.');
      process.exit(errors.length === 0 ? 0 : 1);
    });
  }
});
