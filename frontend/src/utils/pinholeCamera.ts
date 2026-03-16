/**
 * Pinhole Camera Math Utilities
 * 
 * Based on the pinhole camera model:
 * distance = (focalLength * realWidth) / pixelWidth
 * 
 * Where focalLength is calculated during calibration:
 * focalLength = (pixelWidth * knownDistance) / realWidth
 */

import { CalibrationProfile } from '../contexts/MeasureContext';

/**
 * Calculate focal length during calibration
 * @param pixelWidth - width of reference object in pixels
 * @param realWidth - actual width of reference object (in current units)
 * @param distance - distance from camera to object (in current units)
 */
export function calculateFocalLength(
  pixelWidth: number,
  realWidth: number,
  distance: number
): number {
  return (pixelWidth * distance) / realWidth;
}

/**
 * Calculate distance using pinhole camera model
 * @param focalLength - calibrated focal length in pixels
 * @param realWidth - actual width of object (in current units)
 * @param pixelWidth - measured width in pixels
 */
export function calculateDistance(
  focalLength: number,
  realWidth: number,
  pixelWidth: number
): number {
  if (pixelWidth === 0) return 0;
  return (focalLength * realWidth) / pixelWidth;
}

/**
 * Calculate distance using a calibration profile
 */
export function calculateDistanceWithProfile(
  profile: CalibrationProfile,
  pixelWidth: number,
  objectRealWidth?: number
): number {
  const realWidth = objectRealWidth || profile.referenceWidth;
  return calculateDistance(profile.focalLength, realWidth, pixelWidth);
}

/**
 * Calculate confidence based on pixel width (larger = more confident)
 */
export function calculateConfidence(pixelWidth: number, imageWidth: number): number {
  const ratio = pixelWidth / imageWidth;
  // Confidence is higher when object takes up more of the frame
  // 10-50% of frame width = high confidence
  if (ratio >= 0.1 && ratio <= 0.5) return 0.95;
  if (ratio >= 0.05 && ratio < 0.1) return 0.85;
  if (ratio > 0.5 && ratio <= 0.7) return 0.85;
  if (ratio > 0.7) return 0.7; // Too close
  return 0.6; // Too far / small
}

/**
 * Convert between metric and imperial
 */
export function convertUnits(
  value: number,
  from: 'metric' | 'imperial',
  to: 'metric' | 'imperial'
): number {
  if (from === to) return value;
  if (from === 'metric' && to === 'imperial') {
    return value * 3.28084; // meters to feet
  }
  return value / 3.28084; // feet to meters
}

/**
 * Format distance for display
 */
export function formatDistance(value: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'metric') {
    if (value < 1) {
      return `${(value * 100).toFixed(1)} cm`;
    }
    return `${value.toFixed(2)} m`;
  } else {
    if (value < 1) {
      return `${(value * 12).toFixed(1)} in`;
    }
    const feet = Math.floor(value);
    const inches = (value - feet) * 12;
    if (feet === 0) {
      return `${inches.toFixed(1)} in`;
    }
    return `${feet}' ${inches.toFixed(0)}"`;
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
