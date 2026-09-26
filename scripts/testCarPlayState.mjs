import assert from 'node:assert';

// Mock browser globals for Node.js environment
if (typeof globalThis.Audio === 'undefined') {
  globalThis.Audio = class {
    play() { return Promise.resolve(); }
    pause() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { origin: 'http://localhost:3000' },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
}
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {};
}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
  };
}

// Verification test for Car Mode state in usePlayerStore
async function runTest() {
  console.log('[Test] Checking Car Mode state in PlayerStore...');
  
  // Dynamic import of the compiled/source store
  const { usePlayerStore } = await import('../src/store/usePlayerStore.ts');
  const store = usePlayerStore.getState();

  assert.strictEqual(
    typeof store.isCarModeOpen,
    'boolean',
    'store.isCarModeOpen should be a boolean'
  );
  assert.strictEqual(store.isCarModeOpen, false, 'store.isCarModeOpen should default to false');

  assert.strictEqual(
    typeof store.setCarModeOpen,
    'function',
    'store.setCarModeOpen should be a function'
  );
  assert.strictEqual(
    typeof store.toggleCarMode,
    'function',
    'store.toggleCarMode should be a function'
  );

  // Test setCarModeOpen
  store.setCarModeOpen(true);
  assert.strictEqual(
    usePlayerStore.getState().isCarModeOpen,
    true,
    'store.isCarModeOpen should be true after setCarModeOpen(true)'
  );

  // Test toggleCarMode
  store.toggleCarMode();
  assert.strictEqual(
    usePlayerStore.getState().isCarModeOpen,
    false,
    'store.isCarModeOpen should be false after toggleCarMode()'
  );

  console.log('✅ PASS: PlayerStore Car Mode state verified successfully.');
}

runTest().catch((err) => {
  console.error('❌ FAIL:', err.message);
  process.exit(1);
});
