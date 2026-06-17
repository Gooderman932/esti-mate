/**
 * Estimate/Invoice Detail Screen
 * 
 * Full editor for an estimate or invoice including:
 * - Customer information
 * - Document capture with corner selection
 * - Line items management
 * - Totals with tax
 * - PDF export and sharing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { Estimate, LineItem, AppSettings, Point, DocumentImage, CustomerInfo } from '../../src/types';
import { getEstimateById, updateEstimate, getSettings, deleteEstimate } from '../../src/store/storage';
import { calculateLineTotal, calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from '../../src/utils/calculations';
import { generatePdf, sharePdf, printPdf } from '../../src/utils/pdfGenerator';
import CornerSelector from '../../src/components/CornerSelector';
import LineItemForm from '../../src/components/LineItemForm';
import { useSubscription } from '../../src/SubscriptionContext';

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { canUploadLogo } = useSubscription();
  
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showLineItemModal, setShowLineItemModal] = useState(false);
  const [showCornerSelector, setShowCornerSelector] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Editing states
  const [editingLineItem, setEditingLineItem] = useState<LineItem | undefined>(undefined);
  const [tempImage, setTempImage] = useState<DocumentImage | null>(null);
  const [exporting, setExporting] = useState(false);

  // Load estimate and settings
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [estimateData, settingsData] = await Promise.all([
        getEstimateById(id as string),
        getSettings(),
      ]);
      
      if (!estimateData) {
        Alert.alert('Error', 'Estimate not found');
        router.back();
        return;
      }
      
      setEstimate(estimateData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading estimate:', error);
      Alert.alert('Error', 'Failed to load estimate');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Save estimate
  const saveEstimate = async (updatedEstimate: Estimate) => {
    try {
      setSaving(true);
      await updateEstimate(updatedEstimate);
      setEstimate(updatedEstimate);
    } catch (error) {
      console.error('Error saving estimate:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Delete estimate
  const handleDelete = () => {
    if (!estimate) return;
    Alert.alert(
      'Delete',
      `Are you sure you want to delete ${estimate.number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEstimate(estimate.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // Image capture
  const handleCaptureImage = async (useCamera: boolean) => {
    try {
      let result;
      
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        
        setTempImage({
          uri: base64Uri,
          originalWidth: asset.width,
          originalHeight: asset.height,
        });
        setShowCornerSelector(true);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  // Apply corner selection (crop to bounding box)
  const handleCornersConfirm = async () => {
    if (!tempImage || !estimate) return;
    
    try {
      // For simplicity, we crop to the bounding box of the selected corners
      // Full perspective transform would require native modules
      if (tempImage.corners && tempImage.corners.length === 4) {
        const xs = tempImage.corners.map(c => c.x);
        const ys = tempImage.corners.map(c => c.y);
        const minX = Math.max(0, Math.min(...xs));
        const maxX = Math.min(tempImage.originalWidth, Math.max(...xs));
        const minY = Math.max(0, Math.min(...ys));
        const maxY = Math.min(tempImage.originalHeight, Math.max(...ys));
        
        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;
        
        if (cropWidth > 10 && cropHeight > 10) {
          // Perform crop using expo-image-manipulator
          const manipResult = await ImageManipulator.manipulateAsync(
            tempImage.uri,
            [{
              crop: {
                originX: minX,
                originY: minY,
                width: cropWidth,
                height: cropHeight,
              },
            }],
            { format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          
          tempImage.correctedUri = `data:image/jpeg;base64,${manipResult.base64}`;
        }
      }
      
      const updatedEstimate = {
        ...estimate,
        documentImage: tempImage,
      };
      await saveEstimate(updatedEstimate);
      setShowCornerSelector(false);
      setTempImage(null);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image');
    }
  };

  // Line item management
  const handleAddLineItem = () => {
    setEditingLineItem(undefined);
    setShowLineItemModal(true);
  };

  const handleEditLineItem = (item: LineItem) => {
    setEditingLineItem(item);
    setShowLineItemModal(true);
  };

  const handleSaveLineItem = async (item: LineItem) => {
    if (!estimate) return;
    
    let updatedItems: LineItem[];
    if (editingLineItem) {
      updatedItems = estimate.lineItems.map(li => 
        li.id === item.id ? item : li
      );
    } else {
      updatedItems = [...estimate.lineItems, item];
    }
    
    const updatedEstimate = { ...estimate, lineItems: updatedItems };
    await saveEstimate(updatedEstimate);
    setShowLineItemModal(false);
    setEditingLineItem(undefined);
  };

  const handleDeleteLineItem = (itemId: string) => {
    if (!estimate) return;
    
    Alert.alert(
      'Delete Item',
      'Remove this line item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = estimate.lineItems.filter(li => li.id !== itemId);
            const updatedEstimate = { ...estimate, lineItems: updatedItems };
            await saveEstimate(updatedEstimate);
          },
        },
      ]
    );
  };

  // Customer update
  const handleUpdateCustomer = async (customer: CustomerInfo) => {
    if (!estimate) return;
    const updatedEstimate = { ...estimate, customer };
    await saveEstimate(updatedEstimate);
    setShowCustomerModal(false);
  };

  // Notes update
  const handleUpdateNotes = async (notes: string) => {
    if (!estimate) return;
    const updatedEstimate = { ...estimate, notes };
    await saveEstimate(updatedEstimate);
  };

  // Status update
  const handleUpdateStatus = async (status: Estimate['status']) => {
    if (!estimate) return;
    const updatedEstimate = { ...estimate, status };
    await saveEstimate(updatedEstimate);
    setShowStatusModal(false);
  };

  // Export functions
  const handleExportPdf = async () => {
    if (!estimate || !settings) return;
    
    try {
      setExporting(true);
      const pdfUri = await generatePdf(estimate, settings, canUploadLogo);
      await sharePdf(pdfUri, estimate);
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  const handlePrint = async () => {
    if (!estimate || !settings) return;
    
    try {
      setExporting(true);
      await printPdf(estimate, settings, canUploadLogo);
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print. Please try again.');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  // Calculate totals
  const subtotal = estimate ? calculateSubtotal(estimate.lineItems) : 0;
  const taxRate = estimate?.taxRate || 0;
  const taxAmount = calculateTax(subtotal, taxRate);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!estimate) return null;

  const documentImageUri = estimate.documentImage?.correctedUri || estimate.documentImage?.uri;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: estimate.number,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Status Bar */}
          <TouchableOpacity
            style={styles.statusBar}
            onPress={() => setShowStatusModal(true)}
          >
            <View style={styles.statusInfo}>
              <Text style={styles.documentType}>
                {estimate.type === 'invoice' ? 'Invoice' : 'Estimate'}
              </Text>
              <Text style={styles.documentDate}>
                Created {new Date(estimate.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(estimate.status) }]}>
              <Text style={styles.statusText}>{estimate.status}</Text>
              <Ionicons name="chevron-down" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Customer Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(true)}>
                <Ionicons name="pencil" size={18} color="#007AFF" />
              </TouchableOpacity>
            </View>
            {estimate.customer.name ? (
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{estimate.customer.name}</Text>
                {estimate.customer.email && (
                  <Text style={styles.customerDetail}>{estimate.customer.email}</Text>
                )}
                {estimate.customer.phone && (
                  <Text style={styles.customerDetail}>{estimate.customer.phone}</Text>
                )}
                {estimate.customer.address && (
                  <Text style={styles.customerDetail}>{estimate.customer.address}</Text>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addCustomerButton}
                onPress={() => setShowCustomerModal(true)}
              >
                <Ionicons name="person-add-outline" size={20} color="#007AFF" />
                <Text style={styles.addCustomerText}>Add Customer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Document Image Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Document</Text>
            </View>
            {documentImageUri ? (
              <View style={styles.documentImageContainer}>
                <Image
                  source={{ uri: documentImageUri }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
                <View style={styles.documentActions}>
                  <TouchableOpacity
                    style={styles.documentActionButton}
                    onPress={() => handleCaptureImage(true)}
                  >
                    <Ionicons name="camera" size={18} color="#007AFF" />
                    <Text style={styles.documentActionText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentActionButton}
                    onPress={() => handleCaptureImage(false)}
                  >
                    <Ionicons name="images" size={18} color="#007AFF" />
                    <Text style={styles.documentActionText}>Replace</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={() => handleCaptureImage(true)}
                >
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.captureButtonText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureButton, styles.captureButtonSecondary]}
                  onPress={() => handleCaptureImage(false)}
                >
                  <Ionicons name="images" size={24} color="#007AFF" />
                  <Text style={[styles.captureButtonText, { color: '#007AFF' }]}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Line Items Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <TouchableOpacity onPress={handleAddLineItem}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            {estimate.lineItems.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyLineItems}
                onPress={handleAddLineItem}
              >
                <Ionicons name="add-circle-outline" size={32} color="#ccc" />
                <Text style={styles.emptyLineItemsText}>Add your first line item</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.lineItemsList}>
                {estimate.lineItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.lineItem}
                    onPress={() => handleEditLineItem(item)}
                    onLongPress={() => handleDeleteLineItem(item.id)}
                  >
                    <View style={styles.lineItemMain}>
                      <Text style={styles.lineItemDescription}>{item.description}</Text>
                      {item.measurement && (
                        <Text style={styles.lineItemMeasurement}>{item.measurement}</Text>
                      )}
                      <Text style={styles.lineItemCalc}>
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </Text>
                      {item.notes && (
                        <Text style={styles.lineItemNotes}>{item.notes}</Text>
                      )}
                    </View>
                    <Text style={styles.lineItemTotal}>
                      {formatCurrency(calculateLineTotal(item))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Totals Section */}
          <View style={styles.section}>
            <View style={styles.totalsContainer}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
              </View>
              {taxRate > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Tax ({taxRate}%)</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(taxAmount)}</Text>
                </View>
              )}
              <View style={[styles.totalsRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={estimate.notes}
              onChangeText={handleUpdateNotes}
              placeholder="Add notes for this document..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Spacer for bottom buttons */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Export Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setShowExportModal(true)}
        >
          <Ionicons name="share-outline" size={22} color="#fff" />
          <Text style={styles.exportButtonText}>Export / Share</Text>
        </TouchableOpacity>
      </View>

      {/* Customer Modal */}
      <CustomerModal
        visible={showCustomerModal}
        customer={estimate.customer}
        onClose={() => setShowCustomerModal(false)}
        onSave={handleUpdateCustomer}
      />

      {/* Line Item Modal */}
      <Modal
        visible={showLineItemModal}
        animationType="slide"
        onRequestClose={() => setShowLineItemModal(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <LineItemForm
            item={editingLineItem}
            onSave={handleSaveLineItem}
            onCancel={() => {
              setShowLineItemModal(false);
              setEditingLineItem(undefined);
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Corner Selector Modal */}
      <Modal
        visible={showCornerSelector}
        animationType="slide"
        onRequestClose={() => setShowCornerSelector(false)}
      >
        {tempImage && (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <CornerSelector
              imageUri={tempImage.uri}
              imageWidth={tempImage.originalWidth}
              imageHeight={tempImage.originalHeight}
              initialCorners={tempImage.corners}
              onCornersChange={(corners) => {
                setTempImage({ ...tempImage, corners });
              }}
              onConfirm={handleCornersConfirm}
              onCancel={() => {
                setShowCornerSelector(false);
                setTempImage(null);
              }}
            />
          </SafeAreaView>
        )}
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export {estimate.number}</Text>
            
            {exporting ? (
              <View style={styles.exportingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.exportingText}>Generating PDF...</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.modalOption} onPress={handleExportPdf}>
                  <Ionicons name="share-outline" size={24} color="#007AFF" />
                  <View style={styles.modalOptionText}>
                    <Text style={styles.modalOptionTitle}>Share PDF</Text>
                    <Text style={styles.modalOptionSubtitle}>Email, message, or save</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalOption} onPress={handlePrint}>
                  <Ionicons name="print-outline" size={24} color="#34C759" />
                  <View style={styles.modalOptionText}>
                    <Text style={styles.modalOptionTitle}>Print</Text>
                    <Text style={styles.modalOptionSubtitle}>Send to printer</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowExportModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Status</Text>
            {(['draft', 'sent', 'accepted', 'paid'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  estimate.status === status && styles.statusOptionActive,
                ]}
                onPress={() => handleUpdateStatus(status)}
              >
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                <Text style={styles.statusOptionText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                {estimate.status === status && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper function for status colors
function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return '#34C759';
    case 'sent': return '#007AFF';
    case 'accepted': return '#5856D6';
    default: return '#8E8E93';
  }
}

// Customer Modal Component
function CustomerModal({
  visible,
  customer,
  onClose,
  onSave,
}: {
  visible: boolean;
  customer: CustomerInfo;
  onClose: () => void;
  onSave: (customer: CustomerInfo) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  React.useEffect(() => {
    if (visible) {
      setName(customer.name);
      setEmail(customer.email);
      setPhone(customer.phone);
      setAddress(customer.address);
    }
  }, [visible, customer]);

  const handleSave = () => {
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.customerModalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.customerModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.customerModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.customerModalTitle}>Customer</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.customerModalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.customerModalScroll}>
            <View style={styles.customerField}>
              <Text style={styles.customerLabel}>Name</Text>
              <TextInput
                style={styles.customerInput}
                value={name}
                onChangeText={setName}
                placeholder="Customer name"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.customerField}>
              <Text style={styles.customerLabel}>Email</Text>
              <TextInput
                style={styles.customerInput}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.customerField}>
              <Text style={styles.customerLabel}>Phone</Text>
              <TextInput
                style={styles.customerInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.customerField}>
              <Text style={styles.customerLabel}>Address</Text>
              <TextInput
                style={[styles.customerInput, { height: 80 }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Full address"
                placeholderTextColor="#999"
                multiline
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusInfo: {},
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  documentDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  addCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    gap: 8,
  },
  addCustomerText: {
    fontSize: 15,
    color: '#007AFF',
  },
  documentImageContainer: {
    alignItems: 'center',
  },
  documentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  documentActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  documentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  documentActionText: {
    fontSize: 14,
    color: '#007AFF',
  },
  captureButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  captureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  captureButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  captureButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  emptyLineItems: {
    alignItems: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  emptyLineItemsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  lineItemsList: {
    gap: 8,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  lineItemMain: {
    flex: 1,
    marginRight: 12,
  },
  lineItemDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  lineItemMeasurement: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  lineItemCalc: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  lineItemNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  lineItemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  totalsContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalsLabel: {
    fontSize: 15,
    color: '#666',
  },
  totalsValue: {
    fontSize: 15,
    color: '#333',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 8,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  notesInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    height: 80,
    textAlignVertical: 'top',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
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
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionText: {
    marginLeft: 16,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  exportingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  exportingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusOptionActive: {
    backgroundColor: '#f0f7ff',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  // Customer Modal Styles
  customerModalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  customerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  customerModalCancel: {
    fontSize: 16,
    color: '#666',
  },
  customerModalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  customerModalScroll: {
    flex: 1,
    padding: 16,
  },
  customerField: {
    marginBottom: 16,
  },
  customerLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  customerInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
});
