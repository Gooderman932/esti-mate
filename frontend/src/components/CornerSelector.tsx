/**
 * Corner Selector Component
 * 
 * Allows users to manually adjust 4 corners for perspective correction.
 * Displays draggable corner points over the document image.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  PanResponder,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Point } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface CornerSelectorProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  initialCorners?: Point[];
  onCornersChange: (corners: Point[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const CORNER_SIZE = 30;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CornerSelector({
  imageUri,
  imageWidth,
  imageHeight,
  initialCorners,
  onCornersChange,
  onConfirm,
  onCancel,
}: CornerSelectorProps) {
  // Calculate display dimensions maintaining aspect ratio
  const displayWidth = SCREEN_WIDTH - 32;
  const aspectRatio = imageHeight / imageWidth;
  const displayHeight = displayWidth * aspectRatio;
  const maxHeight = 400;
  const finalHeight = Math.min(displayHeight, maxHeight);
  const finalWidth = finalHeight < displayHeight ? finalHeight / aspectRatio : displayWidth;

  // Scale factors for coordinate conversion
  const scaleX = imageWidth / finalWidth;
  const scaleY = imageHeight / finalHeight;

  // Initialize corners at image edges if not provided
  const getDefaultCorners = (): Point[] => {
    const padding = 20;
    return [
      { x: padding, y: padding }, // Top-left
      { x: finalWidth - padding, y: padding }, // Top-right
      { x: finalWidth - padding, y: finalHeight - padding }, // Bottom-right
      { x: padding, y: finalHeight - padding }, // Bottom-left
    ];
  };

  const [corners, setCorners] = useState<Point[]>(() => {
    if (initialCorners && initialCorners.length === 4) {
      // Convert from image coordinates to display coordinates
      return initialCorners.map(c => ({
        x: c.x / scaleX,
        y: c.y / scaleY,
      }));
    }
    return getDefaultCorners();
  });

  const [activeCorner, setActiveCorner] = useState<number | null>(null);

  // Create pan responder for each corner
  const createPanResponder = (index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActiveCorner(index);
      },
      onPanResponderMove: (_, gestureState) => {
        const newCorners = [...corners];
        const newX = Math.max(0, Math.min(finalWidth, corners[index].x + gestureState.dx));
        const newY = Math.max(0, Math.min(finalHeight, corners[index].y + gestureState.dy));
        newCorners[index] = { x: newX, y: newY };
        setCorners(newCorners);
      },
      onPanResponderRelease: () => {
        setActiveCorner(null);
        // Convert display coordinates back to image coordinates
        const imageCorners = corners.map(c => ({
          x: c.x * scaleX,
          y: c.y * scaleY,
        }));
        onCornersChange(imageCorners);
      },
    });
  };

  const panResponders = useRef([
    createPanResponder(0),
    createPanResponder(1),
    createPanResponder(2),
    createPanResponder(3),
  ]).current;

  // Generate SVG path for the selection polygon
  const getPolygonPath = () => {
    return corners.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ') + ' Z';
  };

  const cornerLabels = ['TL', 'TR', 'BR', 'BL'];

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>Drag corners to adjust document edges</Text>
      
      <View style={[styles.imageContainer, { width: finalWidth, height: finalHeight }]}>
        <Image
          source={{ uri: imageUri }}
          style={{ width: finalWidth, height: finalHeight }}
          resizeMode="contain"
        />
        
        {/* Overlay polygon */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Draw lines between corners */}
          {corners.map((corner, i) => {
            const nextCorner = corners[(i + 1) % 4];
            const angle = Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x);
            const length = Math.sqrt(
              Math.pow(nextCorner.x - corner.x, 2) + Math.pow(nextCorner.y - corner.y, 2)
            );
            return (
              <View
                key={`line-${i}`}
                style={[
                  styles.line,
                  {
                    left: corner.x,
                    top: corner.y,
                    width: length,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Corner handles */}
        {corners.map((corner, index) => (
          <View
            key={index}
            {...panResponders[index].panHandlers}
            style={[
              styles.cornerHandle,
              {
                left: corner.x - CORNER_SIZE / 2,
                top: corner.y - CORNER_SIZE / 2,
                backgroundColor: activeCorner === index ? '#FF3B30' : '#007AFF',
              },
            ]}
          >
            <Text style={styles.cornerLabel}>{cornerLabels[index]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={20} color="#666" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.confirmText}>Apply Correction</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  instruction: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  imageContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  line: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#007AFF',
    transformOrigin: 'left center',
  },
  cornerHandle: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderRadius: CORNER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  cornerLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
