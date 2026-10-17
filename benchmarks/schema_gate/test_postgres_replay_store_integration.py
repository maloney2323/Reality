"""Live PostgreSQL acceptance tests for atomic OIDC replay claims.

Set REALITY_TEST_POSTGRES_DSN to a disposable PostgreSQL database. These tests
create and drop a uniquely named table and must never target production data.
"""
from __future__ import annotations

import concurrent.futures
import os
import re
import threading
import unittest
import uuid

try:
    import psycopg
except ImportError:  # pragma: no cover - exercised when integration extra is absent
    psycopg = None

from replay_store import PostgresReplayStore, ReplayStoreError


DSN = os.environ.get("REALITY_TEST_POSTGRES_DSN")


@unittest.skipUnless(DSN and psycopg, "requires psycopg and REALITY_TEST_POSTGRES_DSN")
class PostgresReplayStoreIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.table = "replay_it_" + uuid.uuid4().hex
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", cls.table):
            raise AssertionError("generated table name invalid")
        with psycopg.connect(DSN) as conn:
            conn.execute(
                f"CREATE TABLE {cls.table} (token_id TEXT PRIMARY KEY, expires_at BIGINT NOT NULL)"
            )

    @classmethod
    def tearDownClass(cls):
        if DSN and psycopg:
            with psycopg.connect(DSN) as conn:
                conn.execute(f"DROP TABLE IF EXISTS {cls.table}")

    @classmethod
    def store(cls):
        return PostgresReplayStore(lambda: psycopg.connect(DSN), table_name=cls.table)

    def test_50_concurrent_claims_have_exactly_one_winner(self):
        token_id = "race-" + uuid.uuid4().hex
        barrier = threading.Barrier(50)

        def attempt(_):
            barrier.wait(timeout=10)
            return self.store().claim_once(token_id, 2_000_000_000)

        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as pool:
            results = list(pool.map(attempt, range(50)))

        self.assertEqual(results.count(True), 1, f"expected exactly one claim: {results!r}")
        self.assertEqual(results.count(False), 49, f"expected 49 replay detections: {results!r}")
        with psycopg.connect(DSN) as conn:
            count = conn.execute(
                f"SELECT count(*) FROM {self.table} WHERE token_id = %s", (token_id,)
            ).fetchone()[0]
        self.assertEqual(count, 1)

    def test_commit_acknowledgement_loss_fails_closed_even_if_commit_happened(self):
        """Inject lost ACK after real commit: never report a successful claim."""
        token_id = "lost-ack-" + uuid.uuid4().hex

        class CommitAckLostConnection:
            def __init__(self, conn):
                self._conn = conn

            def cursor(self):
                return self._conn.cursor()

            def commit(self):
                self._conn.commit()
                raise TimeoutError("injected: commit succeeded, acknowledgement lost")

            def rollback(self):
                self._conn.rollback()

            def close(self):
                self._conn.close()

        store = PostgresReplayStore(
            lambda: CommitAckLostConnection(psycopg.connect(DSN)), table_name=self.table
        )
        with self.assertRaisesRegex(ReplayStoreError, "REPLAY_STORE_FAILURE"):
            store.claim_once(token_id, 2_000_000_000)

        # The database may have committed despite the caller seeing a fault.
        # A later attempt must be recognized as replay, never as a fresh claim.
        self.assertFalse(self.store().claim_once(token_id, 2_000_000_000))

    def test_database_unavailable_does_not_return_claimed_or_replay(self):
        def unavailable():
            raise TimeoutError("injected connection-pool/connect failure")

        with self.assertRaisesRegex(ReplayStoreError, "REPLAY_STORE_FAILURE"):
            PostgresReplayStore(unavailable, table_name=self.table).claim_once(
                "db-down-" + uuid.uuid4().hex, 2_000_000_000
            )


if __name__ == "__main__":
    unittest.main()
