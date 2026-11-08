"""Backend tests for Esti-Mate Pro (backend/server.py).

Launch-ready pass, 2026-11-08. First backend tests for this repo (previously
zero). All tests run offline against an in-memory fake DB (see conftest.py);
no MongoDB, Stripe, or Google Play service is contacted.

Coverage:
- ``GET /api/health`` and ``GET /api/``
- Stripe webhook signature handling: bad/missing signature -> 400, invalid
  payload -> 400, missing webhook secret -> 503 (fail closed), valid
  signature -> 200 and the subscription record is updated
- Customer / subscription / checkout / cancel flows in mock mode
  (``STRIPE_SECRET_KEY`` unset), including the free-tier default
  (unknown user -> ``is_pro=False``, ``status="none"``)
- Google Play verify flow: unknown product -> 400; known product with no
  service account configured records the purchase unverified
  (``verified_with_google=False``) — that trust-without-verification is a
  known open risk, see the launch-ready report
- Config fail-loud: importing ``server`` without ``MONGO_URL``/``DB_NAME``
  exits instead of starting half-configured
"""

import hashlib
import hmac
import json
import os
import subprocess
import sys
import time

import pytest

import server

TEST_WEBHOOK_SECRET = "whsec_test0123456789abcdef"


def stripe_signature_header(payload: bytes, secret: str = TEST_WEBHOOK_SECRET) -> str:
    """Build a ``stripe-signature`` header the way Stripe does.

    stripe 14.x exposes no ``generate_header`` helper, so the HMAC is
    computed directly per Stripe's scheme: ``t=<ts>,v1=<hmac-sha256>`` over
    ``"<ts>.<payload>"``.
    """
    timestamp = str(int(time.time()))
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}".encode("utf-8")
    signature = hmac.new(
        secret.encode("utf-8"), signed_payload, hashlib.sha256
    ).hexdigest()
    return f"t={timestamp},v1={signature}"


def webhook_event_json(event_type="customer.subscription.updated", **overrides):
    event = {
        "id": "evt_test_123",
        "type": event_type,
        "data": {
            "object": {
                "id": "sub_123",
                "status": "active",
                "current_period_end": 1893456000,
                "cancel_at_period_end": False,
            }
        },
    }
    event["data"]["object"].update(overrides)
    return json.dumps(event).encode("utf-8")


# ---------------------------------------------------------------- health ---


def test_health_returns_200_and_healthy(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["google_play_package"] == "com.poordudeholdings.estimatemobile"
    assert body["google_play_products"] == ["pro_monthly", "enterprise_monthly"]


def test_health_reports_stripe_unconfigured_in_mock_mode(client):
    # conftest leaves STRIPE_SECRET_KEY empty, so the backend is in mock mode.
    assert server.stripe.api_key == ""
    body = client.get("/api/health").json()
    assert body["stripe_configured"] is False
    assert body["price_id"] is None


def test_health_reports_stripe_configured_when_key_set(client, monkeypatch):
    monkeypatch.setattr(server.stripe, "api_key", "sk_test_example")
    body = client.get("/api/health").json()
    assert body["stripe_configured"] is True
    assert body["price_id"] == server.STRIPE_PRICE_ID_PRO


def test_root_returns_api_name_and_version(client):
    response = client.get("/api/")
    assert response.status_code == 200
    assert response.json() == {"message": "Construction Estimator API", "version": "1.0"}


# --------------------------------------------------------------- webhook ---


def test_webhook_rejects_bad_signature_with_400(client):
    response = client.post(
        "/api/webhooks/stripe",
        content=b"{}",
        headers={"stripe-signature": "t=123,v1=deadbeef"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"


def test_webhook_rejects_missing_signature_with_400(client):
    response = client.post("/api/webhooks/stripe", content=b"{}")
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"


def test_webhook_rejects_invalid_payload_with_400(client):
    payload = b"not-json{"
    response = client.post(
        "/api/webhooks/stripe",
        content=payload,
        headers={"stripe-signature": stripe_signature_header(payload)},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid payload"


def test_webhook_refuses_when_secret_unset_503(client, monkeypatch):
    # Fail closed: with no webhook secret the signature cannot be verified,
    # so the endpoint must refuse instead of accepting unverified payloads.
    monkeypatch.setattr(server, "STRIPE_WEBHOOK_SECRET", "")
    payload = webhook_event_json()
    response = client.post(
        "/api/webhooks/stripe",
        content=payload,
        headers={"stripe-signature": stripe_signature_header(payload)},
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Webhook secret not configured"


def test_webhook_accepts_valid_signature_and_updates_subscription(client, fake_db):
    fake_db.subscriptions.docs.append(
        {
            "_id": "507f1f77bcf86cd799439011",
            "user_id": "user-1",
            "stripe_subscription_id": "sub_123",
            "stripe_customer_id": "cus_123",
            "price_id": server.STRIPE_PRICE_ID_PRO,
            "status": "past_due",
        }
    )
    payload = webhook_event_json("customer.subscription.updated", status="active")
    response = client.post(
        "/api/webhooks/stripe",
        content=payload,
        headers={"stripe-signature": stripe_signature_header(payload)},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "received"}
    record = fake_db.subscriptions.docs[0]
    assert record["status"] == "active"
    assert record["current_period_end"] == 1893456000


def test_webhook_returns_received_for_unhandled_event_type(client):
    payload = webhook_event_json("customer.created")
    response = client.post(
        "/api/webhooks/stripe",
        content=payload,
        headers={"stripe-signature": stripe_signature_header(payload)},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "received"}


def test_webhook_marks_deleted_subscription_canceled(client, fake_db):
    fake_db.subscriptions.docs.append(
        {
            "_id": "507f1f77bcf86cd799439012",
            "user_id": "user-1",
            "stripe_subscription_id": "sub_123",
            "stripe_customer_id": "cus_123",
            "price_id": server.STRIPE_PRICE_ID_PRO,
            "status": "active",
        }
    )
    payload = webhook_event_json("customer.subscription.deleted", status="canceled")
    response = client.post(
        "/api/webhooks/stripe",
        content=payload,
        headers={"stripe-signature": stripe_signature_header(payload)},
    )
    assert response.status_code == 200
    assert fake_db.subscriptions.docs[0]["status"] == "canceled"


# ------------------------------------------- customers / subscriptions -----


def register(client, user_id="device-abc"):
    """Register a device and return the headers that prove it owns user_id.

    Subscription routes require the device secret issued at registration
    (see test_device_auth.py for the access-control tests themselves).
    """
    response = client.post("/api/customers/create", json={"user_id": user_id})
    assert response.status_code == 200, response.text
    return {"X-Device-Secret": response.json()["device_secret"]}


def test_create_customer_mock_when_stripe_unconfigured(client, fake_db):
    response = client.post(
        "/api/customers/create", json={"user_id": "device-abc", "email": None}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mock"] is True
    assert body["stripe_customer_id"].startswith("cus_mock_")
    assert len(fake_db.customers.docs) == 1


def test_create_customer_is_idempotent(client, fake_db):
    first = client.post("/api/customers/create", json={"user_id": "device-abc"}).json()
    second = client.post(
        "/api/customers/create",
        json={"user_id": "device-abc"},
        headers={"X-Device-Secret": first["device_secret"]},
    ).json()
    assert first["customer_id"] == second["customer_id"]
    assert len(fake_db.customers.docs) == 1


def test_subscription_status_new_device_is_free(client):
    headers = register(client, "new-device")
    response = client.get("/api/subscriptions/status/new-device", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == "new-device"
    assert body["is_pro"] is False
    assert body["tier"] == "free"
    assert body["status"] == "none"


def test_subscription_status_returns_cached_mock_active(client, fake_db):
    fake_db.subscriptions.docs.append(
        {
            "_id": "507f1f77bcf86cd799439013",
            "user_id": "device-abc",
            "stripe_subscription_id": "sub_mock_device-",
            "stripe_customer_id": "cus_mock_device-",
            "price_id": server.STRIPE_PRICE_ID_PRO,
            "status": "active",
            "current_period_end": 1893456000,
            "cancel_at_period_end": False,
        }
    )
    headers = register(client)
    body = client.get("/api/subscriptions/status/device-abc", headers=headers).json()
    assert body["is_pro"] is True
    assert body["tier"] == "pro"
    assert body["billing_source"] == "stripe"
    assert body["status"] == "active"


def test_create_checkout_mock_when_stripe_unconfigured(client):
    headers = register(client)
    response = client.post(
        "/api/subscriptions/create-checkout",
        json={"user_id": "device-abc", "plan": "pro"},
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "mock"
    assert body["checkout_url"] is None


def test_create_checkout_unregistered_device_401(client):
    # Unregistered and unauthorized look the same, so ids can't be probed.
    response = client.post(
        "/api/subscriptions/create-checkout",
        json={"user_id": "nobody", "plan": "pro"},
    )
    assert response.status_code == 401


def test_cancel_unknown_subscription_404(client):
    headers = register(client, "nobody")
    response = client.post("/api/subscriptions/cancel/nobody", headers=headers)
    assert response.status_code == 404


def test_cancel_mock_subscription_schedules_cancel(client, fake_db):
    fake_db.subscriptions.docs.append(
        {
            "_id": "507f1f77bcf86cd799439014",
            "user_id": "device-abc",
            "stripe_subscription_id": "sub_mock_device-",
            "stripe_customer_id": "cus_mock_device-",
            "price_id": server.STRIPE_PRICE_ID_PRO,
            "status": "active",
        }
    )
    headers = register(client)
    response = client.post("/api/subscriptions/cancel/device-abc", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "cancel_scheduled"
    assert response.json()["mock"] is True
    assert fake_db.subscriptions.docs[0]["cancel_at_period_end"] is True


# ---------------------------------------------------------- google play ----


def test_verify_google_play_unknown_product_400(client):
    response = client.post(
        "/api/subscriptions/verify-google-play",
        json={
            "user_id": "device-abc",
            "product_id": "not_a_product",
            "purchase_token": "token-123",
        },
        headers=register(client),
    )
    assert response.status_code == 400
    assert "Unknown product" in response.json()["detail"]


def test_verify_google_play_known_product_records_unverified(client, fake_db):
    # No GOOGLE_SERVICE_ACCOUNT_JSON is configured, so the server records the
    # client-supplied token WITHOUT server-side verification. This test pins
    # that behaviour (and the open risk it carries) rather than endorsing it.
    assert server.GOOGLE_SERVICE_ACCOUNT_JSON == ""
    response = client.post(
        "/api/subscriptions/verify-google-play",
        json={
            "user_id": "device-abc",
            "product_id": "pro_monthly",
            "purchase_token": "token-123",
        },
        headers=register(client),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "active"
    assert body["tier"] == "pro"
    assert body["verified_with_google"] is False
    assert len(fake_db.google_play_subscriptions.docs) == 1
    assert fake_db.google_play_subscriptions.docs[0]["tier"] == "pro"


def test_verify_google_play_then_status_is_pro(client):
    headers = register(client)
    client.post(
        "/api/subscriptions/verify-google-play",
        json={
            "user_id": "device-abc",
            "product_id": "pro_monthly",
            "purchase_token": "token-123",
        },
        headers=headers,
    )
    body = client.get("/api/subscriptions/status/device-abc", headers=headers).json()
    assert body["is_pro"] is True
    assert body["tier"] == "pro"
    assert body["billing_source"] == "google_play"
    assert body["status"] == "active"


def test_expired_google_play_record_without_service_account_drops_to_free(
    client, fake_db
):
    # An expired Play record with no service account to re-check against is
    # treated as expired (marked canceled) and the user falls back to free.
    fake_db.google_play_subscriptions.docs.append(
        {
            "_id": "507f1f77bcf86cd799439015",
            "user_id": "device-abc",
            "product_id": "pro_monthly",
            "purchase_token": "token-123",
            "tier": "pro",
            "status": "active",
            "expiry_time_millis": 1000,  # long past
            "auto_renewing": True,
        }
    )
    headers = register(client)
    body = client.get("/api/subscriptions/status/device-abc", headers=headers).json()
    assert body["is_pro"] is False
    assert body["tier"] == "free"
    assert fake_db.google_play_subscriptions.docs[0]["status"] == "canceled"


# ------------------------------------------------------------- config ------


def test_server_import_requires_mongo_env():
    """Missing MONGO_URL/DB_NAME must fail loudly at import, not start broken."""
    env = {k: v for k, v in os.environ.items() if k not in ("MONGO_URL", "DB_NAME")}
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proc = subprocess.run(
        [sys.executable, "-c", "import server"],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode != 0
    assert "MONGO_URL and DB_NAME environment variables are required" in (
        proc.stdout + proc.stderr
    )
