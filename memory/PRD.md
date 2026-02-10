# Construction Estimator App - PRD

## Overview
A production-ready React Native/Expo mobile app for construction/job estimating with materials catalog, estimates/invoices, tax calculations, PDF export, and Stripe subscription-based Pro tier.

## Core Features

### 1. Materials Catalog (All Users)
- **Local Material Database**: Name, category, unit, price per unit, notes
- **Store Links**: Optional URLs to Lowe's, Home Depot, Walmart, etc.
- **Category Filtering**: Lumber, Drywall, Roofing, Flooring, Plumbing, Electrical, etc.
- **Search**: Filter by name or category
- **CRUD Operations**: Add, edit, delete materials
- **No External APIs**: All prices manually entered by user

### 2. Estimates/Invoices (Free Tier: 5 active, Pro: Unlimited)
- **Create Estimates**: Quotes for potential work (EST-0001, EST-0002...)
- **Create Invoices**: Bills for completed work (INV-0001, INV-0002...)
- **Line Items**: Reference materials or custom items with qty, unit price, notes
- **Per-Document Tax Rate**: Configurable tax % on each document
- **Status Tracking**: Draft, Sent, Accepted, Paid
- **Customer Info**: Name, email, phone, address per document
- **Document Capture**: Camera/gallery with perspective correction

### 3. Calculations
- **Line Total**: Quantity × Unit Price
- **Subtotal**: Sum of all line totals
- **Tax Amount**: Subtotal × Tax Rate %
- **Grand Total**: Subtotal + Tax

### 4. Export & Share (All Users)
- **PDF Generation**: Professional invoices using expo-print
- **Text Export**: Plain text summary
- **Share Sheet**: Email, SMS, AirDrop, save to files
- **Print**: Direct printing via system dialog

### 5. Business Settings
- **Company Info**: Name, email, phone, address
- **Logo Upload**: Pro feature only
- **Default Tax Rate**: Applied to new documents

### 6. Subscription (Stripe)
- **Free Tier**:
  - Up to 5 active estimates/invoices
  - Full materials catalog
  - PDF and text export
  - Tax calculations
- **Pro Tier ($9.99/month)**:
  - Unlimited estimates/invoices
  - Custom company logo on all exports
  - Priority support

## Technical Architecture

### Frontend (React Native + Expo)
```
/app/frontend/
├── app/
│   ├── index.tsx              # Home - estimates list
│   ├── _layout.tsx            # Navigation + SubscriptionProvider
│   ├── paywall.tsx            # Pro upgrade screen
│   ├── settings.tsx           # Business settings
│   ├── estimate/
│   │   └── [id].tsx           # Estimate detail/editor
│   └── materials/
│       ├── index.tsx          # Materials catalog list
│       └── [id].tsx           # Edit material
├── src/
│   ├── types/index.ts         # TypeScript interfaces
│   ├── store/storage.ts       # AsyncStorage utilities
│   ├── utils/
│   │   ├── calculations.ts    # Financial math
│   │   └── pdfGenerator.ts    # HTML to PDF
│   ├── SubscriptionContext.tsx # Subscription state
│   └── components/
│       ├── CornerSelector.tsx  # Document corner UI
│       └── LineItemForm.tsx    # Line item editor
```

### Backend (FastAPI + MongoDB)
```
/app/backend/
└── server.py                  # API endpoints
    ├── POST /api/customers/create
    ├── POST /api/subscriptions/create-checkout
    ├── GET  /api/subscriptions/status/{user_id}
    ├── POST /api/subscriptions/cancel/{user_id}
    └── POST /api/webhooks/stripe
```

### Environment Variables
```
# backend/.env
MONGO_URL=...                      # Auto-configured
DB_NAME=...                        # Auto-configured
STRIPE_SECRET_KEY=sk_...           # Required for payments
STRIPE_WEBHOOK_SECRET=whsec_...    # Required for webhooks
STRIPE_PRICE_ID=price_...          # Your Pro tier price ID
```

## Dependencies
- `expo-image-picker` - Camera/gallery
- `expo-image-manipulator` - Image cropping
- `expo-print` - PDF generation
- `expo-sharing` - Share sheet
- `@stripe/stripe-react-native` - Payments (requires prebuild for full functionality)
- `@react-native-async-storage/async-storage` - Local storage
- `uuid` - ID generation

## Stripe Integration Notes

### Development Mode
When `STRIPE_SECRET_KEY` is not set:
- API returns mock responses
- Subscription status defaults to free tier
- Paywall shows development mode message

### Production Setup
1. Create Stripe account and product
2. Create monthly recurring price (Pro tier)
3. Set environment variables in backend/.env
4. Configure webhook endpoint in Stripe dashboard
5. Run `npx expo prebuild` for native Stripe SDK

## No Demo Data Policy
- App starts completely empty
- No placeholder customers, materials, or invoices
- All content created by user at runtime

## Free Tier Limits
- Max 5 active (non-paid) estimates/invoices
- No logo upload
- Paywall shown when limit reached
