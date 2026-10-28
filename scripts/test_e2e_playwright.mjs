import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4188;
const DIST_DIR = path.resolve(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

// Simple static server for dist
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  
  let filePath = path.join(DIST_DIR, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`Server listening at http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 / modern mobile viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });

    const page = await context.newPage();
    const consoleMessages = [];
    const errors = [];

    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      errors.push(err.message);
      console.error('Page error:', err.message);
    });

    console.log('Navigating to app...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });

    console.log('Page loaded. Checking title and initial DOM...');
    const title = await page.title();
    console.log(`Page title: "${title}"`);

    // Wait for React to mount root
    await page.waitForSelector('#root', { timeout: 8000 });
    console.log('Root element verified.');

    // Save screenshot in dist and scratch
    const screenshotDist = path.resolve(DIST_DIR, 'e2e-screenshot-mobile.png');
    await page.screenshot({ path: screenshotDist });
    console.log(`Mobile screenshot saved to ${screenshotDist}`);

    // Verify DOM structure
    const domState = await page.evaluate(() => {
      return {
        hasRoot: !!document.getElementById('root'),
        buttonsCount: document.querySelectorAll('button').length,
        hasAudioElements: document.querySelectorAll('audio').length,
        renderedTextSnippets: document.body.innerText.substring(0, 200).replace(/\n+/g, ' '),
      };
    });
    console.log('DOM State:', domState);

    await browser.close();
    server.close(() => {
      console.log('Playwright E2E verification complete. Total errors:', errors.length);
      process.exit(errors.length === 0 ? 0 : 1);
    });
  } catch (e) {
    console.error('Playwright execution error:', e);
    server.close(() => process.exit(1));
  }
});
