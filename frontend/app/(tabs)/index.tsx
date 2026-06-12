import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Estimate } from '../../src/types';
import {
  getEstimates, deleteEstimate, getNextNumber, addEstimate,
  getSettings, getDocumentsCreatedThisMonth,
} from '../../src/store/storage';
import { calculateSubtotal, calculateTax, calculateGrandTotal, formatCurrency } from '../../src/utils/calculations';
import { useSubscription } from '../../src/SubscriptionContext';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function EstimatesTab() {
  const router = useRouter();
  const { tier, isPro, isEnterprise, canCreateEstimate } = useSubscription();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [monthCount, setMonthCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const [all, count] = await Promise.all([getEstimates(), getDocumentsCreatedThisMonth()]);
      setEstimates(all.filter(e => e.type === 'estimate'));
      setMonthCount(count);
    } catch {}
    setIsLoading(false);
  };

  const handleCreate = async () => {
    const allowed = await canCreateEstimate();
    if (!allowed) { setShowNewModal(false); router.push('/paywall'); return; }
    try {
      const [settings, number] = await Promise.all([getSettings(), getNextNumber('estimate')]);
      const item: Estimate = {
        id: generateId(), type: 'estimate', number,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        customer: { name: '', email: '', phone: '', address: '' },
        lineItems: [], notes: '', status: 'draft', taxRate: settings.defaultTaxRate,
      };
      await addEstimate(item);
      setShowNewModal(false);
      router.push(`/estimate/${item.id}`);
    } catch { Alert.alert('Error', 'Failed to create estimate'); }
  };

  const handleDelete = (id: string, number: string) => {
    Alert.alert('Delete', `Delete ${number}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteEstimate(id); loadData(); } },
    ]);
  };

  const statusColor = (s: string) =>
    s === 'paid' ? '#34C759' : s === 'sent' ? '#007AFF' : s === 'accepted' ? '#5856D6' : '#8E8E93';

  const renderItem = ({ item }: { item: Estimate }) => {
    const sub = calculateSubtotal(item.lineItems);
    const total = calculateGrandTotal(sub, calculateTax(sub, item.taxRate));
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/estimate/${item.id}`)} onLongPress={() => handleDelete(item.id, item.number)}>
        <View style={styles.cardHeader}>
          <Text style={styles.number}>{item.number}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.customer}>{item.customer.name || 'No customer'}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></SafeAreaView>;

  const limitText = isEnterprise ? '✓ Enterprise' : isPro ? `✓ Pro (${monthCount}/15 this month)` : `Free (${monthCount}/3 this month)`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.subheader}>
        <Text style={styles.subheaderText}>{limitText}</Text>
        <TouchableOpacity onPress={() => router.push('/materials')} style={styles.materialsBtn}>
          <Ionicons name="construct-outline" size={20} color="#007AFF" />
          <Text style={styles.materialsBtnText}>Materials</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={estimates}
        renderItem={renderItem}
        keyExtractor={i => i.id}
        contentContainerStyle={estimates.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Estimates Yet</Text>
            <Text style={styles.emptySub}>Tap + to create your first estimate</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowNewModal(true)}>
              <Text style={styles.emptyBtnText}>Create Estimate</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => setShowNewModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <Modal visible={showNewModal} transparent animationType="fade" onRequestClose={() => setShowNewModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Estimate</Text>
            <Text style={styles.modalSub}>Create a quote for potential work</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={handleCreate}>
              <Text style={styles.modalBtnText}>Create Estimate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subheader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  subheaderText: { fontSize: 13, color: '#666' },
  materialsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  materialsBtnText: { fontSize: 13, color: '#007AFF' },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  number: { fontSize: 16, fontWeight: '600', color: '#333' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  customer: { fontSize: 14, color: '#555', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 12, color: '#999' },
  total: { fontSize: 15, fontWeight: '700', color: '#333' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  emptyBtn: { marginTop: 24, backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  modalSub: { fontSize: 14, color: '#666', marginTop: 8, marginBottom: 24, textAlign: 'center' },
  modalBtn: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, marginTop: 8 },
  cancelText: { color: '#007AFF', fontSize: 15 },
});
