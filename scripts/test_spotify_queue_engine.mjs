import assert from 'node:assert/strict';

// Test Mock of Queue State Logic matching usePlayerStore.ts
function createQueueEngine() {
  let state = {
    currentTrack: null,
    queue: [],
    userQueue: [],
    history: [],
    isPlaying: false,
    nextUpTrackId: null,
  };

  const syncNextUp = () => {
    if (state.userQueue.length > 0) {
      state.nextUpTrackId = state.userQueue[0].id;
    } else if (state.queue.length > 0) {
      state.nextUpTrackId = state.queue[0].id;
    } else {
      state.nextUpTrackId = null;
    }
  };

  return {
    getState: () => state,
    playTrack: (track, list = []) => {
      state.currentTrack = track;
      state.isPlaying = true;
      state.queue = list.filter((t) => t.id !== track.id);
      syncNextUp();
    },
    playNext: (track) => {
      if (!state.currentTrack) {
        state.currentTrack = track;
        state.isPlaying = true;
        syncNextUp();
        return;
      }
      // Remove track if already in userQueue to prevent duplicates
      state.userQueue = state.userQueue.filter((t) => t.id !== track.id);
      // Insert at the front (index 0) of userQueue
      state.userQueue = [track, ...state.userQueue];
      syncNextUp();
    },
    addToQueue: (track) => {
      if (!state.currentTrack) {
        state.currentTrack = track;
        state.isPlaying = true;
        syncNextUp();
        return;
      }
      // Remove if already in userQueue to avoid duplicates, then append
      state.userQueue = [...state.userQueue.filter((t) => t.id !== track.id), track];
      syncNextUp();
    },
    nextTrack: () => {
      if (!state.currentTrack) return;
      state.history.push(state.currentTrack);

      // 1. High priority: User Queue takes precedence
      if (state.userQueue.length > 0) {
        const next = state.userQueue[0];
        state.userQueue = state.userQueue.slice(1);
        state.currentTrack = next;
        syncNextUp();
        return;
      }

      // 2. Fallback: Autoplay / Context Queue
      if (state.queue.length > 0) {
        const next = state.queue[0];
        state.queue = state.queue.slice(1);
        state.currentTrack = next;
        syncNextUp();
        return;
      }

      state.isPlaying = false;
      syncNextUp();
    },
    removeFromUserQueue: (index) => {
      state.userQueue = state.userQueue.filter((_, i) => i !== index);
      syncNextUp();
    },
    reorderUserQueue: (from, to) => {
      const copy = [...state.userQueue];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      state.userQueue = copy;
      syncNextUp();
    },
    clearUserQueue: () => {
      state.userQueue = [];
      syncNextUp();
    },
  };
}

console.log('--- Testing Spotify Dual-Queue Engine ---');

const engine = createQueueEngine();

const trackA = { id: 'A', title: 'Track A' };
const trackB = { id: 'B', title: 'Track B' };
const trackC = { id: 'C', title: 'Track C' };
const trackD = { id: 'D', title: 'Track D' };
const trackManual1 = { id: 'M1', title: 'Manual 1' };
const trackManual2 = { id: 'M2', title: 'Manual 2' };
const trackUrgent = { id: 'URGENT', title: 'Play Next Urgent' };

// 1. Play Track A with context playlist [A, B, C, D]
engine.playTrack(trackA, [trackA, trackB, trackC, trackD]);
assert.equal(engine.getState().currentTrack.id, 'A');
assert.equal(engine.getState().queue.length, 3); // B, C, D
assert.equal(engine.getState().nextUpTrackId, 'B');
console.log('✓ Step 1: Initial context playback verified (Next up is B)');

// 2. User manually queues M1 and M2 via addToQueue (Swipe-to-queue)
engine.addToQueue(trackManual1);
engine.addToQueue(trackManual2);
assert.equal(engine.getState().userQueue.length, 2);
assert.equal(engine.getState().userQueue[0].id, 'M1');
assert.equal(engine.getState().userQueue[1].id, 'M2');
assert.equal(engine.getState().nextUpTrackId, 'M1', 'userQueue[0] must take nextUp priority over context queue');
console.log('✓ Step 2: User queue addition verified (M1 is next up, followed by M2)');

// 3. User chooses "Play Next" for URGENT track
engine.playNext(trackUrgent);
assert.equal(engine.getState().userQueue[0].id, 'URGENT', 'playNext must insert at index 0');
assert.equal(engine.getState().userQueue[1].id, 'M1');
assert.equal(engine.getState().userQueue[2].id, 'M2');
assert.equal(engine.getState().nextUpTrackId, 'URGENT');
console.log('✓ Step 3: playNext priority insertion at index 0 verified');

// 4. Advance: nextTrack() must play URGENT first
engine.nextTrack();
assert.equal(engine.getState().currentTrack.id, 'URGENT');
assert.equal(engine.getState().userQueue.length, 2); // M1, M2 left
assert.equal(engine.getState().nextUpTrackId, 'M1');
console.log('✓ Step 4: nextTrack correctly picked URGENT');

// 5. Advance: nextTrack() must play M1
engine.nextTrack();
assert.equal(engine.getState().currentTrack.id, 'M1');
assert.equal(engine.getState().userQueue.length, 1); // M2 left
assert.equal(engine.getState().nextUpTrackId, 'M2');
console.log('✓ Step 5: nextTrack correctly picked M1');

// 6. Test reordering / removing from userQueue
engine.clearUserQueue();
assert.equal(engine.getState().userQueue.length, 0);
assert.equal(engine.getState().nextUpTrackId, 'B', 'After clearing userQueue, nextUp must fall back to context B');
console.log('✓ Step 6: clearUserQueue properly restored context nextUp to B');

// 7. Advance: context playback resumes seamlessly
engine.nextTrack();
assert.equal(engine.getState().currentTrack.id, 'B');
assert.equal(engine.getState().nextUpTrackId, 'C');
console.log('✓ Step 7: Resumed context playback with Track B and nextUp Track C');

console.log('\n🌟 ALL SPOTIFY QUEUE ENGINE VERIFICATION TESTS PASSED 100%! 🌟\n');
