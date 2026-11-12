import { chromium, devices } from 'playwright';
import { createServer } from 'vite';

async function diagnose() {
  console.log('--- Starting Deep Mobile Dimensions Diagnostic ---');
  
  const server = await createServer({
    server: {
      port: 5174,
      watch: {
        ignored: ['**/dist/**', '**/node_modules/**', '**/*.mp3', '**/*.wav'],
      },
    },
  });
  await server.listen();
  const serverUrl = 'http://localhost:5174';

  const viewports = [
    { name: 'iPhone_SE_375x667', width: 375, height: 667 },
    { name: 'Galaxy_360x740', width: 360, height: 740 },
    { name: 'iPhone14Pro_393x852', width: 393, height: 852 },
    { name: 'iPhone14ProMax_430x932', width: 430, height: 932 },
  ];

  const browser = await chromium.launch({ headless: true });

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    // --- 1. Test Auth Screen first (without session) ---
    const unauthContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
    });
    const unauthPage = await unauthContext.newPage();
    await unauthPage.goto(serverUrl, { waitUntil: 'networkidle' });
    await unauthPage.waitForTimeout(500);

    const authOverflow = await unauthPage.evaluate(() => {
      const auth = document.querySelector('form') || document.body;
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        authScrollHeight: document.documentElement.scrollHeight,
        authClientHeight: document.documentElement.clientHeight,
        hasHorizontalScroll: document.body.scrollWidth > document.body.clientWidth,
      };
    });
    console.log(`  Auth Screen Metrics:`, authOverflow);
    await unauthPage.screenshot({ path: `diag_${vp.name}_auth.png` });
    await unauthContext.close();

    // --- 2. Test Main App (with session) ---
    const authContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
    });

    await authContext.addInitScript(() => {
      const user = {
        id: 'guest_test',
        name: 'ضيف AURA',
        isGuest: true,
        createdAt: Date.now(),
      };
      localStorage.setItem('aura_auth_active_session_v1', JSON.stringify(user));
      localStorage.setItem('aura_auth_guest', 'true');
      localStorage.setItem('aura_welcome_seen', 'true');
      sessionStorage.setItem('aura_welcome_seen', 'true');
    });

    const page = await authContext.newPage();
    await page.goto(serverUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Play demo track to show MiniPlayer
    await page.evaluate(() => {
      const store = window.usePlayerStore.getState();
      const demoTrack = {
        id: 'diag-track-1',
        title: 'أغنية ذات عنوان عربي طويل جداً لاختبار التناسق على الشاشات الصغيرة',
        artist: 'فنان صوتي فائق التجربة',
        album: 'ألبوم الأبعاد المتناسقة الموسيقي',
        duration: 215,
        artworkUrl: '/logo.svg',
        dominantColor: '#FA243C',
      };
      store.playTrack(demoTrack, [demoTrack]);
    });
    await page.waitForTimeout(500);

    // 2a. Home Tab Metrics
    const homeMetrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const footer = document.querySelector('footer');
      const header = document.querySelector('header');
      const doc = document.documentElement;
      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        hasHorizontalScroll: doc.scrollWidth > doc.clientWidth,
        headerHeight: header?.offsetHeight,
        footerHeight: footer?.offsetHeight,
        mainHeight: main?.offsetHeight,
        mainScrollHeight: main?.scrollHeight,
      };
    });
    console.log(`  Home Tab Metrics:`, homeMetrics);
    await page.screenshot({ path: `diag_${vp.name}_home_playing.png` });

    // 2b. Check Search Tab
    await page.evaluate(() => window.usePlayerStore.getState().setActiveTab('search'));
    await page.waitForTimeout(500);
    const searchMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        hasHorizontalScroll: doc.scrollWidth > doc.clientWidth,
      };
    });
    console.log(`  Search Tab hasHorizontalScroll:`, searchMetrics.hasHorizontalScroll);
    await page.screenshot({ path: `diag_${vp.name}_search.png` });

    // 2c. Check Library Tab (TrackList)
    await page.evaluate(() => window.usePlayerStore.getState().setActiveTab('library'));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `diag_${vp.name}_library.png` });

    // 2d. Check Expanded Player
    await page.evaluate(() => window.usePlayerStore.getState().setMobilePlayerOpen(true));
    await page.waitForTimeout(600);
    const expandedMetrics = await page.evaluate(() => {
      const sheet = document.querySelector('[data-testid="expanded-player-sheet"]');
      const artwork = document.querySelector('[data-testid="expanded-artwork-container"]');
      const playBtn = document.querySelector('[data-testid="expanded-play-pause-btn"]');
      const bottomDock = sheet?.querySelector('.my-1');
      return {
        windowHeight: window.innerHeight,
        sheetHeight: sheet?.offsetHeight,
        sheetScrollHeight: sheet?.scrollHeight,
        sheetClientHeight: sheet?.clientHeight,
        isOverflowing: sheet ? sheet.scrollHeight > sheet.clientHeight : false,
        artworkWidth: artwork?.offsetWidth,
        artworkHeight: artwork?.offsetHeight,
        playBtnVisible: playBtn ? playBtn.getBoundingClientRect().bottom <= window.innerHeight : false,
      };
    });
    console.log(`  Expanded Player Metrics:`, expandedMetrics);
    await page.screenshot({ path: `diag_${vp.name}_expanded.png` });

    // 2e. Check Equalizer Bottom Sheet
    await page.evaluate(() => {
      window.usePlayerStore.getState().setMobilePlayerOpen(false);
      window.usePlayerStore.getState().setEqualizerOpen(true);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `diag_${vp.name}_eq_sheet.png` });

    // 2f. Check AutoMix Selector Bottom Sheet
    await page.evaluate(() => {
      window.usePlayerStore.getState().setEqualizerOpen(false);
      window.usePlayerStore.getState().setAutoMixModalOpen(true);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `diag_${vp.name}_automix_sheet.png` });

    // 2g. Check Synced Lyrics View
    await page.evaluate(() => {
      window.usePlayerStore.getState().setAutoMixModalOpen(false);
      window.usePlayerStore.getState().setLyricsOpen(true);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `diag_${vp.name}_lyrics.png` });

    // Clean up
    await page.evaluate(() => window.usePlayerStore.getState().setLyricsOpen(false));
    await authContext.close();
  }

  await browser.close();
  await server.close();
  console.log('\n--- Deep Mobile Dimensions Diagnostic Completed ---');
}

diagnose().catch(console.error);
