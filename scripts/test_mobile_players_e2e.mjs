import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 4196;
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
  console.log(`[Phase 3 E2E] Verification Server listening at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 mobile viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'ar-SA',
  });

  await context.addInitScript(() => {
    localStorage.setItem('aura_welcome_seen', 'true');
    sessionStorage.setItem('aura_welcome_seen', 'true');
    localStorage.setItem('aura_auth_guest', 'true');
  });

  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.error('Page error:', err.message);
  });

  try {
    console.log('Navigating to app on mobile viewport (390x844)...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await page.waitForFunction(() => typeof window.usePlayerStore !== 'undefined', { timeout: 10000 });

    // 1. Seed store with playing track & user queue
    console.log('Setting active track & queue in store...');
    await page.evaluate(() => {
      const store = window.usePlayerStore;
      const track1 = {
        id: 'track_phase3_1',
        title: 'أغنية المشغل فائق السرعة',
        artist: 'أورا ستوديو 120fps',
        album: 'AURA FLUID 2026',
        duration: 240,
        artworkUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
      };
      const track2 = {
        id: 'track_phase3_2',
        title: 'الأغنية التالية في الطابور اليدوي',
        artist: 'فنان الطابور الذكي',
        album: 'Queue Vol 1',
        duration: 195,
        artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=400&fit=crop',
      };

      store.setState({
        currentUser: { id: 'guest_user', email: 'guest@aura.wav', isAnonymous: true },
        isAuthScreenOpen: false,
        tracks: [track1, track2],
        currentTrack: track1,
        isPlaying: true,
        playbackState: 'playing',
        currentTime: 45,
        duration: 240,
        userQueue: [track2],
      });
    });

    await page.waitForTimeout(1000);

    // 2. Audit MiniPlayer
    console.log('Auditing MiniPlayer dimensions & elements...');
    const miniPlayerAudit = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="mini-player"]');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const playBtn = el.querySelector('[data-testid="mini-play-pause-btn"]');
      const nextBtn = el.querySelector('[data-testid="mini-next-btn"]');
      const queueBtn = el.querySelector('[data-testid="mini-queue-btn"]');
      const queueBadge = queueBtn ? queueBtn.querySelector('span') : null;

      return {
        height: rect.height,
        hasPlayBtn: !!playBtn,
        hasNextBtn: !!nextBtn,
        hasQueueBtn: !!queueBtn,
        queueBadgeCount: queueBadge ? queueBadge.textContent.trim() : null,
      };
    });
    console.log('MiniPlayer Audit:', miniPlayerAudit);

    const screenshotMini = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\dc36be4c-0c1d-4fd9-bd43-c55918725efd\\phase3-e2e-miniplayer.png';
    await page.screenshot({ path: screenshotMini, fullPage: false });
    console.log(`✓ Screenshot MiniPlayer saved: ${screenshotMini}`);

    // 3. Open ExpandedPlayer sheet
    console.log('Opening ExpandedPlayer sheet...');
    await page.evaluate(() => {
      window.usePlayerStore.getState().setMobilePlayerOpen(true);
    });
    await page.waitForTimeout(1500);

    // 4. Audit ExpandedPlayer
    console.log('Auditing ExpandedPlayer sheet...');
    const expandedAudit = await page.evaluate(() => {
      const sheet = document.querySelector('[data-testid="expanded-player-sheet"]');
      if (!sheet) return null;
      const rect = sheet.getBoundingClientRect();
      const artwork = sheet.querySelector('[data-testid="expanded-artwork-container"]');
      const artworkRect = artwork ? artwork.getBoundingClientRect() : null;

      const shuffleBtn = sheet.querySelector('[data-testid="expanded-shuffle-btn"]');
      const prevBtn = sheet.querySelector('[data-testid="expanded-prev-btn"]');
      const playPauseBtn = sheet.querySelector('[data-testid="expanded-play-pause-btn"]');
      const nextBtn = sheet.querySelector('[data-testid="expanded-next-btn"]');
      const repeatBtn = sheet.querySelector('[data-testid="expanded-repeat-btn"]');
      const favBtn = sheet.querySelector('[data-testid="expanded-favorite-btn"]');

      return {
        sheetHeight: rect.height,
        isZeroInternalScroll: sheet.scrollHeight <= sheet.clientHeight + 2,
        scrollHeight: sheet.scrollHeight,
        clientHeight: sheet.clientHeight,
        artworkWidth: artworkRect?.width,
        artworkHeight: artworkRect?.height,
        hasAll5Controls: !!(shuffleBtn && prevBtn && playPauseBtn && nextBtn && repeatBtn),
        hasFavBtn: !!favBtn,
      };
    });
    console.log('ExpandedPlayer Audit:', expandedAudit);

    const screenshotExpanded = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\dc36be4c-0c1d-4fd9-bd43-c55918725efd\\phase3-e2e-expandedplayer.png';
    await page.screenshot({ path: screenshotExpanded, fullPage: false });
    console.log(`✓ Screenshot ExpandedPlayer saved: ${screenshotExpanded}`);

    // 5. Test 0ms Track Switch from ExpandedPlayer
    console.log('Testing Next Track tap...');
    await page.locator('[data-testid="expanded-next-btn"]').click();
    await page.waitForTimeout(500);

    const switchedTrackTitle = await page.evaluate(() => {
      const store = window.usePlayerStore.getState();
      return {
        currentTrackTitle: store.currentTrack?.title,
        isPlaying: store.isPlaying,
      };
    });
    console.log('Switched Track result:', switchedTrackTitle);

  } catch (err) {
    console.error('Caught error during test execution:', err);
    errors.push(err.message);
  } finally {
    await browser.close();
    server.close(() => {
      console.log('Verification server closed successfully.');
      process.exit(errors.length === 0 ? 0 : 1);
    });
  }
});
