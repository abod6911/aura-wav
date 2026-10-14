import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // If splash welcome screen exists, click it
  const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click on the big "تشغيل الآن" button in hero or first track
  const heroPlay = page.locator('button:has-text("تشغيل الآن")').first();
  if (await heroPlay.isVisible()) {
    await heroPlay.click();
  } else {
    const track = page.locator('div:has-text("Starships")').first();
    await track.click();
  }
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'test_playing_desktop_real.png' });

  const footer = page.locator('footer[data-testid="player-bar"]');
  const footerBox = await footer.boundingBox();
  console.log('Footer bounding box:', footerBox);

  const images = await footer.locator('img').all();
  console.log('Images inside footer:', images.length);
  for (let i = 0; i < images.length; i++) {
    const box = await images[i].boundingBox();
    console.log(`Image ${i} box:`, box);
  }

  const children = await footer.locator('> div').all();
  console.log('Children count:', children.length);
  for (let i = 0; i < children.length; i++) {
    const box = await children[i].boundingBox();
    console.log(`Child ${i} box:`, box);
  }

  await browser.close();
}

run().catch(console.error);
