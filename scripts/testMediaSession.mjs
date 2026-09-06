import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });

  // Bypass welcome splash
  await page.addInitScript(() => {
    sessionStorage.setItem('aura_welcome_seen', 'true');
  });

  await page.goto('https://192.168.100.12:5173/');
  await page.waitForTimeout(2000);

  // Click on the first track in the table
  const clicked = await page.evaluate(() => {
    // Find any element containing Starships or track item
    const el = Array.from(document.querySelectorAll('*')).find(
      e => e.textContent && e.textContent.includes('Starships') && e.children.length === 0
    );
    if (el) {
      el.click();
      return 'clicked: ' + el.textContent;
    }
    return 'not found';
  });
  console.log('Click result:', clicked);

  await page.waitForTimeout(2000);

  const state = await page.evaluate(() => {
    return {
      docTitle: document.title,
      hasMediaSession: 'mediaSession' in navigator,
      metadata: navigator.mediaSession?.metadata ? {
        title: navigator.mediaSession.metadata.title,
        artist: navigator.mediaSession.metadata.artist,
        album: navigator.mediaSession.metadata.album,
        artwork: navigator.mediaSession.metadata.artwork
      } : null,
      audioElements: Array.from(document.querySelectorAll('audio')).map(a => ({
        src: a.src,
        title: a.title,
        paused: a.paused,
        currentTime: a.currentTime,
        duration: a.duration
      }))
    };
  });

  console.log('Final State after playing track:', JSON.stringify(state, null, 2));
  console.log('Errors:', errors);
  await browser.close();
}

run().catch(console.error);
