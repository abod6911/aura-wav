import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const outDir = path.resolve('public/icons');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 512x512
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background: #09090b; display: flex; align-items: center; justify-content: center; width: 512px; height: 512px; overflow: hidden;">
        <div style="width: 380px; height: 380px; border-radius: 88px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 24px 60px rgba(99,102,241,0.5);">
          <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3" fill="white"></circle>
            <circle cx="18" cy="16" r="3" fill="white"></circle>
          </svg>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(outDir, 'icon-512.png') });

  // 192x192
  await page.setViewportSize({ width: 192, height: 192 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background: #09090b; display: flex; align-items: center; justify-content: center; width: 192px; height: 192px; overflow: hidden;">
        <div style="width: 144px; height: 144px; border-radius: 34px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(99,102,241,0.5);">
          <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3" fill="white"></circle>
            <circle cx="18" cy="16" r="3" fill="white"></circle>
          </svg>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(outDir, 'icon-192.png') });

  await browser.close();
  console.log('Successfully generated public/icons/icon-512.png and public/icons/icon-192.png');
}

run().catch(console.error);
