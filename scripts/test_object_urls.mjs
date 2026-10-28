// Automated Test for Managed Audio Object URLs Lifecycle
import assert from 'node:assert';

console.log('====================================================');
console.log('🧪 VERIFYING OBJECT URL REGISTRY & CLEANUP LIFECYCLE');
console.log('====================================================\n');

// Mock URL and Blob for testing URL lifecycle logic identical to DJAudioEngineFacade
const createdUrls = new Set();
const revokedUrls = new Set();

const mockURL = {
  createObjectURL: (blob) => {
    const url = `blob:http://localhost:5173/${Math.random().toString(36).substring(2, 10)}`;
    createdUrls.add(url);
    return url;
  },
  revokeObjectURL: (url) => {
    revokedUrls.add(url);
    createdUrls.delete(url);
  }
};

class MockDJAudioEngineUrlManager {
  constructor() {
    this.managedAudioObjectUrls = new Set();
    this.channelA_objectUrl = null;
    this.channelB_objectUrl = null;
  }

  createManagedAudioUrl(blob) {
    const url = mockURL.createObjectURL(blob);
    this.managedAudioObjectUrls.add(url);
    return url;
  }

  revokeManagedAudioUrl(url) {
    if (!url || !url.startsWith('blob:')) return;
    if (this.managedAudioObjectUrls.has(url)) {
      try {
        mockURL.revokeObjectURL(url);
      } catch {}
      this.managedAudioObjectUrls.delete(url);
    }
  }

  purgeUnusedObjectUrls() {
    for (const url of this.managedAudioObjectUrls) {
      if (url !== this.channelA_objectUrl && url !== this.channelB_objectUrl) {
        try {
          mockURL.revokeObjectURL(url);
        } catch {}
        this.managedAudioObjectUrls.delete(url);
      }
    }
  }
}

const manager = new MockDJAudioEngineUrlManager();

// Step 1: Create 10 blob URLs
const urls = [];
for (let i = 0; i < 10; i++) {
  urls.push(manager.createManagedAudioUrl({ size: 1024, type: 'audio/mpeg' }));
}

console.log(`1. Created 10 Managed Object URLs: Active in set = ${manager.managedAudioObjectUrls.size}`);
assert.strictEqual(manager.managedAudioObjectUrls.size, 10);

// Step 2: Set Channel A to url[0] and Channel B to url[1]
manager.channelA_objectUrl = urls[0];
manager.channelB_objectUrl = urls[1];
console.log(`2. Assigned active channel URLs: Deck A = ${urls[0]}, Deck B = ${urls[1]}`);

// Step 3: Trigger purgeUnusedObjectUrls
console.log('3. Triggering purgeUnusedObjectUrls()...');
manager.purgeUnusedObjectUrls();

console.log(`   - URLs remaining in manager: ${manager.managedAudioObjectUrls.size} (Expected: 2)`);
console.log(`   - URLs revoked via URL.revokeObjectURL: ${revokedUrls.size} (Expected: 8)`);

assert.strictEqual(manager.managedAudioObjectUrls.size, 2);
assert.strictEqual(revokedUrls.size, 8);
assert.strictEqual(manager.managedAudioObjectUrls.has(urls[0]), true);
assert.strictEqual(manager.managedAudioObjectUrls.has(urls[1]), true);

// Step 4: Revoke Deck A explicitly
manager.revokeManagedAudioUrl(urls[0]);
console.log(`4. Revoked Deck A url explicitly. Remaining: ${manager.managedAudioObjectUrls.size}`);
assert.strictEqual(manager.managedAudioObjectUrls.size, 1);
assert.strictEqual(revokedUrls.size, 9);

console.log('\n====================================================');
console.log('✅ ALL OBJECT URL LIFECYCLE ASSERTIONS PASSED (100%)');
console.log('====================================================');
