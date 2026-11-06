import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 }
  });
  const page = await context.newPage();
  await page.goto('https://aura-wav.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('1. Page loaded, clicking "إنشاء حساب جديد"...');
  await page.getByText('إنشاء حساب جديد').first().click();
  await page.waitForTimeout(500);

  console.log('2. Filling form...');
  const inputs = await page.locator('input').all();
  console.log(`Found ${inputs.length} inputs`);
  // mode signup has: name, emailOrUsername, password
  if (inputs.length >= 3) {
    await inputs[0].fill('أحمد الموسيقار');
    await inputs[1].fill('ahmed@test.com');
    await inputs[2].fill('password123');
  }

  console.log('3. Submitting...');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);

  const vaultUsers = await page.evaluate(() => localStorage.getItem('aura_auth_users_vault_v1'));
  const activeSession = await page.evaluate(() => localStorage.getItem('aura_auth_active_session_v1'));
  console.log('vaultUsers in localStorage:', vaultUsers);
  console.log('activeSession in localStorage:', activeSession);

  const isAuthStillVisible = await page.locator('text=تسجيل الدخول').count();
  console.log('isAuthStillVisible count:', isAuthStillVisible);

  console.log('4. Reloading page...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const headerText = await page.locator('header').innerText().catch(() => 'no header');
  console.log('Header text after reload:\n', headerText);

  await browser.close();
}

run().catch(console.error);
