/**
 * Measurement utilities for pixel-to-real-world conversion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CALIBRATION_KEY = '@estimator_calibration';

export interface Calibration {
  pixelsPerFoot: number;
  calibratedAt: string;
}

export interface MeasurementArea {
  // Four corner points defining the measurement area
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

/**
 * Calculate pixel distance between two points
 */
export function pixelDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate area of a quadrilateral using Shoelace formula
 */
export function calculatePixelArea(area: MeasurementArea): number {
  const { topLeft, topRight, bottomRight, bottomLeft } = area;
  const points = [topLeft, topRight, bottomRight, bottomLeft];
  
  let pixelArea = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    pixelArea += points[i].x * points[j].y;
    pixelArea -= points[j].x * points[i].y;
  }
  return Math.abs(pixelArea) / 2;
}

/**
 * Calculate width and height of measurement area in pixels
 */
export function calculatePixelDimensions(area: MeasurementArea): { width: number; height: number } {
  const topWidth = pixelDistance(area.topLeft, area.topRight);
  const bottomWidth = pixelDistance(area.bottomLeft, area.bottomRight);
  const leftHeight = pixelDistance(area.topLeft, area.bottomLeft);
  const rightHeight = pixelDistance(area.topRight, area.bottomRight);
  
  return {
    width: (topWidth + bottomWidth) / 2,
    height: (leftHeight + rightHeight) / 2,
  };
}

/**
 * Convert pixel measurements to real-world measurements
 */
export function pixelsToFeet(pixels: number, calibration: Calibration): number {
  return pixels / calibration.pixelsPerFoot;
}

/**
 * Convert pixel area to square feet
 */
export function pixelAreaToSqFt(pixelArea: number, calibration: Calibration): number {
  const sqPixelsPerSqFoot = calibration.pixelsPerFoot * calibration.pixelsPerFoot;
  return pixelArea / sqPixelsPerSqFoot;
}

/**
 * Save calibration to storage
 */
export async function saveCalibration(calibration: Calibration): Promise<void> {
  await AsyncStorage.setItem(CALIBRATION_KEY, JSON.stringify(calibration));
}

/**
 * Load calibration from storage
 */
export async function getCalibration(): Promise<Calibration | null> {
  try {
    const json = await AsyncStorage.getItem(CALIBRATION_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Clear calibration
 */
export async function clearCalibration(): Promise<void> {
  await AsyncStorage.removeItem(CALIBRATION_KEY);
}

/**
 * Calculate calibration from known measurement
 * @param pixelLength - measured length in pixels
 * @param realFeet - actual length in feet
 */
export function calculateCalibration(pixelLength: number, realFeet: number): Calibration {
  return {
    pixelsPerFoot: pixelLength / realFeet,
    calibratedAt: new Date().toISOString(),
  };
}
