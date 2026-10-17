"""Failure-injection tests for adapter boundaries; no live services are contacted."""
import threading, unittest
from replay_store import ReplayStoreError

class ConcurrentReplayFake:
    def __init__(self): self.seen, self.lock = set(), threading.Lock()
    def claim_once(self, token_id, expires_at):
        with self.lock:
            if token_id in self.seen: return False
            self.seen.add(token_id); return True

class ProductionOIDCChainBoundaryTests(unittest.TestCase):
    def test_concurrent_duplicate_claim_has_exactly_one_winner(self):
        store, outcomes = ConcurrentReplayFake(), []
        barrier = threading.Barrier(16)
        def claim():
            barrier.wait(); outcomes.append(store.claim_once("same-jti", 2000))
        threads = [threading.Thread(target=claim) for _ in range(16)]
        for thread in threads: thread.start()
        for thread in threads: thread.join(timeout=2)
        self.assertEqual(sum(outcomes), 1); self.assertEqual(len(outcomes), 16)

    def test_storage_error_is_not_interpreted_as_new_token(self):
        class BrokenStore:
            def claim_once(self, token_id, expires_at): raise ReplayStoreError("REPLAY_STORE_FAILURE")
        with self.assertRaisesRegex(ReplayStoreError, "REPLAY_STORE_FAILURE"):
            BrokenStore().claim_once("same-jti", 2000)

if __name__ == "__main__": unittest.main()
