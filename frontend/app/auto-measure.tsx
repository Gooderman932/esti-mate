/**
 * Auto Measure Screen
 * 
 * Camera-based distance measurement using pinhole camera model.
 * Requires calibration before use.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMeasureContext, CalibrationProfile, Measurement } from '../src/contexts/MeasureContext';
import {
  calculateFocalLength,
  calculateDistanceWithProfile,
  calculateConfidence,
  formatDistance,
  generateId,
} from '../src/utils/pinholeCamera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAMERA_HEIGHT = SCREEN_HEIGHT * 0.5;

type MeasureMode = 'measure' | 'calibrate';

export default function AutoMeasureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const {
    unitSystem,
    calibrationProfiles,
    activeProfileId,
    getActiveProfile,
    addCalibrationProfile,
    addMeasurement,
    isCalibrated,
    showGrid,
    showGuides,
  } = useMeasureContext();

  const [mode, setMode] = useState<MeasureMode>('measure');
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // Measurement line state
  const [lineStart, setLineStart] = useState<{x: number, y: number} | null>(null);
  const [lineEnd, setLineEnd] = useState<{x: number, y: number} | null>(null);
  const [pixelWidth, setPixelWidth] = useState(0);
  
  // Calibration inputs
  const [calibName, setCalibName] = useState('');
  const [calibDistance, setCalibDistance] = useState('');
  const [calibObjectWidth, setCalibObjectWidth] = useState('');
  
  // Result
  const [lastMeasurement, setLastMeasurement] = useState<{distance: number, confidence: number} | null>(null);
  const [measureNote, setMeasureNote] = useState('');

  // Check permissions
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Calculate pixel distance when line changes
  useEffect(() => {
    if (lineStart && lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      setPixelWidth(Math.sqrt(dx * dx + dy * dy));
    } else {
      setPixelWidth(0);
    }
  }, [lineStart, lineEnd]);

  const handleCameraPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    
    if (!lineStart) {
      setLineStart({ x: locationX, y: locationY });
      setLineEnd(null);
    } else if (!lineEnd) {
      setLineEnd({ x: locationX, y: locationY });
    } else {
      // Reset for new measurement
      setLineStart({ x: locationX, y: locationY });
      setLineEnd(null);
      setLastMeasurement(null);
    }
  };

  const handleMeasure = () => {
    if (!lineStart || !lineEnd || pixelWidth === 0) {
      Alert.alert('Draw Line', 'Tap two points on the camera view to define the measurement line.');
      return;
    }

    const profile = getActiveProfile();
    if (!profile) {
      Alert.alert('Calibration Required', 'Please calibrate first by tapping the settings icon.');
      return;
    }

    const distance = calculateDistanceWithProfile(profile, pixelWidth);
    const confidence = calculateConfidence(pixelWidth, SCREEN_WIDTH);
    
    setLastMeasurement({ distance, confidence });
    setShowResultModal(true);
  };

  const handleSaveMeasurement = () => {
    if (!lastMeasurement) return;
    
    const profile = getActiveProfile();
    if (!profile) return;

    const measurement: Measurement = {
      id: generateId(),
      distance: lastMeasurement.distance,
      pixelWidth,
      referenceWidth: profile.referenceWidth,
      confidence: lastMeasurement.confidence,
      unit: unitSystem,
      profileId: profile.id,
      profileName: profile.name,
      timestamp: new Date().toISOString(),
      note: measureNote,
    };

    addMeasurement(measurement);
    setShowResultModal(false);
    setMeasureNote('');
    
    // Return measurement to caller if needed
    Alert.alert(
      'Measurement Saved',
      `Distance: ${formatDistance(lastMeasurement.distance, unitSystem)}`,
      [
        { text: 'New Measurement', onPress: () => resetMeasurement() },
        { text: 'Use This Value', onPress: () => router.back() },
      ]
    );
  };

  const handleCalibrate = () => {
    if (!lineStart || !lineEnd || pixelWidth === 0) {
      Alert.alert('Draw Line', 'First, draw a line across a known object in the camera view.');
      return;
    }
    setShowCalibrationModal(true);
  };

  const submitCalibration = () => {
    const distance = parseFloat(calibDistance);
    const objectWidth = parseFloat(calibObjectWidth);
    
    if (!calibName.trim()) {
      Alert.alert('Error', 'Please enter a profile name');
      return;
    }
    if (isNaN(distance) || distance <= 0) {
      Alert.alert('Error', 'Please enter a valid distance');
      return;
    }
    if (isNaN(objectWidth) || objectWidth <= 0) {
      Alert.alert('Error', 'Please enter a valid object width');
      return;
    }

    const focalLength = calculateFocalLength(pixelWidth, objectWidth, distance);
    
    const profile: CalibrationProfile = {
      id: generateId(),
      name: calibName.trim(),
      focalLength,
      referenceWidth: objectWidth,
      referenceWidthPixels: pixelWidth,
      referenceDistance: distance,
      createdAt: new Date().toISOString(),
      icon: 'camera',
    };

    addCalibrationProfile(profile);
    setShowCalibrationModal(false);
    resetCalibrationInputs();
    Alert.alert('Success', `Calibration profile "${profile.name}" created!`);
  };

  const resetMeasurement = () => {
    setLineStart(null);
    setLineEnd(null);
    setPixelWidth(0);
    setLastMeasurement(null);
  };

  const resetCalibrationInputs = () => {
    setCalibName('');
    setCalibDistance('');
    setCalibObjectWidth('');
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#666" />
          <Text style={styles.permissionText}>Camera permission is required for measurements</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeProfile = getActiveProfile();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auto Measure</Text>
        <TouchableOpacity onPress={() => router.push('/measure-settings')} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Calibration Status */}
      <View style={styles.statusBar}>
        {activeProfile ? (
          <View style={styles.statusActive}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={styles.statusText}>Profile: {activeProfile.name}</Text>
          </View>
        ) : (
          <View style={styles.statusInactive}>
            <Ionicons name="warning" size={16} color="#FF9500" />
            <Text style={styles.statusTextWarning}>Not calibrated - tap Calibrate to set up</Text>
          </View>
        )}
        <Text style={styles.unitText}>{unitSystem === 'metric' ? 'Metric' : 'Imperial'}</Text>
      </View>

      {/* Camera View */}
      <TouchableOpacity activeOpacity={1} onPress={handleCameraPress} style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back">
          {/* Grid Overlay */}
          {showGrid && (
            <View style={styles.gridOverlay}>
              {[1, 2].map(i => (
                <View key={`h${i}`} style={[styles.gridLine, styles.gridHorizontal, { top: `${i * 33.33}%` }]} />
              ))}
              {[1, 2].map(i => (
                <View key={`v${i}`} style={[styles.gridLine, styles.gridVertical, { left: `${i * 33.33}%` }]} />
              ))}
            </View>
          )}

          {/* Guide Lines */}
          {showGuides && (
            <View style={styles.guidesOverlay}>
              <View style={[styles.guide, styles.guideHorizontal]} />
              <View style={[styles.guide, styles.guideVertical]} />
            </View>
          )}

          {/* Measurement Line */}
          {lineStart && (
            <View style={[styles.point, { left: lineStart.x - 10, top: lineStart.y - 10 }]}>
              <Text style={styles.pointLabel}>1</Text>
            </View>
          )}
          {lineEnd && (
            <View style={[styles.point, styles.pointEnd, { left: lineEnd.x - 10, top: lineEnd.y - 10 }]}>
              <Text style={styles.pointLabel}>2</Text>
            </View>
          )}
          {lineStart && lineEnd && (
            <View style={styles.lineContainer}>
              <View
                style={[
                  styles.measureLine,
                  {
                    left: lineStart.x,
                    top: lineStart.y,
                    width: pixelWidth,
                    transform: [{
                      rotate: `${Math.atan2(lineEnd.y - lineStart.y, lineEnd.x - lineStart.x)}rad`
                    }],
                  },
                ]}
              />
            </View>
          )}

          {/* Pixel Width Display */}
          {pixelWidth > 0 && (
            <View style={styles.pixelDisplay}>
              <Text style={styles.pixelText}>{pixelWidth.toFixed(0)} px</Text>
            </View>
          )}
        </CameraView>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {!lineStart ? 'Tap point 1 on object edge' :
           !lineEnd ? 'Tap point 2 on opposite edge' :
           'Line drawn. Tap Measure or reset.'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.resetButton} onPress={resetMeasurement}>
          <Ionicons name="refresh" size={20} color="#666" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.calibrateButton, !pixelWidth && styles.buttonDisabled]}
          onPress={handleCalibrate}
          disabled={!pixelWidth}
        >
          <Ionicons name="options" size={20} color="#FF9500" />
          <Text style={styles.calibrateText}>Calibrate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.measureButton, (!pixelWidth || !activeProfile) && styles.buttonDisabled]}
          onPress={handleMeasure}
          disabled={!pixelWidth || !activeProfile}
        >
          <Ionicons name="resize" size={20} color="#fff" />
          <Text style={styles.measureText}>Measure</Text>
        </TouchableOpacity>
      </View>

      {/* Calibration Modal */}
      <Modal visible={showCalibrationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Calibration Profile</Text>
            <Text style={styles.modalSubtitle}>Line: {pixelWidth.toFixed(0)} pixels</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Profile Name</Text>
              <TextInput
                style={styles.input}
                value={calibName}
                onChangeText={setCalibName}
                placeholder="e.g., Standard Door"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Distance to Object ({unitSystem === 'metric' ? 'meters' : 'feet'})
              </Text>
              <TextInput
                style={styles.input}
                value={calibDistance}
                onChangeText={setCalibDistance}
                placeholder="e.g., 10"
                keyboardType="decimal-pad"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Object Width ({unitSystem === 'metric' ? 'meters' : 'feet'})
              </Text>
              <TextInput
                style={styles.input}
                value={calibObjectWidth}
                onChangeText={setCalibObjectWidth}
                placeholder="e.g., 3 (for a 3ft wide door)"
                keyboardType="decimal-pad"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowCalibrationModal(false); resetCalibrationInputs(); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitCalibration}>
                <Text style={styles.modalConfirmText}>Create Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Result Modal */}
      <Modal visible={showResultModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Measurement Result</Text>
            
            {lastMeasurement && (
              <>
                <Text style={styles.resultDistance}>
                  {formatDistance(lastMeasurement.distance, unitSystem)}
                </Text>
                <Text style={styles.resultConfidence}>
                  Confidence: {(lastMeasurement.confidence * 100).toFixed(0)}%
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Note (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={measureNote}
                    onChangeText={setMeasureNote}
                    placeholder="e.g., Wall A height"
                    placeholderTextColor="#666"
                  />
                </View>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowResultModal(false)}
              >
                <Text style={styles.modalCancelText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveMeasurement}>
                <Text style={styles.modalConfirmText}>Save & Use</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1a1a1a' },
  headerButton: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2a2a2a' },
  statusActive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusInactive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: '#34C759', fontSize: 13 },
  statusTextWarning: { color: '#FF9500', fontSize: 13 },
  unitText: { color: '#888', fontSize: 12 },
  cameraContainer: { flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden' },
  camera: { flex: 1 },
  gridOverlay: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.2)' },
  gridHorizontal: { left: 0, right: 0, height: 1 },
  gridVertical: { top: 0, bottom: 0, width: 1 },
  guidesOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  guide: { position: 'absolute', backgroundColor: 'rgba(0,122,255,0.3)' },
  guideHorizontal: { left: '10%', right: '10%', height: 1 },
  guideVertical: { top: '10%', bottom: '10%', width: 1 },
  point: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  pointEnd: { backgroundColor: '#34C759' },
  pointLabel: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  lineContainer: { ...StyleSheet.absoluteFillObject },
  measureLine: { position: 'absolute', height: 3, backgroundColor: '#FF3B30', transformOrigin: 'left center' },
  pixelDisplay: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pixelText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  instructions: { paddingVertical: 12, alignItems: 'center' },
  instructionText: { color: '#888', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  resetButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', paddingVertical: 14, borderRadius: 10, gap: 6 },
  resetText: { color: '#999', fontSize: 15 },
  calibrateButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3a2a00', paddingVertical: 14, borderRadius: 10, gap: 6 },
  calibrateText: { color: '#FF9500', fontSize: 15 },
  measureButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, gap: 6 },
  measureText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionText: { color: '#888', fontSize: 16, textAlign: 'center', marginTop: 16, marginBottom: 24 },
  permissionButton: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  permissionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#2a2a2a', borderRadius: 16, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 8, padding: 14, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#444' },
  modalButtons: { flexDirection: 'row', marginTop: 8, gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#444', alignItems: 'center' },
  modalCancelText: { color: '#fff', fontSize: 15 },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#007AFF', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  resultDistance: { color: '#007AFF', fontSize: 48, fontWeight: 'bold', textAlign: 'center', marginVertical: 16 },
  resultConfidence: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20 },
});
