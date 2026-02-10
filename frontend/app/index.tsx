/**
 * Job Estimator App - Main Screen
 * 
 * A simple construction/job estimating app that allows users to:
 * 1. Take/select photos and measure elements by tapping two points
 * 2. Add line items with description, quantity, rate, and notes
 * 3. View saved items with subtotals and grand total
 * 4. Generate and share plain-text estimates/invoices
 * 
 * MEASUREMENT APPROACH:
 * - User taps two points on the image to define a measurement line
 * - Calculates pixel distance between points
 * - User can set a scale factor (e.g., "100 pixels = 1 foot") to convert to real units
 * - This simple approach works well when there's a known reference in the photo
 * 
 * EXTENDING THE MEASUREMENT LOGIC:
 * - Look for the calculateMeasurement() function to modify the calculation
 * - The scaleFactor state controls the pixels-per-unit conversion
 * - Add more sophisticated edge detection or ML here if needed later
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Share,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Storage key for persisting line items
const STORAGE_KEY = '@job_estimator_items';
const SETTINGS_KEY = '@job_estimator_settings';

// Type definitions for line items
interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  notes: string;
  measurement: string;
  createdAt: string;
}

// Type for measurement points on image
interface Point {
  x: number;
  y: number;
}

export default function Index() {
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  // Image and measurement state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [points, setPoints] = useState<Point[]>([]);
  const [measurement, setMeasurement] = useState<string>('');
  const [pixelDistance, setPixelDistance] = useState<number>(0);
  
  // Scale factor: how many pixels equal one unit (default: 100 pixels = 1 unit)
  // MODIFY THIS to change the default conversion ratio
  const [scaleFactor, setScaleFactor] = useState<number>(100);
  const [unitLabel, setUnitLabel] = useState<string>('ft');
  
  // Form state for new line item
  const [description, setDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [rate, setRate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Saved line items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  
  // Job info for invoice
  const [jobName, setJobName] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  
  // UI state
  const [showCalibration, setShowCalibration] = useState<boolean>(false);
  const [calibrationValue, setCalibrationValue] = useState<string>('1');
  const [showJobInfo, setShowJobInfo] = useState<boolean>(false);

  // ============================================================
  // LOAD/SAVE DATA
  // ============================================================
  
  // Load saved items and settings on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const itemsJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (itemsJson) {
        setLineItems(JSON.parse(itemsJson));
      }
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        setScaleFactor(settings.scaleFactor || 100);
        setUnitLabel(settings.unitLabel || 'ft');
        setJobName(settings.jobName || '');
        setClientName(settings.clientName || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveItems = async (items: LineItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving items:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
        scaleFactor,
        unitLabel,
        jobName,
        clientName,
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // ============================================================
  // IMAGE SELECTION
  // ============================================================
  
  // Request camera permissions and take photo
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Store as base64 for reliable display
      const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
      setImageUri(base64Uri);
      setImageSize({ width: asset.width, height: asset.height });
      setPoints([]);
      setPixelDistance(0);
      setMeasurement('');
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Store as base64 for reliable display
      const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
      setImageUri(base64Uri);
      setImageSize({ width: asset.width, height: asset.height });
      setPoints([]);
      setPixelDistance(0);
      setMeasurement('');
    }
  };

  // ============================================================
  // MEASUREMENT LOGIC
  // - This is the core measurement function
  // - Modify this to implement more sophisticated measurement
  // ============================================================
  
  /**
   * Calculate the real-world measurement from pixel distance
   * 
   * CURRENT APPROACH:
   * - Simple linear conversion using scale factor
   * - measurement = pixelDistance / scaleFactor
   * 
   * TO EXTEND:
   * - Add perspective correction for angled shots
   * - Integrate edge detection to auto-find endpoints
   * - Use reference objects (like coins, rulers) for auto-calibration
   */
  const calculateMeasurement = useCallback((pixelDist: number): string => {
    if (pixelDist === 0) return '';
    
    // Convert pixels to real units using scale factor
    // scaleFactor = pixels per unit (e.g., 100 pixels = 1 foot)
    const realMeasurement = pixelDist / scaleFactor;
    
    // Format to 2 decimal places with unit label
    return `${realMeasurement.toFixed(2)} ${unitLabel}`;
  }, [scaleFactor, unitLabel]);

  // Handle image tap to place measurement points
  const handleImagePress = (event: any) => {
    if (!imageUri) return;

    const { locationX, locationY } = event.nativeEvent;
    
    // Scale touch coordinates to original image coordinates
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;
    
    const newPoint: Point = {
      x: locationX * scaleX,
      y: locationY * scaleY,
    };

    if (points.length < 2) {
      const newPoints = [...points, newPoint];
      setPoints(newPoints);

      // If we have two points, calculate the distance
      if (newPoints.length === 2) {
        const dx = newPoints[1].x - newPoints[0].x;
        const dy = newPoints[1].y - newPoints[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        setPixelDistance(distance);
        setMeasurement(calculateMeasurement(distance));
      }
    } else {
      // Reset and start new measurement
      setPoints([newPoint]);
      setPixelDistance(0);
      setMeasurement('');
    }
  };

  // Update measurement when scale factor changes
  useEffect(() => {
    if (pixelDistance > 0) {
      setMeasurement(calculateMeasurement(pixelDistance));
    }
  }, [scaleFactor, unitLabel, pixelDistance, calculateMeasurement]);

  // Handle calibration - user provides known measurement for current pixel distance
  const applyCalibration = () => {
    if (pixelDistance > 0 && calibrationValue) {
      const knownValue = parseFloat(calibrationValue);
      if (knownValue > 0) {
        // New scale factor = pixels / known real measurement
        const newScaleFactor = pixelDistance / knownValue;
        setScaleFactor(newScaleFactor);
        setMeasurement(`${knownValue.toFixed(2)} ${unitLabel}`);
        saveSettings();
      }
    }
    setShowCalibration(false);
  };

  // ============================================================
  // LINE ITEM MANAGEMENT
  // ============================================================
  
  // Add new line item to the list
  const addLineItem = () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description for the line item.');
      return;
    }
    if (!rate || parseFloat(rate) <= 0) {
      Alert.alert('Required', 'Please enter a valid rate.');
      return;
    }

    const newItem: LineItem = {
      id: Date.now().toString(),
      description: description.trim(),
      quantity: parseFloat(quantity) || 1,
      rate: parseFloat(rate) || 0,
      notes: notes.trim(),
      measurement: measurement,
      createdAt: new Date().toISOString(),
    };

    const updatedItems = [...lineItems, newItem];
    setLineItems(updatedItems);
    saveItems(updatedItems);

    // Clear form
    setDescription('');
    setQuantity('1');
    setRate('');
    setNotes('');
    setMeasurement('');
    setPoints([]);
    setPixelDistance(0);
    
    Alert.alert('Success', 'Line item added to estimate.');
  };

  // Delete a line item
  const deleteItem = (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedItems = lineItems.filter(item => item.id !== id);
            setLineItems(updatedItems);
            saveItems(updatedItems);
          },
        },
      ]
    );
  };

  // Clear all items
  const clearAllItems = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to delete all line items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setLineItems([]);
            saveItems([]);
          },
        },
      ]
    );
  };

  // ============================================================
  // CALCULATIONS
  // ============================================================
  
  // Calculate line item subtotal
  const getSubtotal = (item: LineItem): number => {
    return item.quantity * item.rate;
  };

  // Calculate grand total
  const getTotal = (): number => {
    return lineItems.reduce((sum, item) => sum + getSubtotal(item), 0);
  };

  // ============================================================
  // GENERATE & SHARE ESTIMATE
  // ============================================================
  
  /**
   * Generate plain-text estimate/invoice
   * 
   * EXTENDING THE FORMAT:
   * - Modify this function to change the output format
   * - Add company logo, terms, or additional fields as needed
   * - Could be extended to generate HTML or PDF format
   */
  const generateEstimateText = (): string => {
    const date = new Date().toLocaleDateString();
    const divider = '=' .repeat(50);
    const lineDivider = '-'.repeat(50);
    
    let text = `${divider}\n`;
    text += `           JOB ESTIMATE / INVOICE\n`;
    text += `${divider}\n\n`;
    
    if (jobName) text += `Job: ${jobName}\n`;
    if (clientName) text += `Client: ${clientName}\n`;
    text += `Date: ${date}\n\n`;
    
    text += `${lineDivider}\n`;
    text += `LINE ITEMS:\n`;
    text += `${lineDivider}\n\n`;

    lineItems.forEach((item, index) => {
      text += `${index + 1}. ${item.description}\n`;
      if (item.measurement) {
        text += `   Measurement: ${item.measurement}\n`;
      }
      text += `   Qty: ${item.quantity} x $${item.rate.toFixed(2)} = $${getSubtotal(item).toFixed(2)}\n`;
      if (item.notes) {
        text += `   Notes: ${item.notes}\n`;
      }
      text += '\n';
    });

    text += `${lineDivider}\n`;
    text += `TOTAL: $${getTotal().toFixed(2)}\n`;
    text += `${divider}\n`;
    text += `\nThank you for your business!\n`;

    return text;
  };

  // Share the estimate via system share sheet
  const shareEstimate = async () => {
    if (lineItems.length === 0) {
      Alert.alert('No Items', 'Add some line items before sharing the estimate.');
      return;
    }

    const estimateText = generateEstimateText();

    try {
      await Share.share({
        message: estimateText,
        title: 'Job Estimate',
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Could not share the estimate.');
    }
  };

  // Get image display dimensions for proper scaling
  const screenWidth = Dimensions.get('window').width - 32;
  const imageDisplayHeight = 250;

  // ============================================================
  // RENDER UI
  // ============================================================
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Job Estimator</Text>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => setShowJobInfo(true)}
            >
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* ========== IMAGE & MEASUREMENT SECTION ========== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Capture & Measure</Text>
            
            {/* Camera/Gallery buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.buttonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                <Ionicons name="images" size={20} color="#fff" />
                <Text style={styles.buttonText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Image display with touch measurement */}
            {imageUri && (
              <View style={styles.imageContainer}>
                <Text style={styles.hint}>Tap two points to measure distance</Text>
                <TouchableOpacity 
                  activeOpacity={1}
                  onPress={handleImagePress}
                  onLayout={(e) => {
                    setDisplaySize({
                      width: e.nativeEvent.layout.width,
                      height: e.nativeEvent.layout.height,
                    });
                  }}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={[styles.image, { width: screenWidth, height: imageDisplayHeight }]}
                    resizeMode="contain"
                  />
                  {/* Render measurement points */}
                  {points.map((point, index) => {
                    const scaleX = displaySize.width / imageSize.width;
                    const scaleY = displaySize.height / imageSize.height;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.measurePoint,
                          {
                            left: point.x * scaleX - 10,
                            top: point.y * scaleY - 10,
                          },
                        ]}
                      >
                        <Text style={styles.pointLabel}>{index + 1}</Text>
                      </View>
                    );
                  })}
                </TouchableOpacity>
              </View>
            )}

            {/* Measurement display */}
            {pixelDistance > 0 && (
              <View style={styles.measurementDisplay}>
                <Text style={styles.measurementLabel}>Estimated Measurement:</Text>
                <TextInput
                  style={styles.measurementInput}
                  value={measurement}
                  onChangeText={setMeasurement}
                  placeholder="e.g., 10.5 ft"
                />
                <TouchableOpacity 
                  style={styles.calibrateButton}
                  onPress={() => setShowCalibration(true)}
                >
                  <Ionicons name="settings-outline" size={16} color="#007AFF" />
                  <Text style={styles.calibrateText}>Calibrate</Text>
                </TouchableOpacity>
                <Text style={styles.pixelInfo}>({pixelDistance.toFixed(0)} pixels)</Text>
              </View>
            )}
          </View>

          {/* ========== LINE ITEM FORM ========== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Add Line Item</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Description (e.g., Drywall installation)"
              value={description}
              onChangeText={setDescription}
            />
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Rate ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity style={styles.addButton} onPress={addLineItem}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add to Estimate</Text>
            </TouchableOpacity>
          </View>

          {/* ========== LINE ITEMS LIST ========== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>3. Estimate Items ({lineItems.length})</Text>
              {lineItems.length > 0 && (
                <TouchableOpacity onPress={clearAllItems}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {lineItems.length === 0 ? (
              <Text style={styles.emptyText}>No items yet. Add your first line item above.</Text>
            ) : (
              <View style={styles.itemsList}>
                {lineItems.map((item) => (
                  <View key={item.id} style={styles.lineItem}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <TouchableOpacity onPress={() => deleteItem(item.id)}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                    {item.measurement ? (
                      <Text style={styles.itemMeasurement}>Measurement: {item.measurement}</Text>
                    ) : null}
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemCalc}>
                        {item.quantity} × ${item.rate.toFixed(2)}
                      </Text>
                      <Text style={styles.itemSubtotal}>
                        ${getSubtotal(item).toFixed(2)}
                      </Text>
                    </View>
                    {item.notes ? (
                      <Text style={styles.itemNotes}>Note: {item.notes}</Text>
                    ) : null}
                  </View>
                ))}

                {/* Total */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <Text style={styles.totalAmount}>${getTotal().toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ========== SHARE BUTTON ========== */}
          <TouchableOpacity 
            style={[styles.shareButton, lineItems.length === 0 && styles.shareButtonDisabled]}
            onPress={shareEstimate}
            disabled={lineItems.length === 0}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
            <Text style={styles.shareButtonText}>Share Estimate</Text>
          </TouchableOpacity>

          <Text style={styles.shareHint}>
            Share via SMS, Email, or Print
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========== CALIBRATION MODAL ========== */}
      <Modal
        visible={showCalibration}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalibration(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Calibrate Measurement</Text>
            <Text style={styles.modalText}>
              Enter the known real-world measurement for the selected distance 
              ({pixelDistance.toFixed(0)} pixels):
            </Text>
            
            <View style={styles.calibrationRow}>
              <TextInput
                style={styles.calibrationInput}
                value={calibrationValue}
                onChangeText={setCalibrationValue}
                keyboardType="decimal-pad"
                placeholder="1.0"
              />
              <TextInput
                style={styles.unitInput}
                value={unitLabel}
                onChangeText={setUnitLabel}
                placeholder="ft"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowCalibration(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalApplyButton}
                onPress={applyCalibration}
              >
                <Text style={styles.modalApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== JOB INFO MODAL ========== */}
      <Modal
        visible={showJobInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJobInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Job Information</Text>
            <Text style={styles.modalText}>
              This info will appear on your estimate/invoice:
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={jobName}
              onChangeText={setJobName}
              placeholder="Job Name (e.g., Kitchen Renovation)"
            />
            <TextInput
              style={styles.modalInput}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Client Name"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowJobInfo(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalApplyButton}
                onPress={() => {
                  saveSettings();
                  setShowJobInfo(false);
                }}
              >
                <Text style={styles.modalApplyText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  infoButton: {
    padding: 8,
  },
  
  // Sections
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  
  // Image
  imageContainer: {
    marginTop: 8,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  image: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  measurePoint: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pointLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Measurement
  measurementDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  measurementLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  measurementInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  calibrateText: {
    color: '#007AFF',
    fontSize: 14,
  },
  pixelInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  
  // Form inputs
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // List items
  clearText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  itemsList: {
    gap: 12,
  },
  lineItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  itemMeasurement: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCalc: {
    fontSize: 14,
    color: '#666',
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  itemNotes: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
  },
  
  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#333',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
  
  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5856D6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  shareButtonDisabled: {
    backgroundColor: '#ccc',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  shareHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  calibrationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  calibrationInput: {
    flex: 2,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
  },
  unitInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalApplyText: {
    color: '#fff',
    fontWeight: '600',
  },
});
