/**
 * Edit Material Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Material, MATERIAL_CATEGORIES, MATERIAL_UNITS } from '../../src/types';
import { getMaterialById, updateMaterial, deleteMaterial } from '../../src/store/storage';

export default function EditMaterialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [material, setMaterial] = useState<Material | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [storeLink, setStoreLink] = useState('');

  useEffect(() => {
    loadMaterial();
  }, [id]);

  const loadMaterial = async () => {
    const data = await getMaterialById(id as string);
    if (!data) {
      Alert.alert('Error', 'Material not found');
      router.back();
      return;
    }
    setMaterial(data);
    setName(data.name);
    setCategory(data.category);
    setUnit(data.unit);
    setPricePerUnit(data.pricePerUnit.toString());
    setNotes(data.notes);
    setStoreLink(data.storeLink || '');
  };

  const handleSave = async () => {
    if (!material) return;
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name');
      return;
    }

    const updated: Material = {
      ...material,
      name: name.trim(),
      category,
      unit,
      pricePerUnit: parseFloat(pricePerUnit) || 0,
      notes: notes.trim(),
      storeLink: storeLink.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    await updateMaterial(updated);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete', 'Delete this material?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMaterial(id as string);
          router.back();
        },
      },
    ]);
  };

  if (!material) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll}>
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Material name" placeholderTextColor="#999" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MATERIAL_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)}>
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Price per Unit *</Text>
              <TextInput style={styles.input} value={pricePerUnit} onChangeText={setPricePerUnit} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#999" />
            </View>
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {MATERIAL_UNITS.map(u => (
                  <TouchableOpacity key={u} style={[styles.chip, unit === u && styles.chipActive]} onPress={() => setUnit(u)}>
                    <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes} placeholder="Additional details..." multiline placeholderTextColor="#999" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Store Link</Text>
            <TextInput style={styles.input} value={storeLink} onChangeText={setStoreLink} placeholder="https://..." autoCapitalize="none" keyboardType="url" placeholderTextColor="#999" />
            {storeLink ? (
              <TouchableOpacity style={styles.linkPreview} onPress={() => Linking.openURL(storeLink)}>
                <Ionicons name="open-outline" size={16} color="#007AFF" />
                <Text style={styles.linkPreviewText}>Open Link</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1, padding: 16 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e8e8e8', marginRight: 8, marginTop: 4 },
  chipActive: { backgroundColor: '#007AFF' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff' },
  linkPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  linkPreviewText: { fontSize: 14, color: '#007AFF' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
