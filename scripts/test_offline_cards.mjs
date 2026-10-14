import { chromium } from 'playwright';

async function testDownloadedCards() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const splash = page.locator('button:has-text("ابدأ الاستماع الآن")');
  if (await splash.isVisible()) {
    await splash.click();
    await page.waitForTimeout(500);
  }

  // Inject 2 downloaded track IDs into usePlayerStore to trigger the "جاهزة للأوفلاين" < 4 section
  await page.evaluate(() => {
    const store = window.usePlayerStore.getState();
    const tracks = store.tracks;
    if (tracks.length >= 2) {
      window.usePlayerStore.setState({
        downloadedTrackIds: [tracks[0].id, tracks[1].id]
      });
    }
  });

  await page.waitForTimeout(1000);

  // Scroll down to the "جاهزة للأوفلاين" section
  const section = page.locator('h2:has-text("جاهزة للأوفلاين")').first();
  if (await section.isVisible()) {
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: 'test_offline_cards_fixed.png' });

  // Check the image sizes inside the downloaded section
  const images = await page.locator('section:has(h2:has-text("جاهزة للأوفلاين")) img').all();
  console.log('Downloaded section images found:', images.length);
  for (let i = 0; i < images.length; i++) {
    const box = await images[i].boundingBox();
    console.log(`Image ${i} bounding box:`, box);
  }

  await browser.close();
}

testDownloadedCards().catch(console.error);
