import unittest
from replay_store import PostgresReplayStore, ReplayStoreError

class Cursor:
    def __init__(self, rowcount=1, error=None): self.rowcount, self.error, self.sql, self.params = rowcount, error, None, None
    def execute(self, sql, params):
        self.sql, self.params = sql, params
        if self.error: raise self.error

class Connection:
    def __init__(self, rowcount=1, commit_error=None):
        self._cursor, self.committed, self.rolled_back, self.closed = Cursor(rowcount), False, False, False
        self.commit_error = commit_error
    def cursor(self): return self._cursor
    def commit(self):
        if self.commit_error: raise self.commit_error
        self.committed = True
    def rollback(self): self.rolled_back = True
    def close(self): self.closed = True

class ReplayStoreTests(unittest.TestCase):
    def test_insert_committed_is_first_claim(self):
        c = Connection(); self.assertTrue(PostgresReplayStore(lambda: c).claim_once("jti-1", 1800))
        self.assertTrue(c.committed); self.assertTrue(c.closed)
        self.assertIn("ON CONFLICT (token_id) DO NOTHING", c._cursor.sql)

    def test_conflict_is_replay(self):
        c = Connection(rowcount=0); self.assertFalse(PostgresReplayStore(lambda: c).claim_once("jti-1", 1800))

    def test_commit_timeout_fails_closed(self):
        c = Connection(commit_error=TimeoutError("injected timeout"))
        with self.assertRaisesRegex(ReplayStoreError, "REPLAY_STORE_FAILURE"):
            PostgresReplayStore(lambda: c).claim_once("jti-1", 1800)
        self.assertTrue(c.rolled_back)

    def test_database_unavailable_fails_closed(self):
        def unavailable(): raise TimeoutError("database unavailable")
        with self.assertRaisesRegex(ReplayStoreError, "REPLAY_STORE_FAILURE"):
            PostgresReplayStore(unavailable).claim_once("jti-1", 1800)

    def test_execute_failure_fails_closed(self):
        c = Connection(); c._cursor.error = RuntimeError("injected write failure")
        with self.assertRaisesRegex(ReplayStoreError, "REPLAY_STORE_FAILURE"):
            PostgresReplayStore(lambda: c).claim_once("jti-1", 1800)
        self.assertTrue(c.rolled_back)

    def test_rejects_bad_table_name(self):
        with self.assertRaisesRegex(ReplayStoreError, "REPLAY_TABLE_NAME_INVALID"):
            PostgresReplayStore(lambda: Connection(), table_name="replay;DROP TABLE x")

if __name__ == "__main__": unittest.main()
