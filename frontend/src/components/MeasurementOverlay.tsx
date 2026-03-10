/**
 * Measurement Overlay Component
 * 
 * Allows user to draw a quadrilateral on an image to measure area.
 * Supports calibration for first-time use.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  PanResponder,
  Dimensions,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Calibration,
  MeasurementArea,
  calculatePixelDimensions,
  calculatePixelArea,
  pixelsToFeet,
  pixelAreaToSqFt,
  calculateCalibration,
  saveCalibration,
  getCalibration,
  pixelDistance,
} from '../utils/measurement';

const HANDLE_SIZE = 24;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MeasurementOverlayProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  onMeasurementComplete: (measurement: {
    widthFt: number;
    heightFt: number;
    areaSqFt: number;
    calibration: Calibration;
  }) => void;
  onCancel: () => void;
}

export default function MeasurementOverlay({
  imageUri,
  imageWidth,
  imageHeight,
  onMeasurementComplete,
  onCancel,
}: MeasurementOverlayProps) {
  // Calculate display dimensions
  const displayWidth = SCREEN_WIDTH - 32;
  const aspectRatio = imageHeight / imageWidth;
  const displayHeight = Math.min(displayWidth * aspectRatio, 400);
  const finalWidth = displayHeight < displayWidth * aspectRatio ? displayHeight / aspectRatio : displayWidth;
  
  const scaleX = imageWidth / finalWidth;
  const scaleY = imageHeight / displayHeight;

  // State
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [calibrationInput, setCalibrationInput] = useState('');
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  
  // Initialize corner positions (default to image edges with padding)
  const padding = 30;
  const [area, setArea] = useState<MeasurementArea>({
    topLeft: { x: padding, y: padding },
    topRight: { x: finalWidth - padding, y: padding },
    bottomRight: { x: finalWidth - padding, y: displayHeight - padding },
    bottomLeft: { x: padding, y: displayHeight - padding },
  });

  // Load calibration on mount
  useEffect(() => {
    loadCalibration();
  }, []);

  const loadCalibration = async () => {
    const saved = await getCalibration();
    if (saved) {
      setCalibration(saved);
    } else {
      // Need calibration - show modal after user adjusts area
    }
  };

  // Create pan responder for each handle
  const createPanResponder = (handleKey: keyof MeasurementArea) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setActiveHandle(handleKey),
      onPanResponderMove: (_, gesture) => {
        setArea(prev => {
          const current = prev[handleKey];
          const newX = Math.max(0, Math.min(finalWidth, current.x + gesture.dx));
          const newY = Math.max(0, Math.min(displayHeight, current.y + gesture.dy));
          return { ...prev, [handleKey]: { x: newX, y: newY } };
        });
      },
      onPanResponderRelease: () => setActiveHandle(null),
    });
  };

  const panResponders = {
    topLeft: createPanResponder('topLeft'),
    topRight: createPanResponder('topRight'),
    bottomRight: createPanResponder('bottomRight'),
    bottomLeft: createPanResponder('bottomLeft'),
  };

  // Calculate measurements
  const scaledArea: MeasurementArea = {
    topLeft: { x: area.topLeft.x * scaleX, y: area.topLeft.y * scaleY },
    topRight: { x: area.topRight.x * scaleX, y: area.topRight.y * scaleY },
    bottomRight: { x: area.bottomRight.x * scaleX, y: area.bottomRight.y * scaleY },
    bottomLeft: { x: area.bottomLeft.x * scaleX, y: area.bottomLeft.y * scaleY },
  };
  
  const pixelDims = calculatePixelDimensions(scaledArea);
  const pixelArea = calculatePixelArea(scaledArea);

  // Real measurements (if calibrated)
  const realWidth = calibration ? pixelsToFeet(pixelDims.width, calibration) : null;
  const realHeight = calibration ? pixelsToFeet(pixelDims.height, calibration) : null;
  const realArea = calibration ? pixelAreaToSqFt(pixelArea, calibration) : null;

  // Handle calibration
  const handleCalibrate = () => {
    setShowCalibrationModal(true);
  };

  const submitCalibration = async () => {
    const feet = parseFloat(calibrationInput);
    if (isNaN(feet) || feet <= 0) {
      Alert.alert('Invalid', 'Please enter a valid measurement in feet');
      return;
    }
    
    // Use the top edge as the calibration reference
    const topEdgePixels = pixelDistance(scaledArea.topLeft, scaledArea.topRight);
    const newCalibration = calculateCalibration(topEdgePixels, feet);
    
    await saveCalibration(newCalibration);
    setCalibration(newCalibration);
    setShowCalibrationModal(false);
    setCalibrationInput('');
  };

  const handleComplete = () => {
    if (!calibration) {
      Alert.alert('Calibration Required', 'Please calibrate first by tapping the ruler icon and entering a known measurement.');
      return;
    }
    
    onMeasurementComplete({
      widthFt: realWidth!,
      heightFt: realHeight!,
      areaSqFt: realArea!,
      calibration,
    });
  };

  const handleLabels = ['TL', 'TR', 'BR', 'BL'];
  const handleKeys: (keyof MeasurementArea)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        Drag corners to outline the area to measure
      </Text>
      
      <View style={[styles.imageContainer, { width: finalWidth, height: displayHeight }]}>
        <Image
          source={{ uri: imageUri }}
          style={{ width: finalWidth, height: displayHeight }}
          resizeMode="contain"
        />
        
        {/* Measurement area overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Draw lines between corners */}
          {handleKeys.map((key, i) => {
            const nextKey = handleKeys[(i + 1) % 4];
            const start = area[key];
            const end = area[nextKey];
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            
            return (
              <View
                key={`line-${i}`}
                style={[
                  styles.line,
                  {
                    left: start.x,
                    top: start.y,
                    width: length,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}
          
          {/* Semi-transparent fill */}
          <View
            style={[
              styles.areaFill,
              {
                left: Math.min(area.topLeft.x, area.bottomLeft.x),
                top: Math.min(area.topLeft.y, area.topRight.y),
                width: Math.max(area.topRight.x, area.bottomRight.x) - Math.min(area.topLeft.x, area.bottomLeft.x),
                height: Math.max(area.bottomLeft.y, area.bottomRight.y) - Math.min(area.topLeft.y, area.topRight.y),
              },
            ]}
          />
        </View>

        {/* Draggable handles */}
        {handleKeys.map((key, index) => (
          <View
            key={key}
            {...panResponders[key].panHandlers}
            style={[
              styles.handle,
              {
                left: area[key].x - HANDLE_SIZE / 2,
                top: area[key].y - HANDLE_SIZE / 2,
                backgroundColor: activeHandle === key ? '#FF3B30' : '#007AFF',
              },
            ]}
          >
            <Text style={styles.handleLabel}>{handleLabels[index]}</Text>
          </View>
        ))}
      </View>

      {/* Measurements Display */}
      <View style={styles.measurementsCard}>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Width:</Text>
          <Text style={styles.measurementValue}>
            {realWidth ? `${realWidth.toFixed(2)} ft` : `${pixelDims.width.toFixed(0)} px`}
          </Text>
        </View>
        <View style={styles.measurementRow}>
          <Text style={styles.measurementLabel}>Height:</Text>
          <Text style={styles.measurementValue}>
            {realHeight ? `${realHeight.toFixed(2)} ft` : `${pixelDims.height.toFixed(0)} px`}
          </Text>
        </View>
        <View style={[styles.measurementRow, styles.areaRow]}>
          <Text style={styles.measurementLabel}>Area:</Text>
          <Text style={styles.areaValue}>
            {realArea ? `${realArea.toFixed(2)} sq ft` : `${pixelArea.toFixed(0)} sq px`}
          </Text>
        </View>
        {!calibration && (
          <Text style={styles.calibrationHint}>Tap ruler icon to calibrate with a known measurement</Text>
        )}
        {calibration && (
          <Text style={styles.calibratedText}>✓ Calibrated ({calibration.pixelsPerFoot.toFixed(1)} px/ft)</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={20} color="#666" />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.calibrateButton} onPress={handleCalibrate}>
          <Ionicons name="resize" size={20} color="#FF9500" />
          <Text style={styles.calibrateText}>{calibration ? 'Recalibrate' : 'Calibrate'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.confirmButton} onPress={handleComplete}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.confirmText}>Use</Text>
        </TouchableOpacity>
      </View>

      {/* Calibration Modal */}
      <Modal visible={showCalibrationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Calibrate Measurement</Text>
            <Text style={styles.modalText}>
              Enter the actual width (top edge) of the selected area in feet:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={calibrationInput}
              onChangeText={setCalibrationInput}
              placeholder="e.g., 10"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            <Text style={styles.modalHint}>
              Tip: Use a known reference like a door (usually 6.67 ft tall) or measure one wall section.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCalibrationModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitCalibration}>
                <Text style={styles.modalConfirmText}>Calibrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 16 },
  instruction: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  imageContainer: { alignSelf: 'center', backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' },
  line: { position: 'absolute', height: 3, backgroundColor: '#007AFF', transformOrigin: 'left center' },
  areaFill: { position: 'absolute', backgroundColor: 'rgba(0, 122, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(0, 122, 255, 0.5)' },
  handle: { position: 'absolute', width: HANDLE_SIZE, height: HANDLE_SIZE, borderRadius: HANDLE_SIZE / 2, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  handleLabel: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  measurementsCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginTop: 16 },
  measurementRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  measurementLabel: { color: '#999', fontSize: 15 },
  measurementValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
  areaRow: { borderTopWidth: 1, borderTopColor: '#444', marginTop: 8, paddingTop: 12 },
  areaValue: { color: '#007AFF', fontSize: 20, fontWeight: 'bold' },
  calibrationHint: { color: '#FF9500', fontSize: 12, marginTop: 12, textAlign: 'center' },
  calibratedText: { color: '#34C759', fontSize: 12, marginTop: 12, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  cancelButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', paddingVertical: 14, borderRadius: 10, gap: 6 },
  cancelText: { color: '#999', fontSize: 15 },
  calibrateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3a2a00', paddingVertical: 14, borderRadius: 10, gap: 6 },
  calibrateText: { color: '#FF9500', fontSize: 15 },
  confirmButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, gap: 6 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#2a2a2a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalText: { color: '#ccc', fontSize: 14, marginBottom: 16 },
  modalInput: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 14, fontSize: 18, color: '#fff', borderWidth: 1, borderColor: '#444' },
  modalHint: { color: '#888', fontSize: 12, marginTop: 12 },
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#444', alignItems: 'center' },
  modalCancelText: { color: '#fff', fontSize: 15 },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#007AFF', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
