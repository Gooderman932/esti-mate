"""
Construction Estimator Backend API

Handles:
- Stripe subscription management (create customer, checkout, webhooks)
- Subscription status checking

Environment Variables Required:
- MONGO_URL: MongoDB connection string
- DB_NAME: Database name
- STRIPE_SECRET_KEY: Stripe secret key
- STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret
- STRIPE_PRICE_ID_PRO: Pro tier price ID from Stripe dashboard
- STRIPE_PRICE_ID_ENTERPRISE: Enterprise tier price ID from Stripe dashboard
- APP_URL: Public URL used for Stripe checkout redirects
- GOOGLE_PLAY_PACKAGE_NAME: Android package name (com.poordudeholdings.estimatemobile)
- GOOGLE_SERVICE_ACCOUNT_JSON: (optional) service account JSON for verifying
  Google Play purchases server-side via the Play Developer API
"""

from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection — explicit env validation so missing vars fail with a
# readable message instead of a KeyError at import time.
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')
if not MONGO_URL or not DB_NAME:
    raise SystemExit(
        "MONGO_URL and DB_NAME environment variables are required. "
        "Copy backend/.env.example to backend/.env and fill them in."
    )
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID', 'price_PLACEHOLDER')
STRIPE_PRICE_ID_PRO = os.environ.get('STRIPE_PRICE_ID_PRO', STRIPE_PRICE_ID)
STRIPE_PRICE_ID_ENTERPRISE = os.environ.get('STRIPE_PRICE_ID_ENTERPRISE', '')
APP_URL = os.environ.get('APP_URL', 'http://localhost:3000')

# Google Play configuration
GOOGLE_PLAY_PACKAGE_NAME = os.environ.get('GOOGLE_PLAY_PACKAGE_NAME', 'com.poordudeholdings.estimatemobile')
GOOGLE_SERVICE_ACCOUNT_JSON = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '')

# Google Play subscription product IDs -> tier
GOOGLE_PLAY_PRODUCT_TIERS = {
    'pro_monthly': 'pro',
    'enterprise_monthly': 'enterprise',
}

# Create the main app
app = FastAPI(title="Construction Estimator API")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============== MODELS ==============

class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Device/app user ID
    stripe_customer_id: str
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    stripe_subscription_id: str
    stripe_customer_id: str
    price_id: str
    status: str  # active, canceled, past_due, incomplete
    current_period_end: Optional[int] = None
    cancel_at_period_end: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CreateCustomerRequest(BaseModel):
    user_id: str
    email: Optional[str] = None

class CreateCheckoutRequest(BaseModel):
    user_id: str
    plan: str = "pro"  # "pro" or "enterprise"

class VerifyGooglePlayRequest(BaseModel):
    user_id: str
    product_id: str
    purchase_token: str

class SubscriptionStatusResponse(BaseModel):
    user_id: str
    is_pro: bool
    tier: str = "free"  # free, pro, enterprise
    billing_source: Optional[str] = None  # stripe or google_play
    status: str
    subscription_id: Optional[str] = None
    current_period_end: Optional[int] = None
    cancel_at_period_end: bool = False


# ============== CUSTOMER ENDPOINTS ==============

@api_router.post("/customers/create")
async def create_customer(request: CreateCustomerRequest):
    """Create a Stripe customer for this device/user"""
    try:
        # Check if customer already exists
        existing = await db.customers.find_one({"user_id": request.user_id})
        if existing:
            return {
                "customer_id": existing["id"],
                "stripe_customer_id": existing["stripe_customer_id"],
                "email": existing.get("email")
            }
        
        # Check if Stripe is configured
        if not stripe.api_key:
            # Return mock response for development without Stripe
            mock_customer = Customer(
                user_id=request.user_id,
                stripe_customer_id=f"cus_mock_{request.user_id[:8]}",
                email=request.email
            )
            await db.customers.insert_one(mock_customer.dict())
            return {
                "customer_id": mock_customer.id,
                "stripe_customer_id": mock_customer.stripe_customer_id,
                "email": mock_customer.email,
                "mock": True
            }
        
        # Create Stripe customer
        stripe_customer = stripe.Customer.create(
            email=request.email,
            metadata={"user_id": request.user_id}
        )
        
        # Store in MongoDB
        customer = Customer(
            user_id=request.user_id,
            stripe_customer_id=stripe_customer.id,
            email=request.email
        )
        await db.customers.insert_one(customer.dict())
        
        logger.info(f"Created customer for user {request.user_id}")
        
        return {
            "customer_id": customer.id,
            "stripe_customer_id": stripe_customer.id,
            "email": customer.email
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== GOOGLE PLAY BILLING ==============

def _verify_with_play_developer_api(product_id: str, purchase_token: str) -> Optional[dict]:
    """Verify a subscription purchase with the Google Play Developer API.

    Returns the subscription resource dict, or None when no service account
    is configured (in which case we trust the client-supplied token).
    Raises HTTPException when Google rejects the token.
    """
    if not GOOGLE_SERVICE_ACCOUNT_JSON:
        return None
    try:
        import json
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        credentials = service_account.Credentials.from_service_account_info(
            json.loads(GOOGLE_SERVICE_ACCOUNT_JSON),
            scopes=["https://www.googleapis.com/auth/androidpublisher"],
        )
        service = build("androidpublisher", "v3", credentials=credentials)
        result = service.purchases().subscriptions().get(
            packageName=GOOGLE_PLAY_PACKAGE_NAME,
            subscriptionId=product_id,
            token=purchase_token,
        ).execute()
        return result
    except ImportError:
        logger.warning("google-api-python-client not installed; skipping server-side verification")
        return None
    except Exception as e:
        logger.error(f"Google Play verification failed: {e}")
        raise HTTPException(status_code=400, detail="Google Play purchase verification failed")


@api_router.post("/subscriptions/verify-google-play")
async def verify_google_play_purchase(request: VerifyGooglePlayRequest):
    """Record (and optionally verify) a Google Play subscription purchase"""
    tier = GOOGLE_PLAY_PRODUCT_TIERS.get(request.product_id)
    if not tier:
        raise HTTPException(status_code=400, detail=f"Unknown product: {request.product_id}")

    expiry_ms = None
    auto_renewing = True
    verification = _verify_with_play_developer_api(request.product_id, request.purchase_token)
    if verification:
        expiry_ms = int(verification.get("expiryTimeMillis", 0)) or None
        auto_renewing = bool(verification.get("autoRenewing", True))
        if expiry_ms and expiry_ms < int(datetime.utcnow().timestamp() * 1000):
            raise HTTPException(status_code=400, detail="Subscription is expired")

    await db.google_play_subscriptions.update_one(
        {"user_id": request.user_id},
        {"$set": {
            "user_id": request.user_id,
            "product_id": request.product_id,
            "purchase_token": request.purchase_token,
            "tier": tier,
            "status": "active",
            "expiry_time_millis": expiry_ms,
            "auto_renewing": auto_renewing,
            "verified_with_google": verification is not None,
            "updated_at": datetime.utcnow(),
        }},
        upsert=True,
    )

    logger.info(f"Recorded Google Play {tier} subscription for user {request.user_id}")
    return {
        "status": "active",
        "tier": tier,
        "verified_with_google": verification is not None,
    }


async def _get_google_play_status(user_id: str) -> Optional[SubscriptionStatusResponse]:
    """Return an active Google Play subscription status for the user, if any"""
    record = await db.google_play_subscriptions.find_one({"user_id": user_id})
    if not record or record.get("status") != "active":
        return None

    expiry_ms = record.get("expiry_time_millis")
    if expiry_ms and expiry_ms < int(datetime.utcnow().timestamp() * 1000):
        # Re-check with Google in case the subscription renewed
        try:
            verification = _verify_with_play_developer_api(
                record["product_id"], record["purchase_token"]
            )
        except HTTPException:
            verification = None
        if verification:
            new_expiry = int(verification.get("expiryTimeMillis", 0)) or None
            if new_expiry and new_expiry > int(datetime.utcnow().timestamp() * 1000):
                await db.google_play_subscriptions.update_one(
                    {"_id": record["_id"]},
                    {"$set": {"expiry_time_millis": new_expiry, "updated_at": datetime.utcnow()}},
                )
                expiry_ms = new_expiry
            else:
                await db.google_play_subscriptions.update_one(
                    {"_id": record["_id"]},
                    {"$set": {"status": "canceled", "updated_at": datetime.utcnow()}},
                )
                return None
        else:
            # No way to confirm renewal; treat as expired
            await db.google_play_subscriptions.update_one(
                {"_id": record["_id"]},
                {"$set": {"status": "canceled", "updated_at": datetime.utcnow()}},
            )
            return None

    return SubscriptionStatusResponse(
        user_id=user_id,
        is_pro=True,
        tier=record.get("tier", "pro"),
        billing_source="google_play",
        status="active",
        subscription_id=record.get("product_id"),
        current_period_end=int(expiry_ms / 1000) if expiry_ms else None,
        cancel_at_period_end=not record.get("auto_renewing", True),
    )


# ============== SUBSCRIPTION ENDPOINTS ==============

@api_router.post("/subscriptions/create-checkout")
async def create_subscription_checkout(request: CreateCheckoutRequest):
    """Create a Stripe Checkout Session for subscription"""
    try:
        # Get customer
        customer = await db.customers.find_one({"user_id": request.user_id})
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found. Create customer first.")
        
        # Check if Stripe is configured
        if not stripe.api_key:
            return {
                "checkout_url": None,
                "status": "mock",
                "message": "Stripe not configured. Set STRIPE_SECRET_KEY in backend/.env"
            }
        
        # Pick the price for the requested plan
        if request.plan == "enterprise":
            price_id = STRIPE_PRICE_ID_ENTERPRISE
            if not price_id:
                raise HTTPException(status_code=400, detail="Enterprise plan not configured (STRIPE_PRICE_ID_ENTERPRISE)")
        else:
            price_id = STRIPE_PRICE_ID_PRO

        # Create Checkout Session for subscription
        checkout_session = stripe.checkout.Session.create(
            customer=customer["stripe_customer_id"],
            mode="subscription",
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            success_url=f"{APP_URL}/?success=true&user_id={request.user_id}",
            cancel_url=f"{APP_URL}/?canceled=true&user_id={request.user_id}",
            metadata={"user_id": request.user_id, "plan": request.plan},
        )
        
        logger.info(f"Created checkout session for user {request.user_id}")
        
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
            "status": "created"
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating subscription: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/subscriptions/status/{user_id}", response_model=SubscriptionStatusResponse)
async def get_subscription_status(user_id: str):
    """Get current subscription status for a user"""
    try:
        # Google Play subscription takes priority
        google_play_status = await _get_google_play_status(user_id)
        if google_play_status:
            return google_play_status

        # Find Stripe subscription in database
        subscription = await db.subscriptions.find_one({"user_id": user_id})
        
        if not subscription:
            return SubscriptionStatusResponse(
                user_id=user_id,
                is_pro=False,
                status="none"
            )
        
        # If Stripe is configured, fetch latest status
        if stripe.api_key and not subscription.get("stripe_subscription_id", "").startswith("sub_mock"):
            try:
                stripe_sub = stripe.Subscription.retrieve(subscription["stripe_subscription_id"])
                
                # Update local record
                await db.subscriptions.update_one(
                    {"_id": subscription["_id"]},
                    {"$set": {
                        "status": stripe_sub.status,
                        "current_period_end": stripe_sub.current_period_end,
                        "cancel_at_period_end": stripe_sub.cancel_at_period_end,
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                is_active = stripe_sub.status == "active"
                stripe_tier = "enterprise" if subscription.get("price_id") == STRIPE_PRICE_ID_ENTERPRISE else "pro"
                return SubscriptionStatusResponse(
                    user_id=user_id,
                    is_pro=is_active,
                    tier=stripe_tier if is_active else "free",
                    billing_source="stripe",
                    status=stripe_sub.status,
                    subscription_id=stripe_sub.id,
                    current_period_end=stripe_sub.current_period_end,
                    cancel_at_period_end=stripe_sub.cancel_at_period_end
                )
            except stripe.error.StripeError as e:
                logger.warning(f"Could not fetch Stripe subscription: {e}")
        
        # Return cached status
        is_active = subscription.get("status") == "active"
        stripe_tier = "enterprise" if subscription.get("price_id") == STRIPE_PRICE_ID_ENTERPRISE else "pro"
        return SubscriptionStatusResponse(
            user_id=user_id,
            is_pro=is_active,
            tier=stripe_tier if is_active else "free",
            billing_source="stripe",
            status=subscription.get("status", "none"),
            subscription_id=subscription.get("stripe_subscription_id"),
            current_period_end=subscription.get("current_period_end"),
            cancel_at_period_end=subscription.get("cancel_at_period_end", False)
        )
    except Exception as e:
        logger.error(f"Error getting subscription status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/subscriptions/cancel/{user_id}")
async def cancel_subscription(user_id: str):
    """Cancel a user's subscription at period end"""
    try:
        subscription = await db.subscriptions.find_one({"user_id": user_id})
        if not subscription:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        if stripe.api_key and not subscription.get("stripe_subscription_id", "").startswith("sub_mock"):
            # Cancel at period end in Stripe
            canceled_sub = stripe.Subscription.modify(
                subscription["stripe_subscription_id"],
                cancel_at_period_end=True
            )
            
            await db.subscriptions.update_one(
                {"_id": subscription["_id"]},
                {"$set": {
                    "cancel_at_period_end": True,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            return {
                "status": "cancel_scheduled",
                "current_period_end": canceled_sub.current_period_end
            }
        else:
            # Mock cancellation
            await db.subscriptions.update_one(
                {"_id": subscription["_id"]},
                {"$set": {
                    "cancel_at_period_end": True,
                    "updated_at": datetime.utcnow()
                }}
            )
            return {"status": "cancel_scheduled", "mock": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== WEBHOOK ENDPOINT ==============

@api_router.post("/webhooks/stripe")
async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events.

    Fail closed: if `STRIPE_WEBHOOK_SECRET` is unset we cannot verify the
    request signature, so we refuse with HTTP 503. Previously we returned
    200 OK, which silently accepted unverified payloads.
    """
    if not STRIPE_WEBHOOK_SECRET:
        logger.error("Webhook secret not configured — refusing request")
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    
    body = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            body, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event["type"]
    event_data = event["data"]["object"]
    
    logger.info(f"Received webhook: {event_type}")
    
    # Handle subscription events
    if event_type in ["customer.subscription.created", "customer.subscription.updated"]:
        await db.subscriptions.update_one(
            {"stripe_subscription_id": event_data["id"]},
            {"$set": {
                "status": event_data["status"],
                "current_period_end": event_data["current_period_end"],
                "cancel_at_period_end": event_data.get("cancel_at_period_end", False),
                "updated_at": datetime.utcnow()
            }}
        )
    
    elif event_type == "customer.subscription.deleted":
        await db.subscriptions.update_one(
            {"stripe_subscription_id": event_data["id"]},
            {"$set": {
                "status": "canceled",
                "updated_at": datetime.utcnow()
            }}
        )
    
    elif event_type == "invoice.paid":
        if event_data.get("subscription"):
            await db.subscriptions.update_one(
                {"stripe_subscription_id": event_data["subscription"]},
                {"$set": {
                    "status": "active",
                    "updated_at": datetime.utcnow()
                }}
            )
    
    elif event_type == "invoice.payment_failed":
        if event_data.get("subscription"):
            await db.subscriptions.update_one(
                {"stripe_subscription_id": event_data["subscription"]},
                {"$set": {
                    "status": "past_due",
                    "updated_at": datetime.utcnow()
                }}
            )
    
    return {"status": "received"}


# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "Construction Estimator API", "version": "1.0"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "stripe_configured": bool(stripe.api_key),
        "price_id": STRIPE_PRICE_ID_PRO if stripe.api_key else None,
        "google_play_configured": bool(GOOGLE_SERVICE_ACCOUNT_JSON),
        "google_play_package": GOOGLE_PLAY_PACKAGE_NAME,
        "google_play_products": list(GOOGLE_PLAY_PRODUCT_TIERS.keys()),
    }


# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
