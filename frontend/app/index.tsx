/**
 * Home Screen - Estimates/Invoices List
 * 
 * Main entry point showing all estimates and access to materials
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Estimate, emptyCustomer, FREE_TIER_LIMITS } from '../src/types';
import { getEstimates, deleteEstimate, getNextNumber, addEstimate, getSettings, getActiveEstimatesCount } from '../src/store/storage';
import { calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from '../src/utils/calculations';
import { useSubscription } from '../src/SubscriptionContext';

export default function HomeScreen() {
  const router = useRouter();
  const { isPro, isLoading: subLoading, settings, refreshSettings } = useSubscription();
  
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [estimatesData, count] = await Promise.all([
        getEstimates(),
        getActiveEstimatesCount(),
      ]);
      setEstimates(estimatesData);
      setActiveCount(count);
      await refreshSettings();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id: string, number: string) => {
    Alert.alert('Delete', `Delete ${number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEstimate(id);
          await loadData();
        },
      },
    ]);
  };

  const handleCreateNew = async (type: 'estimate' | 'invoice') => {
    // Check free tier limit
    if (!isPro && activeCount >= FREE_TIER_LIMITS.maxActiveEstimates) {
      setShowNewModal(false);
      router.push('/paywall');
      return;
    }
    
    try {
      const appSettings = await getSettings();
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
        taxRate: appSettings.defaultTaxRate,
      };
      await addEstimate(newEstimate);
      setShowNewModal(false);
      router.push(`/estimate/${newEstimate.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create document');
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
    const taxAmount = calculateTax(subtotal, item.taxRate);
    const total = calculateGrandTotal(subtotal, taxAmount);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/estimate/${item.id}`)}
        onLongPress={() => handleDelete(item.id, item.number)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.number}>{item.number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.type}>{item.type === 'invoice' ? 'Invoice' : 'Estimate'}</Text>
        </View>
        <View style={styles.cardBody}>
          {item.customer.name ? (
            <Text style={styles.customerName}>{item.customer.name}</Text>
          ) : (
            <Text style={styles.noCustomer}>No customer</Text>
          )}
          <Text style={styles.itemCount}>{item.lineItems.length} item{item.lineItems.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Estimates Yet</Text>
      <Text style={styles.emptySubtitle}>Create your first estimate or invoice</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => setShowNewModal(true)}>
        <Text style={styles.emptyButtonText}>Create New</Text>
      </TouchableOpacity>
    </View>
  );

  if (subLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Estimator</Text>
          <Text style={styles.subtitle}>
            {isPro ? '✓ Pro' : `Free (${activeCount}/${FREE_TIER_LIMITS.maxActiveEstimates} active)`}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/materials')}>
            <Ionicons name="construct-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={estimates}
        renderItem={renderEstimateItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={estimates.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

      {/* FAB */}
      {estimates.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowNewModal(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* New Document Modal */}
      <Modal visible={showNewModal} transparent animationType="fade" onRequestClose={() => setShowNewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleCreateNew('estimate')}>
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Estimate</Text>
                <Text style={styles.modalOptionSubtitle}>Quote for potential work</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => handleCreateNew('invoice')}>
              <Ionicons name="receipt-outline" size={24} color="#34C759" />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Invoice</Text>
                <Text style={styles.modalOptionSubtitle}>Bill for completed work</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowNewModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerButton: { padding: 8 },
  listContainer: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  cardHeader: { marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontSize: 18, fontWeight: '600', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  type: { fontSize: 12, color: '#666', marginTop: 4 },
  cardBody: { marginBottom: 12 },
  customerName: { fontSize: 15, color: '#333' },
  noCustomer: { fontSize: 15, color: '#999', fontStyle: 'italic' },
  itemCount: { fontSize: 13, color: '#666', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  dateText: { fontSize: 13, color: '#999' },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  emptyButton: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8f8f8', borderRadius: 12, marginBottom: 12 },
  modalOptionText: { marginLeft: 16 },
  modalOptionTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  modalOptionSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  modalCancelButton: { padding: 16, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: '#666' },
});
