import { chromium } from 'playwright';

async function audit() {
  const browser = await chromium.launch({ headless: true });

  // ─── Desktop 1440×900 ───────────────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const btn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(600); }
    await page.screenshot({ path: 'audit_desktop_home.png' });
    // Play something
    const play = page.locator('button:has-text("تشغيل الآن")').first();
    if (await play.isVisible()) { await play.click(); await page.waitForTimeout(1000); }
    await page.screenshot({ path: 'audit_desktop_playing.png' });
    await page.close();
  }

  // ─── Mobile 390×844 (iPhone 15 Pro) ─────────────────────────────────────────
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const btn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(600); }
    await page.screenshot({ path: 'audit_mobile_home.png' });

    // Tap the "Search" nav tab
    const searchTab = page.locator('button:has-text("بحث"), button[aria-label*="بحث"], button[aria-label*="Search"]').first();
    if (await searchTab.isVisible()) {
      await searchTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: 'audit_mobile_search.png' });

    // Check page width vs layout
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const vpWidth   = await page.evaluate(() => window.innerWidth);
    console.log(`[Mobile] body.scrollWidth=${bodyWidth}, window.innerWidth=${vpWidth}`);
    if (bodyWidth > vpWidth) {
      console.log('⚠️  HORIZONTAL OVERFLOW: page is wider than viewport!');
    } else {
      console.log('✅  No horizontal overflow');
    }

    // Check for large images / heavy elements
    const largeImgs = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(i => i.naturalWidth > 800).map(i => ({ src: i.src.slice(-60), w: i.naturalWidth, h: i.naturalHeight }));
    });
    console.log('Large images (>800px wide):', largeImgs.length, largeImgs);

    await page.close();
  }

  await browser.close();
}

audit().catch(console.error);
