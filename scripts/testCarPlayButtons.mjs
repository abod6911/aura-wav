import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function runTest() {
  console.log('[Test] Verifying Car Mode buttons in Header and ExpandedPlayer...');

  const headerPath = path.resolve('src/components/Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  assert.ok(
    headerContent.includes('setCarModeOpen') || headerContent.includes('toggleCarMode'),
    'Header.tsx must include trigger for Car Mode'
  );
  assert.ok(
    headerContent.includes('Car') || headerContent.includes('CarPlay'),
    'Header.tsx must include Car icon / CarPlay indicator'
  );

  const playerPath = path.resolve('src/components/player/ExpandedPlayer.tsx');
  const playerContent = fs.readFileSync(playerPath, 'utf8');

  assert.ok(
    playerContent.includes('setCarModeOpen') || playerContent.includes('toggleCarMode'),
    'ExpandedPlayer.tsx must include trigger for Car Mode'
  );
  assert.ok(
    playerContent.includes('Car') || playerContent.includes('CarPlay'),
    'ExpandedPlayer.tsx must include Car icon'
  );

  console.log('✅ PASS: Car Mode triggers verified in Header and ExpandedPlayer.');
}

runTest().catch((err) => {
  console.error('❌ FAIL:', err.message);
  process.exit(1);
});
