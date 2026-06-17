/**
 * Line Item Form Component
 * 
 * Form for adding/editing a single line item with description,
 * quantity, unit price, measurement, and notes.
 * Includes Auto Measure button for camera-based measurements.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LineItem } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useMeasureContext } from '../contexts/MeasureContext';
import { formatDistance } from '../utils/pinholeCamera';

// Simple UUID generator that works in all environments
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface LineItemFormProps {
  item?: LineItem; // If editing existing item
  onSave: (item: LineItem) => void;
  onCancel: () => void;
}

export default function LineItemForm({ item, onSave, onCancel }: LineItemFormProps) {
  const router = useRouter();
  const { measurements, unitSystem, isCalibrated } = useMeasureContext();
  
  const [description, setDescription] = useState(item?.description || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1');
  const [unitPrice, setUnitPrice] = useState(item?.unitPrice?.toString() || '');
  const [measurement, setMeasurement] = useState(item?.measurement || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Watch for new measurements and auto-fill
  useEffect(() => {
    if (measurements.length > 0) {
      const latest = measurements[0];
      // Check if this is a recent measurement (within last 30 seconds)
      const measureTime = new Date(latest.timestamp).getTime();
      const now = Date.now();
      if (now - measureTime < 30000) {
        const formattedMeasure = formatDistance(latest.distance, latest.unit);
        setMeasurement(formattedMeasure);
      }
    }
  }, [measurements]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Enter a valid quantity';
    }
    
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price < 0) {
      newErrors.unitPrice = 'Enter a valid price';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    const lineItem: LineItem = {
      id: item?.id || generateId(),
      materialId: item?.materialId,
      description: description.trim(),
      quantity: parseFloat(quantity) || 1,
      unitPrice: parseFloat(unitPrice) || 0,
      unit: item?.unit || 'each',
      measurement: measurement.trim(),
      notes: notes.trim(),
    };
    
    onSave(lineItem);
  };

  const handleAutoMeasure = () => {
    router.push('/auto-measure');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>{item ? 'Edit Item' : 'Add Item'}</Text>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, errors.description && styles.inputError]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Drywall installation"
              placeholderTextColor="#999"
            />
            {errors.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={[styles.input, errors.quantity && styles.inputError]}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              {errors.quantity && (
                <Text style={styles.errorText}>{errors.quantity}</Text>
              )}
            </View>
            
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Unit Price ($) *</Text>
              <TextInput
                style={[styles.input, errors.unitPrice && styles.inputError]}
                value={unitPrice}
                onChangeText={setUnitPrice}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              {errors.unitPrice && (
                <Text style={styles.errorText}>{errors.unitPrice}</Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.measurementHeader}>
              <Text style={styles.label}>Measurement (optional)</Text>
              <TouchableOpacity style={styles.autoMeasureButton} onPress={handleAutoMeasure}>
                <Ionicons name="camera" size={16} color="#007AFF" />
                <Text style={styles.autoMeasureText}>Auto Measure</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={measurement}
              onChangeText={setMeasurement}
              placeholder="e.g., 10 ft x 8 ft"
              placeholderTextColor="#999"
            />
            {!isCalibrated && (
              <Text style={styles.calibrationHint}>
                Tip: Calibrate Auto Measure for accurate results
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional details..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {item ? 'Update Item' : 'Add Item'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  autoMeasureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  autoMeasureText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
  },
  calibrationHint: {
    color: '#FF9500',
    fontSize: 11,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
