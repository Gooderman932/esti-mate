"""Subscription routes must require the device secret issued at registration."""

import os
import sys
from pathlib import Path

import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test")
os.environ["STRIPE_SECRET_KEY"] = ""  # mock mode: no calls to Stripe
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402
from mongomock_motor import AsyncMongoMockClient  # noqa: E402

import server  # noqa: E402


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(server, "db", AsyncMongoMockClient()["test"])
    monkeypatch.setattr(server.stripe, "api_key", "")
    return TestClient(server.app)


def register(client, user_id="user-a", headers=None):
    r = client.post("/api/customers/create", json={"user_id": user_id}, headers=headers or {})
    return r


def test_registration_issues_secret_once(client):
    first = register(client)
    assert first.status_code == 200
    secret = first.json()["device_secret"]
    assert len(secret) >= 32

    # A second call without the secret is refused, so nobody can read the
    # record or obtain a fresh secret for someone else's id.
    assert register(client).status_code == 401
    again = register(client, headers={"X-Device-Secret": secret})
    assert again.status_code == 200
    assert "device_secret" not in again.json()


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/api/subscriptions/status/user-a", None),
        ("post", "/api/subscriptions/cancel/user-a", None),
        ("post", "/api/subscriptions/create-checkout", {"user_id": "user-a"}),
        (
            "post",
            "/api/subscriptions/verify-google-play",
            {"user_id": "user-a", "product_id": "pro_monthly", "purchase_token": "t"},
        ),
    ],
)
def test_routes_reject_missing_or_wrong_secret(client, method, path, body):
    register(client)
    kwargs = {"json": body} if body else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401
    bad = {"X-Device-Secret": "not-the-secret"}
    assert getattr(client, method)(path, headers=bad, **kwargs).status_code == 401


def test_unregistered_user_is_401_not_404(client):
    # Same answer whether or not the id exists, so ids cannot be probed.
    r = client.get("/api/subscriptions/status/nobody", headers={"X-Device-Secret": "x"})
    assert r.status_code == 401


def test_owner_can_use_routes(client):
    secret = register(client).json()["device_secret"]
    h = {"X-Device-Secret": secret}
    status = client.get("/api/subscriptions/status/user-a", headers=h)
    assert status.status_code == 200
    assert status.json()["is_pro"] is False

    # No subscription yet, so cancel reports not found (after passing auth).
    assert client.post("/api/subscriptions/cancel/user-a", headers=h).status_code == 404

    play = client.post(
        "/api/subscriptions/verify-google-play",
        headers=h,
        json={"user_id": "user-a", "product_id": "pro_monthly", "purchase_token": "t"},
    )
    assert play.status_code == 200
    assert client.get("/api/subscriptions/status/user-a", headers=h).json()["is_pro"] is True


def test_secret_for_one_user_does_not_open_another(client):
    secret_a = register(client, "user-a").json()["device_secret"]
    register(client, "user-b")
    r = client.post("/api/subscriptions/cancel/user-b", headers={"X-Device-Secret": secret_a})
    assert r.status_code == 401


def test_legacy_record_without_secret_is_claimed_once(client):
    import asyncio

    asyncio.run(
        server.db.customers.insert_one(
            {"id": "c1", "user_id": "legacy", "stripe_customer_id": "cus_mock_legacy"}
        )
    )
    first = register(client, "legacy")
    assert first.status_code == 200 and first.json()["device_secret"]
    assert register(client, "legacy").status_code == 401


def test_cors_has_no_wildcard():
    cors = [m for m in server.app.user_middleware if m.cls.__name__ == "CORSMiddleware"][0]
    assert "*" not in cors.kwargs["allow_origins"]


def _signed(payload: str, secret: str) -> dict:
    import hashlib as _h
    import hmac as _hm
    import time

    ts = str(int(time.time()))
    sig = _hm.new(secret.encode(), f"{ts}.{payload}".encode(), _h.sha256).hexdigest()
    return {"stripe-signature": f"t={ts},v1={sig}", "Content-Type": "application/json"}


def test_checkout_completed_records_subscription(client, monkeypatch):
    import json

    monkeypatch.setattr(server, "STRIPE_WEBHOOK_SECRET", "whsec_test")
    secret = register(client).json()["device_secret"]
    event = {
        "id": "evt_1",
        "object": "event",
        "type": "checkout.session.completed",
        "data": {"object": {
            "object": "checkout.session",
            "mode": "subscription",
            "subscription": "sub_123",
            "customer": "cus_123",
            "metadata": {"user_id": "user-a", "plan": "pro"},
        }},
    }
    payload = json.dumps(event)
    r = client.post("/api/webhooks/stripe", content=payload, headers=_signed(payload, "whsec_test"))
    assert r.status_code == 200

    status = client.get("/api/subscriptions/status/user-a", headers={"X-Device-Secret": secret})
    assert status.json()["is_pro"] is True
    assert status.json()["subscription_id"] == "sub_123"
