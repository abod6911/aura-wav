import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 4192;
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
  console.log(`Phase 4 E2E Server listening at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'ar-SA',
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
    console.log('Navigating to app...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Dismiss welcome splash if present
    const dismissBtn = page.locator('button:has-text("ابدأ الاستماع الآن"), button:has-text("Start Listening")');
    if (await dismissBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await dismissBtn.click();
      await page.waitForTimeout(500);
    }

    // Wait for store to be ready on window
    console.log('Waiting for usePlayerStore on window...');
    await page.waitForFunction(() => typeof window.usePlayerStore !== 'undefined', { timeout: 10000 });
    console.log('usePlayerStore is ready!');

    console.log('Testing Circuit Breaker & Directory Permission Banner via usePlayerStore...');
    const testResults = await page.evaluate(async () => {
      const store = window.usePlayerStore;
      if (!store) return { success: false, reason: 'usePlayerStore not attached to window' };

      const out = {};

      // Test 1: Single failure
      const mock1 = { id: 'corrupt_1', title: 'Corrupted Track 1', artist: 'Artist 1' };
      await store.getState().handleTrackPlaybackError(mock1, new Error('Simulated playback error 1'));
      out.step1 = {
        consecutiveErrors: store.getState().consecutivePlaybackErrors,
        isUnavailable: store.getState().unavailableTrackIds.includes('corrupt_1'),
      };

      // Test 2: Second failure
      const mock2 = { id: 'corrupt_2', title: 'Corrupted Track 2', artist: 'Artist 2' };
      await store.getState().handleTrackPlaybackError(mock2, new Error('Simulated playback error 2'));
      out.step2 = {
        consecutiveErrors: store.getState().consecutivePlaybackErrors,
        isUnavailable: store.getState().unavailableTrackIds.includes('corrupt_2'),
      };

      // Test 3: Third failure (Triggers Circuit Breaker: consecutivePlaybackErrors resets to 0, playbackState -> error, isPlaying -> false)
      const mock3 = { id: 'corrupt_3', title: 'Corrupted Track 3', artist: 'Artist 3' };
      await store.getState().handleTrackPlaybackError(mock3, new Error('Simulated playback error 3'));
      out.step3 = {
        consecutiveErrors: store.getState().consecutivePlaybackErrors,
        playbackState: store.getState().playbackState,
        isPlaying: store.getState().isPlaying,
        isUnavailable: store.getState().unavailableTrackIds.includes('corrupt_3'),
      };

      // Test 4: Offline fallback transition
      await store.getState().handleOfflineTransition();
      out.offlineCalled = true;

      // Test 5: Directory Permission Banner activation
      store.setState({
        needsDirectoryPermission: true,
        savedFolderName: 'Liked_Songs_Vault',
      });
      out.bannerActive = store.getState().needsDirectoryPermission;

      return { success: true, details: out };
    });

    console.log('E2E Evaluation Results:', JSON.stringify(testResults, null, 2));

    await page.waitForTimeout(1000);

    // Verify Directory Permission Banner in DOM
    const banner = page.locator('button:has-text("استعادة إذن المجلد"), button:has-text("Restore Folder Access")');
    const isBannerVisible = await banner.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Directory Permission Banner button visible in DOM:', isBannerVisible);

    // Also verify Directory Permission Prompt text
    const promptText = page.locator('span:has-text("مطلوب تأكيد إذن الوصول لمجلد الموسيقى المحلي"), span:has-text("Permission confirmation required")');
    const isPromptVisible = await promptText.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Directory Permission Prompt text visible in DOM:', isPromptVisible);

    // Save screenshot to artifacts directory
    const screenshotPath = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\a08b9faa-ae3c-4319-b11e-dccc6fa25729\\e2e-screenshot-phase4.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`✓ E2E Screenshot saved: ${screenshotPath}`);

  } finally {
    await browser.close();
    server.close(() => {
      console.log('Verification server closed successfully.');
      process.exit(errors.length === 0 ? 0 : 1);
    });
  }
});
