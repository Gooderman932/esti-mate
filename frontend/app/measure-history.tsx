/**
 * Measurement History Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMeasureContext, Measurement } from '../src/contexts/MeasureContext';
import { formatDistance } from '../src/utils/pinholeCamera';

export default function MeasureHistoryScreen() {
  const router = useRouter();
  const { measurements, deleteMeasurement, clearMeasurements, unitSystem } = useMeasureContext();
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('date');

  const sortedMeasurements = [...measurements].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    return b.distance - a.distance;
  });

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this measurement?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMeasurement(id) },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All', 'Delete all measurements?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearMeasurements },
    ]);
  };

  const handleExport = async () => {
    if (measurements.length === 0) {
      Alert.alert('No Data', 'No measurements to export.');
      return;
    }

    const csv = [
      'ID,Distance,Unit,Profile,Note,Timestamp',
      ...measurements.map(m =>
        `${m.id},${m.distance.toFixed(3)},${m.unit},"${m.profileName}","${m.note}",${m.timestamp}`
      ),
    ].join('\n');

    try {
      await Share.share({
        message: csv,
        title: 'Measurement History Export',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to export data.');
    }
  };

  const renderItem = ({ item }: { item: Measurement }) => (
    <TouchableOpacity
      style={styles.measurementCard}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.measurementMain}>
        <Text style={styles.measurementDistance}>
          {formatDistance(item.distance, item.unit)}
        </Text>
        <Text style={styles.measurementConfidence}>
          {(item.confidence * 100).toFixed(0)}% confidence
        </Text>
      </View>
      <View style={styles.measurementMeta}>
        <Text style={styles.measurementProfile}>{item.profileName}</Text>
        {item.note ? <Text style={styles.measurementNote}>{item.note}</Text> : null}
        <Text style={styles.measurementTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortText, sortBy === 'date' && styles.sortTextActive]}>By Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'distance' && styles.sortButtonActive]}
            onPress={() => setSortBy('distance')}
          >
            <Text style={[styles.sortText, sortBy === 'distance' && styles.sortTextActive]}>By Distance</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
            <Ionicons name="share-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={sortedMeasurements}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>No measurements yet</Text>
            <Text style={styles.emptySubtext}>Take measurements from the Auto Measure screen</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  sortButtons: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 8, padding: 2 },
  sortButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  sortButtonActive: { backgroundColor: '#333' },
  sortText: { color: '#888', fontSize: 13 },
  sortTextActive: { color: '#fff' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8, backgroundColor: '#1a1a1a', borderRadius: 8 },
  listContent: { padding: 16, paddingBottom: 40 },
  measurementCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 },
  measurementMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  measurementDistance: { color: '#007AFF', fontSize: 24, fontWeight: 'bold' },
  measurementConfidence: { color: '#666', fontSize: 12 },
  measurementMeta: {},
  measurementProfile: { color: '#888', fontSize: 13 },
  measurementNote: { color: '#aaa', fontSize: 14, marginTop: 4 },
  measurementTime: { color: '#555', fontSize: 12, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 16 },
  emptySubtext: { color: '#666', fontSize: 13, marginTop: 4 },
});
