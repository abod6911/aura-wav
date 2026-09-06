import { chromium, devices } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });
  const context = await browser.newContext({
    ...devices['iPhone 14 Pro'],
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.on('console', (msg) => console.log('[Console]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[PageError]', err));
  await page.goto('https://localhost:5173/', { waitUntil: 'networkidle' });

  // Dismiss splash
  try {
    const btn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await btn.isVisible({ timeout: 2500 })) await btn.click();
  } catch {}
  await page.waitForTimeout(1000);

  // Click first track
  const track = page.locator('.track-item-contained').first();
  await track.click();
  await page.waitForTimeout(1200);

  // Directly evaluate opening expanded player in page
  await page.evaluate(() => {
    // Click on the miniplayer element directly via DOM
    const el = document.querySelector('[data-testid="mini-player"]');
    if (el) {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/apple_music_expanded_player.png',
  });
  console.log('Saved apple_music_expanded_player.png');

  // Check if spatial button exists
  const count = await page.locator('[data-testid="spatial-audio-badge"]').count();
  console.log('Spatial badge count:', count);
  if (count > 0) {
    await page.locator('[data-testid="spatial-audio-badge"]').first().click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/apple_music_spatial_active.png',
    });
    console.log('Saved apple_music_spatial_active.png');
  }

  // Check lyrics tab
  const lyricsBtn = page.locator('button:has-text("الكلمات (Lyrics)")').first();
  if (await lyricsBtn.isVisible()) {
    await lyricsBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/apple_music_lyrics_tab.png',
    });
    console.log('Saved apple_music_lyrics_tab.png');
  }

  await browser.close();
}

main().catch(console.error);
