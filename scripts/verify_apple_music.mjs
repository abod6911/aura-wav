import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testMobileAppleMusic() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--use-fake-ui-for-media-stream', '--no-sandbox'],
  });

  const iPhone = devices['iPhone 14 Pro'];
  const context = await browser.newContext({
    ...iPhone,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[Browser Error]', msg.text());
  });

  console.log('Navigating to local HTTPS preview server...');
  await page.goto('https://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

  // Dismiss welcome splash if open
  try {
    const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await startBtn.isVisible({ timeout: 3000 })) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  // Click on first track to start playback
  console.log('Playing first track...');
  const firstTrackRow = page.locator('.track-item-contained').first();
  await firstTrackRow.click();
  await page.waitForTimeout(1200);

  // Take screenshot of main mobile view with elevated MiniPlayer
  const artifactDir = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\a3d86b8a-de3d-4ff6-b25e-03cfc989d21c';
  await page.screenshot({ path: path.join(artifactDir, 'apple_music_mobile_main.png') });
  console.log('Captured apple_music_mobile_main.png');

  // Tap MiniPlayer to open Expanded Player
  console.log('Opening Expanded Player...');
  const miniPlayer = page.locator('[data-testid="mini-player"]').first();
  await miniPlayer.click();
  await page.waitForTimeout(1000);

  // Verify Spatial Audio badge is visible
  const spatialBadge = page.locator('[data-testid="spatial-audio-badge"]').first();
  console.log('Spatial badge visible:', await spatialBadge.isVisible());

  // Click to toggle Spatial Audio 3D
  await spatialBadge.click();
  await page.waitForTimeout(800);

  // Take screenshot of Expanded Player with Spatial Audio active & Apple styling
  await page.screenshot({ path: path.join(artifactDir, 'apple_music_expanded_player.png') });
  console.log('Captured apple_music_expanded_player.png');

  // Test Lyrics tab
  const lyricsTabBtn = page.locator('button:has-text("الكلمات (Lyrics)")').first();
  if (await lyricsTabBtn.isVisible()) {
    await lyricsTabBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'apple_music_lyrics_tab.png') });
    console.log('Captured apple_music_lyrics_tab.png');
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

testMobileAppleMusic().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
