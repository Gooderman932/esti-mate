# DocScanner - Document Scanning & Estimating App

## Overview
A production-ready React Native/Expo mobile app for scanning documents, creating estimates/invoices, and generating professional PDFs. Built with local-only storage, no external APIs required.

## Core Features

### 1. Document Capture with Corner Selection
- **Camera Integration**: Take photos using device camera
- **Gallery Selection**: Pick existing photos from device
- **Manual Corner Adjustment**: Drag 4 corner points to define document edges
- **Perspective Correction**: Crops image to selected bounding box
- **Base64 Storage**: All images stored as base64 for reliability

### 2. Estimate/Invoice Management
- **Create Estimates**: Quotes for potential work (EST-0001, EST-0002, etc.)
- **Create Invoices**: Bills for completed work (INV-0001, INV-0002, etc.)
- **Status Tracking**: Draft, Sent, Accepted, Paid
- **Full CRUD**: Create, read, update, delete documents

### 3. Customer Information
- **Customer Details**: Name, email, phone, address
- **Editable Fields**: Update customer info anytime
- **No Demo Data**: All customers created by user at runtime

### 4. Line Items
- **Description**: What the line item is for
- **Quantity**: Number of units
- **Unit Price**: Price per unit
- **Measurement**: Optional field (e.g., "10 ft x 8 ft")
- **Notes**: Additional details
- **Auto-calculation**: Subtotal = Qty × Unit Price

### 5. Tax & Totals
- **Configurable Tax Rate**: Set single percentage in settings
- **Automatic Calculations**:
  - Subtotal (sum of line item totals)
  - Tax Amount (subtotal × tax rate)
  - Grand Total (subtotal + tax)

### 6. PDF Export & Sharing
- **Professional PDF Generation**: Using expo-print with HTML templates
- **Share Sheet Integration**: Email, SMS, save to files
- **Print Support**: Direct printing via system dialog
- **Includes**:
  - Business info header
  - Customer info
  - Document image (if captured)
  - Line items table
  - Subtotal, tax, and total
  - Status badge

### 7. Business Settings
- **Business Name**: Your company name
- **Contact Info**: Email, phone, address
- **Tax Rate**: Configurable percentage
- **Auto-incrementing Numbers**: EST-0001, INV-0001, etc.

## Technical Architecture

### Navigation
- **Stack Navigator**: expo-router with file-based routing
- **Home Screen**: `/` - List of all estimates/invoices
- **Detail Screen**: `/estimate/[id]` - Full editor for each document

### Storage
- **AsyncStorage**: All data persisted locally on device
- **Keys**:
  - `@docscanner_estimates`: Array of all estimates/invoices
  - `@docscanner_settings`: Business info, tax rate, counters

### Key Files
```
/app/frontend/
├── app/
│   ├── index.tsx         # Home screen - list view
│   ├── _layout.tsx       # Stack navigation config
│   └── estimate/
│       └── [id].tsx      # Detail/edit screen
├── src/
│   ├── types/
│   │   └── index.ts      # TypeScript interfaces
│   ├── store/
│   │   └── storage.ts    # AsyncStorage helpers
│   ├── utils/
│   │   ├── calculations.ts  # Financial math
│   │   └── pdfGenerator.ts  # HTML to PDF
│   └── components/
│       ├── CornerSelector.tsx  # Document corner UI
│       └── LineItemForm.tsx    # Line item editor
```

### Dependencies
- `expo-image-picker` - Camera and gallery access
- `expo-image-manipulator` - Image cropping
- `expo-print` - PDF generation from HTML
- `expo-sharing` - System share sheet
- `@react-native-async-storage/async-storage` - Local persistence
- `uuid` - Unique ID generation

## Production-Ready Quality

### No Demo Data
- App starts completely empty
- No placeholder customers, invoices, or sample items
- All content created by user at runtime

### Error Handling
- Try/catch blocks around all async operations
- User-friendly error alerts
- Graceful fallbacks for failed operations

### Data Validation
- Required fields marked with asterisks
- Form validation before saving
- Input sanitization for PDF generation

### Mobile UX Best Practices
- Touch targets ≥48px
- Keyboard avoiding views
- Pull-to-refresh on lists
- Loading states for async operations
- Long-press for delete actions

## Constraints Followed
- No backend server
- No authentication
- No external paid APIs
- No demo/placeholder data
- Minimal codebase
- Open-source libraries only

## Future Enhancements
- Full perspective transform (requires native module)
- Edge detection using ML Kit (requires prebuild)
- Multi-currency support
- Recurring invoices
- Payment tracking integration
