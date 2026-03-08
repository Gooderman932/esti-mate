/**
 * Materials Catalog Screen
 * 
 * Manage materials with name, category, unit, price, notes, and store links
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Simple UUID generator that works in all environments
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import { Material, MATERIAL_CATEGORIES, MATERIAL_UNITS } from '../../src/types';
import { getMaterials, addMaterial, deleteMaterial } from '../../src/store/storage';
import { formatCurrency } from '../../src/utils/calculations';

export default function MaterialsScreen() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState(MATERIAL_CATEGORIES[0]);
  const [unit, setUnit] = useState(MATERIAL_UNITS[0]);
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [storeLink, setStoreLink] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadMaterials();
    }, [])
  );

  const loadMaterials = async () => {
    try {
      const data = await getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMaterials();
    setRefreshing(false);
  };

  const resetForm = () => {
    setName('');
    setCategory(MATERIAL_CATEGORIES[0]);
    setUnit(MATERIAL_UNITS[0]);
    setPricePerUnit('');
    setNotes('');
    setStoreLink('');
  };

  const handleAddMaterial = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a material name');
      return;
    }
    if (!pricePerUnit || parseFloat(pricePerUnit) < 0) {
      Alert.alert('Required', 'Please enter a valid price');
      return;
    }

    const newMaterial: Material = {
      id: uuidv4(),
      name: name.trim(),
      category,
      unit,
      pricePerUnit: parseFloat(pricePerUnit) || 0,
      notes: notes.trim(),
      storeLink: storeLink.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addMaterial(newMaterial);
    await loadMaterials();
    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMaterial(id);
          await loadMaterials();
        },
      },
    ]);
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  // Filter materials
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderMaterialItem = ({ item }: { item: Material }) => (
    <TouchableOpacity
      style={styles.materialCard}
      onPress={() => router.push(`/materials/${item.id}`)}
      onLongPress={() => handleDelete(item.id, item.name)}
    >
      <View style={styles.materialHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.materialName}>{item.name}</Text>
          <Text style={styles.materialCategory}>{item.category}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatCurrency(item.pricePerUnit)}</Text>
          <Text style={styles.unit}>per {item.unit}</Text>
        </View>
      </View>
      {item.notes ? <Text style={styles.materialNotes}>{item.notes}</Text> : null}
      {item.storeLink ? (
        <TouchableOpacity style={styles.linkButton} onPress={() => handleOpenLink(item.storeLink!)}>
          <Ionicons name="open-outline" size={16} color="#007AFF" />
          <Text style={styles.linkText}>View in Store</Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search materials..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
        </TouchableOpacity>
        {MATERIAL_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Materials List */}
      <FlatList
        data={filteredMaterials}
        renderItem={renderMaterialItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="construct-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No materials found' : 'No materials yet'}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

      {/* Add FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Material Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Material</Text>
              <TouchableOpacity onPress={handleAddMaterial}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.field}>
                <Text style={styles.label}>Name *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., 2x4x8 Lumber" placeholderTextColor="#999" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {MATERIAL_CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat} style={[styles.optionChip, category === cat && styles.optionChipActive]} onPress={() => setCategory(cat)}>
                      <Text style={[styles.optionChipText, category === cat && styles.optionChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Price *</Text>
                  <TextInput style={styles.input} value={pricePerUnit} onChangeText={setPricePerUnit} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#999" />
                </View>
                <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {MATERIAL_UNITS.map(u => (
                      <TouchableOpacity key={u} style={[styles.optionChip, unit === u && styles.optionChipActive]} onPress={() => setUnit(u)}>
                        <Text style={[styles.optionChipText, unit === u && styles.optionChipTextActive]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} placeholder="Additional details..." multiline placeholderTextColor="#999" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Store Link (optional)</Text>
                <TextInput style={styles.input} value={storeLink} onChangeText={setStoreLink} placeholder="https://www.homedepot.com/..." autoCapitalize="none" keyboardType="url" placeholderTextColor="#999" />
                <Text style={styles.hint}>Paste a link to Lowe's, Home Depot, etc.</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  categoryFilter: { paddingHorizontal: 16, maxHeight: 44, marginBottom: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  categoryChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  categoryChipText: { fontSize: 13, color: '#666' },
  categoryChipTextActive: { color: '#fff' },
  listContainer: { padding: 16, paddingTop: 8, paddingBottom: 100 },
  materialCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  materialHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  materialName: { fontSize: 16, fontWeight: '600', color: '#333' },
  materialCategory: { fontSize: 13, color: '#666', marginTop: 2 },
  priceContainer: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  unit: { fontSize: 12, color: '#999' },
  materialNotes: { fontSize: 13, color: '#888', marginTop: 8, fontStyle: 'italic' },
  linkButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  linkText: { fontSize: 14, color: '#007AFF' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  modalCancel: { fontSize: 16, color: '#666' },
  modalSave: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  modalScroll: { flex: 1, padding: 16 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  hint: { fontSize: 12, color: '#999', marginTop: 4 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0', marginRight: 8, marginTop: 4 },
  optionChipActive: { backgroundColor: '#007AFF' },
  optionChipText: { fontSize: 13, color: '#666' },
  optionChipTextActive: { color: '#fff' },
});
