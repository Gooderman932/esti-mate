"""Static contract tests over the frontend source.

The free-limit / paywall routing lives entirely on the device (AsyncStorage
+ ``SubscriptionContext``); there is no backend estimate endpoint to exercise
it through, and no emulator is available locally. These tests pin the
invariants that the routing depends on, so a regression in a price, a limit,
or a call site fails here instead of silently reaching the Play build:

- Tier limits: free 3 documents/month, pro 15, enterprise unlimited.
- Code prices: pro $29.99 (the stale $9.99 must not reappear in docs or UI
  code); Play Store prices are the live prices on Android and are fetched
  at runtime via ``getStorePrices``.
- Paywall routing: both create flows (estimates tab, invoices tab) check
  ``canCreateEstimate()`` and route to ``/paywall`` when the limit is hit.
- API URL: production builds intentionally ship with an empty API URL
  (Play-Billing-only path); the shared config module must exist and must
  fail loudly when a backend call is attempted without one.
- No sign-in: the user id is still a device-generated UUID (no auth was
  added by the launch-ready pass — that decision needs Matt).

Run with the backend suite: ``cd backend && pytest -q``.
"""

import json
import os
import re

REPO_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)


def read(rel_path):
    with open(os.path.join(REPO_ROOT, rel_path), encoding="utf-8") as fh:
        return fh.read()


def test_free_limit_is_3_documents_per_month():
    types = read("frontend/src/types/index.ts")
    match = re.search(r"free:\s*\{\s*maxDocumentsPerMonth:\s*(\d+)", types)
    assert match is not None, "TIER_LIMITS.free not found in src/types/index.ts"
    assert int(match.group(1)) == 3


def test_pro_limit_is_15_and_enterprise_is_unlimited():
    types = read("frontend/src/types/index.ts")
    pro = re.search(r"pro:\s*\{\s*maxDocumentsPerMonth:\s*(\d+)", types)
    ent = re.search(r"enterprise:\s*\{\s*maxDocumentsPerMonth:\s*(null|\d+)", types)
    assert pro is not None and int(pro.group(1)) == 15
    assert ent is not None and ent.group(1) == "null"


def test_code_price_pro_is_29_99_not_9_99():
    types = read("frontend/src/types/index.ts")
    match = re.search(r"pro:\s*'(\$[\d.]+)'", types)
    assert match is not None, "TIER_PRICES.pro not found in src/types/index.ts"
    assert match.group(1) == "$29.99"


def test_no_stale_9_99_price_in_docs_or_frontend():
    # The $9.99 figure survives nowhere as a *current* price: not in the
    # PRD, not in docs, not in frontend source. (This test file itself lives
    # under backend/tests and is outside the scanned trees.) Lines that
    # explicitly mark the figure as stale history — e.g. the PRD correction
    # note recording what was fixed — are allowed.
    stale = []
    for base in ("frontend/src", "frontend/app", "docs", "memory"):
        for dirpath, _dirnames, filenames in os.walk(os.path.join(REPO_ROOT, base)):
            if "node_modules" in dirpath:
                continue
            for name in filenames:
                path = os.path.join(dirpath, name)
                with open(path, encoding="utf-8", errors="ignore") as fh:
                    for line in fh:
                        if "$9.99" in line and "stale" not in line.lower():
                            stale.append(
                                f"{os.path.relpath(path, REPO_ROOT)}: {line.strip()}"
                            )
    assert stale == [], f"stale $9.99 price still presented as current in: {stale}"


def test_paywall_routing_on_limit_in_both_create_flows():
    for tab in ("frontend/app/(tabs)/index.tsx", "frontend/app/(tabs)/invoices.tsx"):
        src = read(tab)
        assert "canCreateEstimate()" in src, f"{tab}: limit check missing"
        assert "router.push('/paywall')" in src, f"{tab}: paywall route missing"


def test_paywall_falls_back_to_code_prices_when_store_prices_unavailable():
    paywall = read("frontend/app/paywall.tsx")
    assert "storePrices[plan] || TIER_PRICES[plan]" in paywall


def test_api_url_config_module_exists_and_fails_loud():
    config = read("frontend/src/config/api.ts")
    assert "requireApiUrl" in config
    assert "throw new Error" in config
    assert "Play" in config and "Billing" in config
    assert "EXPO_PUBLIC_API_BASE_URL" in config


def test_production_api_url_is_empty_by_design():
    """Empty production API URL is intentional (Play-Billing-only), not a
    forgotten value. A real URL must come from Matt; never invent one."""
    with open(os.path.join(REPO_ROOT, "frontend/app.json"), encoding="utf-8") as fh:
        app_json = json.load(fh)
    assert app_json["expo"]["extra"]["apiUrl"] == ""
    with open(os.path.join(REPO_ROOT, "frontend/eas.json"), encoding="utf-8") as fh:
        eas_json = json.load(fh)
    assert eas_json["build"]["production"]["env"]["EXPO_PUBLIC_API_BASE_URL"] == ""
    assert eas_json["build"]["preview"]["env"]["EXPO_PUBLIC_API_BASE_URL"] == ""
    # Development keeps a local backend URL for testing.
    assert (
        eas_json["build"]["development"]["env"]["EXPO_PUBLIC_API_BASE_URL"]
        == "http://localhost:8000"
    )


def test_no_sign_in_user_id_is_still_device_generated():
    storage = read("frontend/src/store/storage.ts")
    assert "userId: generateId()" in storage
