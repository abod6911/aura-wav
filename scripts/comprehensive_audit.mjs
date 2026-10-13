import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  const report = {
    consoleLogs: [],
    networkErrors: [],
    desktopChecks: {},
    mobileChecks: {},
  };

  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });

  // 1. Desktop Audit
  console.log('Auditing Desktop...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const desktopPage = await desktopContext.newPage();

  desktopPage.on('console', (msg) => {
    report.consoleLogs.push({ type: msg.type(), text: msg.text(), location: msg.location() });
  });

  desktopPage.on('pageerror', (err) => {
    report.consoleLogs.push({ type: 'pageerror', text: err.message, stack: err.stack });
  });

  desktopPage.on('requestfailed', (req) => {
    report.networkErrors.push({ url: req.url(), failure: req.failure() });
  });

  const response = await desktopPage.goto('https://aura-wav.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  report.desktopChecks.status = response?.status();

  // Inspect HTML tags
  report.desktopChecks.metaViewport = await desktopPage.$eval('meta[name="viewport"]', el => el.getAttribute('content')).catch(() => null);
  report.desktopChecks.htmlDir = await desktopPage.$eval('html', el => el.getAttribute('dir')).catch(() => null);
  report.desktopChecks.htmlLang = await desktopPage.$eval('html', el => el.getAttribute('lang')).catch(() => null);
  report.desktopChecks.manifestHref = await desktopPage.$eval('link[rel="manifest"]', el => el.getAttribute('href')).catch(() => null);

  // Check splash screen dismiss
  const splashBtn = desktopPage.locator('button:has-text("ابدأ الاستماع الآن")').first();
  if (await splashBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    report.desktopChecks.hadSplash = true;
    await splashBtn.click({ force: true });
    await desktopPage.waitForTimeout(800);
  } else {
    report.desktopChecks.hadSplash = false;
  }

  await desktopPage.screenshot({ path: 'audit_desktop_home.png', fullPage: false });

  // Check title, navigation buttons, tabs
  report.desktopChecks.navButtons = await desktopPage.$$eval('nav button, aside button', els => els.map(e => ({ text: e.innerText.trim(), ariaLabel: e.getAttribute('aria-label') })));

  // Try playing a track
  const playTrackCard = desktopPage.locator('.apple-glass-card').first();
  if (await playTrackCard.isVisible().catch(() => false)) {
    await playTrackCard.click();
    await desktopPage.waitForTimeout(1000);
    await desktopPage.screenshot({ path: 'audit_desktop_playing.png' });
    report.desktopChecks.trackClicked = true;
  }

  // 2. Mobile Audit
  console.log('Auditing Mobile...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 14 Pro'],
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on('console', (msg) => {
    report.consoleLogs.push({ type: `mobile-${msg.type()}`, text: msg.text() });
  });

  await mobilePage.goto('https://aura-wav.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  
  const mSplashBtn = mobilePage.locator('button:has-text("ابدأ الاستماع الآن")').first();
  if (await mSplashBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mSplashBtn.click({ force: true });
    await mobilePage.waitForTimeout(800);
  }

  await mobilePage.screenshot({ path: 'audit_mobile_home.png' });

  // Play a track on mobile
  const mTrack = mobilePage.locator('.apple-glass-card').first();
  if (await mTrack.isVisible().catch(() => false)) {
    await mTrack.click();
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: 'audit_mobile_playing.png' });
  }

  // Check mini-player
  const miniPlayer = mobilePage.locator('[data-testid="mini-player"]').or(mobilePage.locator('.apple-glass-dock')).first();
  if (await miniPlayer.isVisible().catch(() => false)) {
    await miniPlayer.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({ path: 'audit_mobile_expanded_player.png' });
    report.mobileChecks.expandedPlayerOpened = true;

    // Check lyrics button in expanded player
    const lyricsBtn = mobilePage.locator('button[aria-label="الكلمات المتزامنة"], button:has-text("كلمات"), button:has(.lucide-quote), button:has(.lucide-mic-2)').first();
    if (await lyricsBtn.isVisible().catch(() => false)) {
      await lyricsBtn.click();
      await mobilePage.waitForTimeout(800);
      await mobilePage.screenshot({ path: 'audit_mobile_lyrics.png' });
      report.mobileChecks.lyricsOpened = true;
    }
  }

  // Save audit report
  fs.writeFileSync('audit_result.json', JSON.stringify(report, null, 2), 'utf8');
  console.log('Audit complete! Results saved to audit_result.json');

  await browser.close();
}

runAudit().catch(console.error);
