/**
 * Home Screen - List of all Estimates/Invoices
 * 
 * Main entry point showing all saved estimates and invoices.
 * Users can create new estimates, view existing ones, or access settings.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Estimate, AppSettings, emptyBusiness } from '../src/types';
import { getEstimates, deleteEstimate, getSettings, saveSettings, getNextNumber, addEstimate } from '../src/store/storage';
import { calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from '../src/utils/calculations';
import { v4 as uuidv4 } from 'uuid';
import { emptyCustomer } from '../src/types';

export default function HomeScreen() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [estimatesData, settingsData] = await Promise.all([
        getEstimates(),
        getSettings(),
      ]);
      setEstimates(estimatesData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id: string, number: string) => {
    Alert.alert(
      'Delete',
      `Are you sure you want to delete ${number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEstimate(id);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCreateNew = async (type: 'estimate' | 'invoice') => {
    try {
      const number = await getNextNumber(type);
      const newEstimate: Estimate = {
        id: uuidv4(),
        type,
        number,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customer: emptyCustomer,
        lineItems: [],
        notes: '',
        status: 'draft',
      };
      await addEstimate(newEstimate);
      setShowNewModal(false);
      router.push(`/estimate/${newEstimate.id}`);
    } catch (error) {
      console.error('Error creating estimate:', error);
      Alert.alert('Error', 'Failed to create new document. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#34C759';
      case 'sent': return '#007AFF';
      case 'accepted': return '#5856D6';
      default: return '#8E8E93';
    }
  };

  const renderEstimateItem = ({ item }: { item: Estimate }) => {
    const subtotal = calculateSubtotal(item.lineItems);
    const taxAmount = settings ? calculateTax(subtotal, settings.taxRate) : 0;
    const total = calculateGrandTotal(subtotal, taxAmount);

    return (
      <TouchableOpacity
        style={styles.estimateCard}
        onPress={() => router.push(`/estimate/${item.id}`)}
        onLongPress={() => handleDelete(item.id, item.number)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.estimateNumber}>{item.number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.estimateType}>
            {item.type === 'invoice' ? 'Invoice' : 'Estimate'}
          </Text>
        </View>
        
        <View style={styles.cardBody}>
          {item.customer.name ? (
            <Text style={styles.customerName}>{item.customer.name}</Text>
          ) : (
            <Text style={styles.noCustomer}>No customer</Text>
          )}
          <Text style={styles.itemCount}>
            {item.lineItems.length} item{item.lineItems.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Estimates Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first estimate or invoice to get started
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setShowNewModal(true)}
      >
        <Text style={styles.emptyButtonText}>Create New</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>DocScanner</Text>
          <Text style={styles.subtitle}>Estimates & Invoices</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Estimates List */}
      <FlatList
        data={estimates}
        renderItem={renderEstimateItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={estimates.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {/* FAB - Create New */}
      {estimates.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowNewModal(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* New Document Modal */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleCreateNew('estimate')}
            >
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Estimate</Text>
                <Text style={styles.modalOptionSubtitle}>Quote for potential work</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleCreateNew('invoice')}
            >
              <Ionicons name="receipt-outline" size={24} color="#34C759" />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Invoice</Text>
                <Text style={styles.modalOptionSubtitle}>Bill for completed work</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowNewModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSave={async (newSettings) => {
          await saveSettings(newSettings);
          setSettings(newSettings);
          setShowSettings(false);
        }}
      />
    </SafeAreaView>
  );
}

// Settings Modal Component
function SettingsModal({
  visible,
  settings,
  onClose,
  onSave,
}: {
  visible: boolean;
  settings: AppSettings | null;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}) {
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxRate, setTaxRate] = useState('');

  React.useEffect(() => {
    if (settings) {
      setBusinessName(settings.business.name);
      setBusinessEmail(settings.business.email);
      setBusinessPhone(settings.business.phone);
      setBusinessAddress(settings.business.address);
      setTaxRate(settings.taxRate.toString());
    }
  }, [settings, visible]);

  const handleSave = () => {
    if (!settings) return;
    const newSettings: AppSettings = {
      ...settings,
      business: {
        name: businessName.trim(),
        email: businessEmail.trim(),
        phone: businessPhone.trim(),
        address: businessAddress.trim(),
      },
      taxRate: parseFloat(taxRate) || 0,
    };
    onSave(newSettings);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.settingsContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.settingsCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.settingsSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsScroll}>
            <Text style={styles.settingsSectionTitle}>Business Information</Text>
            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Business Name</Text>
              <TextInput
                style={styles.settingsInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your Business Name"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Email</Text>
              <TextInput
                style={styles.settingsInput}
                value={businessEmail}
                onChangeText={setBusinessEmail}
                placeholder="email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Phone</Text>
              <TextInput
                style={styles.settingsInput}
                value={businessPhone}
                onChangeText={setBusinessPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Address</Text>
              <TextInput
                style={[styles.settingsInput, { height: 80 }]}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder="123 Main St, City, State ZIP"
                placeholderTextColor="#999"
                multiline
              />
            </View>

            <Text style={styles.settingsSectionTitle}>Tax Settings</Text>
            <View style={styles.settingsField}>
              <Text style={styles.settingsLabel}>Tax Rate (%)</Text>
              <TextInput
                style={styles.settingsInput}
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.settingsHint}>
                Enter 0 for no tax, or a percentage like 8.25
              </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
  },
  estimateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimateNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  estimateType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  cardBody: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 15,
    color: '#333',
  },
  noCustomer: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
  },
  itemCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#999',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
  // Settings Modal Styles
  settingsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  settingsCancelText: {
    fontSize: 16,
    color: '#666',
  },
  settingsSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  settingsScroll: {
    flex: 1,
    padding: 16,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 12,
  },
  settingsField: {
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  settingsInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  settingsHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
