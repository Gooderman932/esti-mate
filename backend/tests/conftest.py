"""Pytest fixtures for the Esti-Mate backend (backend/server.py).

Setup notes (launch-ready pass, 2026-11-08):
- ``server.py`` raises ``SystemExit`` at import when ``MONGO_URL``/``DB_NAME``
  are unset, so the env vars are set here *before* the import.
- No real MongoDB is needed: ``server.db`` is replaced with an in-memory
  fake (``FakeDB``) so every test runs offline with no live service.
- Stripe runs in mock mode (``STRIPE_SECRET_KEY`` empty) unless a test
  explicitly monkeypatches ``stripe.api_key``.
- The webhook secret is a *test-only* value (``whsec_test_...``). It is not a
  real secret and must never be used outside tests.
- Pinned-driver note: this suite was verified with motor==3.3.1 +
  pymongo==4.5.0 (the exact pins in ``backend/requirements.txt``). Newer
  pymongo breaks ``motor``'s import (``_QUERY_OPTIONS`` was removed), so do
  not bump pymongo without also bumping motor.
"""

import os
import uuid

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "esti_mate_test")
os.environ.setdefault("STRIPE_SECRET_KEY", "")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test0123456789abcdef")
os.environ.setdefault("GOOGLE_SERVICE_ACCOUNT_JSON", "")

import pytest  # noqa: E402

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


class FakeCollection:
    """Minimal async in-memory stand-in for a Motor collection.

    Only the operations ``server.py`` uses are implemented: ``find_one``,
    ``insert_one`` and ``update_one`` (``$set`` only, with optional upsert).
    Filters are matched by exact equality on top-level keys.
    """

    def __init__(self):
        self.docs = []

    def _matches(self, doc, filter_):
        return all(doc.get(key) == value for key, value in filter_.items())

    async def find_one(self, filter_):
        for doc in self.docs:
            if self._matches(doc, filter_):
                return dict(doc)
        return None

    async def insert_one(self, doc):
        stored = dict(doc)
        # Like real MongoDB, inject _id when the document has none.
        stored.setdefault("_id", str(uuid.uuid4()))
        self.docs.append(stored)

        class Result:
            inserted_id = stored.get("_id", stored.get("id"))

        return Result()

    async def update_one(self, filter_, update, upsert=False):
        for doc in self.docs:
            if self._matches(doc, filter_):
                doc.update(update.get("$set", {}))
                return _UpdateResult(matched_count=1, modified_count=1)
        if upsert:
            new_doc = dict(filter_)
            new_doc.update(update.get("$set", {}))
            new_doc.setdefault("_id", str(uuid.uuid4()))
            self.docs.append(new_doc)
            return _UpdateResult(matched_count=0, modified_count=0, upserted_id=True)
        return _UpdateResult(matched_count=0, modified_count=0)


class _UpdateResult:
    def __init__(self, matched_count, modified_count, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id


class FakeDB:
    """Attribute access (``db.customers``) returns a per-name collection."""

    def __init__(self):
        self._collections = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._collections.setdefault(name, FakeCollection())

    def __getitem__(self, name):
        return self.__getattr__(name)


@pytest.fixture()
def fake_db(monkeypatch):
    db = FakeDB()
    monkeypatch.setattr(server, "db", db)
    return db


@pytest.fixture()
def client(fake_db):
    return TestClient(server.app)
