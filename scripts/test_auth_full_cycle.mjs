import { chromium } from 'playwright';

async function testFullAuth() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 }
  });
  const page = await context.newPage();
  await page.goto('https://aura-wav.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('--- Step 1: Sign Up ---');
  await page.getByText('إنشاء حساب جديد').first().click();
  await page.waitForTimeout(500);

  const inputs = await page.locator('input').all();
  await inputs[0].fill('سالم العلي');
  await inputs[1].fill('salem@music.com');
  await inputs[2].fill('pass123456');

  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);

  const headerText = await page.locator('header').innerText();
  console.log('Header text after signup:\n', headerText);

  console.log('--- Step 2: Open Settings & Log Out ---');
  // Click settings icon or avatar
  const settingsBtn = page.locator('button[title*="الإعدادات"], button[title*="سالم"]').first();
  await settingsBtn.click();
  await page.waitForTimeout(1000);

  // Look for logout button
  const logoutBtn = page.getByRole('button', { name: /تسجيل الخروج/ });
  if (await logoutBtn.count() > 0) {
    console.log('Found logout button, clicking...');
    await logoutBtn.click();
    await page.waitForTimeout(1500);
  } else {
    console.log('Logout button not found in settings, checking page content...');
    const modalText = await page.locator('[role="dialog"]').innerText().catch(() => '');
    console.log('Modal text:', modalText.substring(0, 200));
  }

  console.log('--- Step 3: Check if Auth Screen reappeared ---');
  const authHeading = await page.locator('text=تسجيل الدخول').count();
  console.log('Auth screen count after logout:', authHeading);

  console.log('--- Step 4: Sign in with existing credentials ---');
  const signinInputs = await page.locator('input').all();
  if (signinInputs.length >= 2) {
    await signinInputs[0].fill('salem@music.com');
    await signinInputs[1].fill('pass123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
  }

  const headerAfterLogin = await page.locator('header').innerText().catch(() => 'no header');
  console.log('Header text after logging back in:\n', headerAfterLogin);

  await browser.close();
}

testFullAuth().catch(console.error);
