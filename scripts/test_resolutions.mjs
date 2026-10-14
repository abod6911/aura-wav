import { chromium } from 'playwright';

async function testResolutions() {
  const browser = await chromium.launch({ headless: true });
  
  const viewports = [
    { width: 1920, height: 1080, name: '1080p' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1280, height: 800, name: '1280x800' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 850, height: 700, name: '850x700' },
    { width: 768, height: 1024, name: '768_tablet' },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }

    const heroPlay = page.locator('button:has-text("تشغيل الآن")').first();
    if (await heroPlay.isVisible()) {
      await heroPlay.click();
      await page.waitForTimeout(800);
    }

    const footer = page.locator('footer[data-testid="player-bar"]');
    if (await footer.isVisible()) {
      const box = await footer.boundingBox();
      const children = await footer.locator('> div').all();
      const cBoxes = await Promise.all(children.map(c => c.boundingBox()));
      console.log(`[${vp.name}] Footer:`, { y: box?.y, h: box?.h }, 'Children Ys:', cBoxes.map(b => b?.y));
      await page.screenshot({ path: `snap_${vp.name}.png` });
    } else {
      console.log(`[${vp.name}] PlayerBar hidden (mobile mode)`);
    }

    await page.close();
  }

  await browser.close();
}

testResolutions().catch(console.error);
