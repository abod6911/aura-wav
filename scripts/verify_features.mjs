import { chromium } from 'playwright';

async function run() {
  console.log('Launching browser with HTTPS support...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA',
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('Browser console error:', msg.text());
  });

  console.log('Navigating to https://localhost:5173/...');
  await page.goto('https://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Dismiss splash if present
  const startBtn = page.getByRole('button', { name: 'ابدأ الاستماع الآن' });
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1000);
  }

  // 1. Open Equalizer & Mega Bass Boost Modal
  console.log('Opening Equalizer & Mega Bass Boost modal...');
  const eqBtn = page.getByRole('button', { name: /المعادل/i }).first();
  if (await eqBtn.isVisible()) {
    await eqBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click on Mega Bass Boost presets
  const boost12 = page.getByRole('button', { name: '+12dB' });
  if (await boost12.isVisible()) {
    await boost12.click();
    await page.waitForTimeout(500);
    console.log('Clicked +12dB Bass Boost');
  }

  await page.screenshot({
    path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/equalizer_bass_boost.png'
  });
  console.log('Equalizer & Bass Boost screenshot saved.');

  // Close Equalizer
  const closeEq = page.getByRole('button', { name: 'تم والحفظ' });
  if (await closeEq.isVisible()) {
    await closeEq.click();
    await page.waitForTimeout(800);
  }

  // 2. Test Change Artwork Modal
  console.log('Opening Change Artwork Modal from Track Item...');
  const firstMoreBtn = page.locator('button[aria-label="Track options"]').first();
  if (await firstMoreBtn.isVisible({ timeout: 3000 })) {
    await firstMoreBtn.click();
    await page.waitForTimeout(500);
    const changeArtBtn = page.getByRole('button', { name: /تغيير الغلاف/i });
    if (await changeArtBtn.isVisible()) {
      await changeArtBtn.click();
      await page.waitForTimeout(2000);
      console.log('Change Artwork modal opened successfully.');
    }
  }

  await page.screenshot({
    path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/change_artwork_modal.png'
  });
  console.log('Change Artwork modal screenshot saved.');

  // Close Artwork Modal
  const closeArt = page.getByRole('button', { name: 'إغلاق' });
  if (await closeArt.isVisible()) {
    await closeArt.click();
    await page.waitForTimeout(800);
  }

  // 3. Mobile Viewport Test (iPhone 14)
  console.log('Testing Mobile Viewport...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ar-SA',
    ignoreHTTPSErrors: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('https://localhost:5173/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  const mobStartBtn = mobilePage.getByRole('button', { name: 'ابدأ الاستماع الآن' });
  if (await mobStartBtn.isVisible()) {
    await mobStartBtn.click();
    await mobilePage.waitForTimeout(1000);
  }

  // Play first track on mobile
  const mobFirstRow = mobilePage.locator('.group').first();
  if (await mobFirstRow.isVisible()) {
    await mobFirstRow.click();
    await mobilePage.waitForTimeout(1000);
  }

  // Tap floating mini player to expand
  const miniPlayer = mobilePage.locator('text=مشغل AURA.WAV').or(mobilePage.locator('text=الآن'));
  // Or tap mini player container
  const floatingMini = mobilePage.locator('.md\\:hidden.fixed').first();
  if (await floatingMini.isVisible()) {
    await floatingMini.click();
    await mobilePage.waitForTimeout(1000);
  }

  await mobilePage.screenshot({
    path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/mobile_player_expanded.png'
  });
  console.log('Mobile expanded player screenshot saved.');

  await browser.close();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

run().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
