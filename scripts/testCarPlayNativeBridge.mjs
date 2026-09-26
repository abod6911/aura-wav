import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function runTest() {
  console.log('[Test] Verifying Capacitor and Native CarPlay scaffolding...');

  // 1. Verify capacitor.config.ts
  const capConfigPath = path.resolve('capacitor.config.ts');
  assert.ok(fs.existsSync(capConfigPath), 'capacitor.config.ts must exist');
  const capContent = fs.readFileSync(capConfigPath, 'utf8');
  assert.ok(capContent.includes('com.aurawav.player') || capContent.includes('appId'), 'capacitor.config.ts must define appId');

  // 2. Verify native iOS CarPlay files
  const carPlayDelegatePath = path.resolve('ios/App/App/CarPlaySceneDelegate.swift');
  assert.ok(fs.existsSync(carPlayDelegatePath), 'CarPlaySceneDelegate.swift must exist');
  const delegateContent = fs.readFileSync(carPlayDelegatePath, 'utf8');
  assert.ok(
    delegateContent.includes('CPTemplateApplicationSceneDelegate'),
    'CarPlaySceneDelegate must conform to CPTemplateApplicationSceneDelegate'
  );
  assert.ok(
    delegateContent.includes('CPNowPlayingTemplate'),
    'CarPlaySceneDelegate must support CPNowPlayingTemplate'
  );
  assert.ok(
    delegateContent.includes('CPTabBarTemplate') || delegateContent.includes('CPListTemplate'),
    'CarPlaySceneDelegate must support TabBar or List templates'
  );

  // 3. Verify CarPlayBridgePlugin.swift
  const pluginPath = path.resolve('ios/App/App/CarPlayBridgePlugin.swift');
  assert.ok(fs.existsSync(pluginPath), 'CarPlayBridgePlugin.swift must exist');
  const pluginContent = fs.readFileSync(pluginPath, 'utf8');
  assert.ok(
    pluginContent.includes('CAPPlugin') || pluginContent.includes('syncTracks') || pluginContent.includes('updatePlaybackState'),
    'CarPlayBridgePlugin must declare Capacitor plugin bridge'
  );

  // 4. Verify App.entitlements for CarPlay Audio
  const entitlementsPath = path.resolve('ios/App/App/App.entitlements');
  assert.ok(fs.existsSync(entitlementsPath), 'App.entitlements must exist');
  const entContent = fs.readFileSync(entitlementsPath, 'utf8');
  assert.ok(
    entContent.includes('com.apple.developer.carplay-audio'),
    'App.entitlements must declare com.apple.developer.carplay-audio entitlement'
  );

  // 5. Verify Info.plist for CarPlay Scene and Background Audio
  const plistPath = path.resolve('ios/App/App/Info.plist');
  assert.ok(fs.existsSync(plistPath), 'Info.plist must exist');
  const plistContent = fs.readFileSync(plistPath, 'utf8');
  assert.ok(
    plistContent.includes('CPTemplateApplicationSceneSessionRoleApplication'),
    'Info.plist must declare CarPlay scene role'
  );
  assert.ok(
    plistContent.includes('audio'),
    'Info.plist must include audio in UIBackgroundModes'
  );

  // 6. Verify src/services/carPlayBridge.ts
  const bridgePath = path.resolve('src/services/carPlayBridge.ts');
  assert.ok(fs.existsSync(bridgePath), 'src/services/carPlayBridge.ts must exist');
  const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
  assert.ok(
    bridgeContent.includes('syncLibraryToCarPlay') && bridgeContent.includes('syncStateToCarPlay'),
    'src/services/carPlayBridge.ts must export synchronization functions'
  );

  console.log('✅ PASS: Native CarPlay scaffolding and TypeScript bridge verified successfully.');
}

runTest().catch((err) => {
  console.error('❌ FAIL:', err.message);
  process.exit(1);
});
