"""Durable replay-store interface and PostgreSQL DB-API adapter.

Atomicity relies on a database-enforced primary key/unique constraint. This adapter
does not create tables automatically. Connection security and schema are deployment
responsibilities; in-memory stores belong only in tests.
"""
from __future__ import annotations
from typing import Any, Callable, Protocol

class ReplayStoreError(RuntimeError):
    """Replay state could not be checked and durably recorded."""

class ReplayStore(Protocol):
    def claim_once(self, token_id: str, expires_at: int) -> bool:
        """Atomically persist a previously unseen token ID; false means replay."""

class PostgresReplayStore:
    """PostgreSQL DB-API adapter using INSERT ... ON CONFLICT for atomic claim.

    Required table:
      CREATE TABLE reality_oidc_replay (
        token_id TEXT PRIMARY KEY,
        expires_at BIGINT NOT NULL
      );

    connection_factory must return a DB-API connection to a trusted database.
    The method returns True only after commit succeeds.
    """
    def __init__(self, connection_factory: Callable[[], Any], *, table_name: str = "reality_oidc_replay"):
        if not table_name or not table_name.replace("_", "").isalnum() or table_name[0].isdigit():
            raise ReplayStoreError("REPLAY_TABLE_NAME_INVALID")
        self.connection_factory, self.table_name = connection_factory, table_name

    def claim_once(self, token_id: str, expires_at: int) -> bool:
        if not isinstance(token_id, str) or not token_id:
            raise ReplayStoreError("REPLAY_TOKEN_ID_INVALID")
        if isinstance(expires_at, bool) or not isinstance(expires_at, int):
            raise ReplayStoreError("REPLAY_EXPIRY_INVALID")
        connection = None
        try:
            connection = self.connection_factory()
            cursor = connection.cursor()
            cursor.execute(
                f"INSERT INTO {self.table_name} (token_id, expires_at) VALUES (%s, %s) "
                "ON CONFLICT (token_id) DO NOTHING",
                (token_id, expires_at),
            )
            claimed = cursor.rowcount == 1
            connection.commit()
            return claimed
        except Exception as exc:
            if connection is not None:
                try: connection.rollback()
                except Exception: pass
            raise ReplayStoreError("REPLAY_STORE_FAILURE") from exc
        finally:
            if connection is not None:
                try: connection.close()
                except Exception: pass
