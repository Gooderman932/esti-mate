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
- STRIPE_PRICE_ID: Pro tier price ID from Stripe dashboard
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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID', 'price_PLACEHOLDER')

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

class SubscriptionStatusResponse(BaseModel):
    user_id: str
    is_pro: bool
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
        
        # Create Checkout Session for subscription
        checkout_session = stripe.checkout.Session.create(
            customer=customer["stripe_customer_id"],
            mode="subscription",
            line_items=[{
                "price": STRIPE_PRICE_ID,
                "quantity": 1,
            }],
            success_url="https://measure-mate-21.preview.emergentagent.com/?success=true",
            cancel_url="https://measure-mate-21.preview.emergentagent.com/?canceled=true",
            metadata={"user_id": request.user_id},
        )
        
        logger.info(f"Created checkout session for user {request.user_id}")
        
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
            "status": "created"
        }
        
        return {
            "subscription_id": subscription.id,
            "client_secret": client_secret,
            "status": subscription.status
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
        # Find subscription in database
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
                
                return SubscriptionStatusResponse(
                    user_id=user_id,
                    is_pro=stripe_sub.status == "active",
                    status=stripe_sub.status,
                    subscription_id=stripe_sub.id,
                    current_period_end=stripe_sub.current_period_end,
                    cancel_at_period_end=stripe_sub.cancel_at_period_end
                )
            except stripe.error.StripeError as e:
                logger.warning(f"Could not fetch Stripe subscription: {e}")
        
        # Return cached status
        return SubscriptionStatusResponse(
            user_id=user_id,
            is_pro=subscription.get("status") == "active",
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
    """Handle Stripe webhook events"""
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("Webhook secret not configured")
        return {"status": "webhook_secret_not_configured"}
    
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
        "price_id": STRIPE_PRICE_ID if stripe.api_key else None
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
