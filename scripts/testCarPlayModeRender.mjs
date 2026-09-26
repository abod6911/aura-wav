import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function runTest() {
  console.log('[Test] Verifying CarPlayMode component structure and exports...');
  
  const componentPath = path.resolve('src/components/carplay/CarPlayMode.tsx');
  assert.ok(fs.existsSync(componentPath), `CarPlayMode.tsx should exist at ${componentPath}`);

  const content = fs.readFileSync(componentPath, 'utf8');

  // Verify Screen Wake Lock API usage
  assert.ok(
    content.includes('wakeLock'),
    'CarPlayMode must implement navigator.wakeLock to keep in-car screen awake'
  );

  // Verify oversized touch targets (>= 64px) for driver safety
  assert.ok(
    content.includes('h-16') || content.includes('h-20') || content.includes('w-16') || content.includes('w-20') || content.includes('min-h-[64px]'),
    'CarPlayMode must have large touch targets >= 64px for driving safety'
  );

  // Verify gesture navigation (touch swipe handlers)
  assert.ok(
    content.includes('onTouchStart') && content.includes('onTouchEnd'),
    'CarPlayMode must support touch swipe gestures for safe skipping'
  );

  // Verify both Landscape and Portrait layout adaptability
  assert.ok(
    content.includes('landscape:') || content.includes('flex-col lg:flex-row') || content.includes('portrait'),
    'CarPlayMode must support responsive orientation'
  );

  // Verify App.tsx mounting
  const appPath = path.resolve('src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(
    appContent.includes('CarPlayMode'),
    'App.tsx must mount CarPlayMode'
  );

  console.log('✅ PASS: CarPlayMode component requirements verified successfully.');
}

runTest().catch((err) => {
  console.error('❌ FAIL:', err.message);
  process.exit(1);
});
