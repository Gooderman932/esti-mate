# Construction Estimator App - PRD

## Original Problem Statement
Build a React Native/Expo mobile app for construction/job estimating with:
1. Camera capture and document scanning
2. Corner selection for perspective correction
3. Line items management (description, quantity, unit price)
4. Tax calculations and PDF export
5. Camera-based measurement (PixelMeasure) to auto-fill line item dimensions
6. Stripe Pro subscription for unlimited estimates + logo upload

## User Personas
- Construction contractors needing on-site estimates
- Freelance tradespeople creating quick invoices
- Small construction businesses wanting professional PDF output

## Architecture
- **Frontend**: React Native / Expo (expo-router file-based routing)
- **Backend**: FastAPI (Python) on port 8001
- **Database**: MongoDB (local) + AsyncStorage (device)
- **Payments**: Stripe (web-based checkout sessions)
- **Camera**: expo-camera + pinhole camera model for measurement
- **PDF**: expo-print + expo-sharing

## Core Features Implemented

### MVP (Complete)
- ✅ Home screen with estimate list and Free tier badge (0/5 active)
- ✅ Create estimate/invoice with auto-incrementing numbers (EST-0001, INV-0001)
- ✅ Estimate detail screen with customer info, document image, line items, totals
- ✅ Camera/gallery image picker with corner selection (perspective correction)
- ✅ Line items: description, quantity, unit price, measurement, notes
- ✅ Tax calculation (configurable %) and grand total
- ✅ PDF generation and sharing (expo-print)
- ✅ Status management (draft/sent/accepted/paid)
- ✅ AsyncStorage persistence
- ✅ Materials catalog

### Stripe Pro Subscription (Complete)
- ✅ Free tier: 5 active estimates limit
- ✅ Pro tier: $9.99/month via Stripe web checkout
- ✅ Paywall screen with feature comparison
- ✅ Backend: FastAPI with Stripe customer creation, checkout session, webhooks
- ✅ SubscriptionContext for feature gating

### PixelMeasure Integration (P0 - Complete as of 2026-03-16)
- ✅ Auto Measure button in LineItemForm → navigates to /auto-measure
- ✅ Camera measurement screen: tap two points to measure distance
- ✅ Calibration via known object (pinhole camera model math)
- ✅ Measurement auto-fills in line item form via context + useEffect
- ✅ Calibration profiles management (multiple profiles)
- ✅ Measure Settings screen: unit system, profiles, grid/guides overlays
- ✅ Measurement History screen with export/delete
- ✅ MeasureContext with AsyncStorage persistence
- ✅ Back button added to camera permission denied screen

## Key Files
- `/app/frontend/app/_layout.tsx` - Root layout with MeasureProvider + SubscriptionProvider
- `/app/frontend/app/auto-measure.tsx` - Camera measurement screen
- `/app/frontend/app/measure-settings.tsx` - Calibration and settings
- `/app/frontend/app/measure-history.tsx` - Measurement history
- `/app/frontend/app/estimate/[id].tsx` - Estimate detail with line items
- `/app/frontend/src/components/LineItemForm.tsx` - Line item form with Auto Measure
- `/app/frontend/src/contexts/MeasureContext.tsx` - Measurement state management
- `/app/frontend/src/utils/pinholeCamera.ts` - Distance calculation math
- `/app/frontend/app/paywall.tsx` - Pro subscription screen
- `/app/backend/server.py` - FastAPI backend for Stripe

## Environment
- Frontend URL: https://measure-build-3.preview.emergentagent.com
- Backend: 0.0.0.0:8001 (proxied via nginx at /api/*)
- Stripe: Live keys in /app/backend/.env

## Prioritized Backlog

### P1 - Next Up
- Add Measurement History and Settings links in app Settings screen
- PDF Export Enhancement: include company logo for Pro users
- Enforce Free Tier 5-estimate limit when creating new estimates

### P2 - Future
- QuickMeasure component on estimate detail screen (recent measurements)
- Subscription status handling improvements (auto-revert on cancellation)
- Improve calibration UX with step-by-step wizard

### P3 - Nice to Have
- Offline PDF caching
- Multi-page documents
- Team sharing / cloud sync
