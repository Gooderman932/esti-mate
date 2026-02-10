# Job Estimator App - Product Requirements Document

## Overview
A simple React Native/Expo mobile app for construction and job estimating. The app allows users to capture photos, measure elements visually, create line items with descriptions and rates, and generate shareable estimates/invoices.

## Core Features

### 1. Image Capture & Visual Measurement
- **Camera Integration**: Take photos using device camera
- **Gallery Selection**: Pick existing photos from device
- **Tap-to-Measure**: Users tap two points on the image to define a measurement line
- **Pixel Distance Calculation**: Calculate straight-line distance between two points
- **Calibration**: Users can set a scale factor (pixels per unit) based on a known reference measurement
- **Editable Measurement**: Users can manually override the calculated measurement

### 2. Line Item Management
- **Description**: Free-text field for item description
- **Quantity**: Numeric input for quantity (default: 1)
- **Rate**: Numeric input for per-unit rate ($)
- **Notes**: Optional multiline notes field
- **Measurement**: Automatically populated from visual measurement (can be edited)
- **Subtotal Calculation**: Automatic qty × rate calculation

### 3. Estimate List & Totals
- **Item List**: Scrollable list of all saved line items
- **Item Details**: Each item shows description, measurement, qty × rate, and subtotal
- **Grand Total**: Sum of all item subtotals
- **Delete Items**: Remove individual items with confirmation
- **Clear All**: Remove all items at once

### 4. Share/Export
- **Plain Text Generation**: Creates formatted estimate/invoice text
- **System Share**: Uses React Native Share API for SMS, email, etc.
- **Print Support**: Opens system print dialog where supported
- **Job Info**: Optional job name and client name on invoice

## Technical Implementation

### Storage
- **AsyncStorage**: All data stored locally on device
- `@job_estimator_items`: Saved line items array
- `@job_estimator_settings`: Scale factor, unit label, job/client info

### Measurement Algorithm
```javascript
// Simple tap-to-measure approach:
// 1. User taps point 1 on image
// 2. User taps point 2 on image
// 3. Calculate pixel distance: sqrt((x2-x1)² + (y2-y1)²)
// 4. Convert to real units: pixelDistance / scaleFactor
// 5. User can calibrate by providing known measurement for current distance
```

### Key Files
- `/app/frontend/app/index.tsx` - Main application (all features on one screen)
- `/app/frontend/app.json` - Expo configuration with camera permissions

### Dependencies
- `expo-image-picker` - Camera and gallery access
- `@react-native-async-storage/async-storage` - Local storage
- `@expo/vector-icons` - UI icons

## UI Structure
Single-screen layout with sections:
1. Header with job info button
2. Capture & Measure section (camera buttons + image with measurement overlay)
3. Line Item Form (description, qty, rate, notes)
4. Saved Items List with totals
5. Share button (bottom)

## Future Enhancement Ideas
- Add perspective correction for angled photos
- Integrate edge detection for auto-endpoint finding
- Use reference objects (coins, rulers) for auto-calibration
- Export to PDF format
- Add tax and discount calculations
- Multiple estimate/project support
