import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCustomerById, addCustomer, updateCustomer } from '../../src/store/storage';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!isNew);

  useEffect(() => {
    if (!isNew) loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    const c = await getCustomerById(id as string);
    if (c) {
      setName(c.name);
      setEmail(c.email);
      setPhone(c.phone);
      setAddress(c.address);
      setNotes(c.notes);
    }
    setIsLoadingData(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Customer name is required'); return; }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      if (isNew) {
        await addCustomer({ id: generateId(), name: name.trim(), email, phone, address, notes, createdAt: now, updatedAt: now });
      } else {
        const c = await getCustomerById(id as string);
        if (c) await updateCustomer({ ...c, name: name.trim(), email, phone, address, notes });
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Customer name" autoCapitalize="words" returnKeyType="next" />
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" returnKeyType="next" />
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Address</Text>
            <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} placeholder="Street address" multiline numberOfLines={3} />
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} placeholder="Additional notes" multiline numberOfLines={3} />
          </View>
          <TouchableOpacity style={[styles.saveBtn, isSaving && styles.disabled]} onPress={handleSave} disabled={isSaving}>
            <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Customer'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#e5e5e5' },
  multiline: { height: 90, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
