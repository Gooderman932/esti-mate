/**
 * Settings Screen
 * 
 * Business info, tax rate, and subscription management
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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription } from '../src/SubscriptionContext';
import { AppSettings } from '../src/types';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function SettingsScreen() {
  const router = useRouter();
  const { isPro, isEnterprise, canUploadLogo, settings, updateSettings, checkSubscription, subscriptionStatus, userId } = useSubscription();

  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [defaultTaxRate, setDefaultTaxRate] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | undefined>(undefined);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business.name);
      setBusinessEmail(settings.business.email);
      setBusinessPhone(settings.business.phone);
      setBusinessAddress(settings.business.address);
      setDefaultTaxRate(settings.defaultTaxRate.toString());
      setLogoBase64(settings.business.logoBase64);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings) return;

    const newSettings: AppSettings = {
      ...settings,
      business: {
        name: businessName.trim(),
        email: businessEmail.trim(),
        phone: businessPhone.trim(),
        address: businessAddress.trim(),
        logoBase64: canUploadLogo ? logoBase64 : undefined, // Logo is an Enterprise feature
      },
      defaultTaxRate: parseFloat(defaultTaxRate) || 0,
    };

    await updateSettings(newSettings);
    setHasChanges(false);
    Alert.alert('Saved', 'Settings saved successfully');
  };

  const handlePickLogo = async () => {
    if (!canUploadLogo) {
      Alert.alert(
        'Enterprise Feature',
        'Upload a custom logo with an Enterprise subscription',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setHasChanges(true);
    }
  };

  const handleRemoveLogo = () => {
    setLogoBase64(undefined);
    setHasChanges(true);
  };

  const handleCancelSubscription = async () => {
    // Google Play subscriptions are managed in the Play Store, not by our backend
    if (subscriptionStatus?.billingSource === 'google_play') {
      Linking.openURL(
        'https://play.google.com/store/account/subscriptions?package=com.poordudeholdings.estimatemobile'
      ).catch(() => Alert.alert('Error', 'Could not open Google Play subscriptions.'));
      return;
    }

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/subscriptions/cancel/${userId}`, {
                method: 'POST',
              });
              if (response.ok) {
                await checkSubscription();
                Alert.alert('Canceled', 'Your subscription has been canceled and will not renew.');
              } else {
                Alert.alert('Error', 'Failed to cancel subscription.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll}>
          {/* Subscription Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.subscriptionCard}>
              {isPro ? (
                <>
                  <View style={styles.proStatus}>
                    <Ionicons name="checkmark-circle" size={24} color={isEnterprise ? '#007AFF' : '#34C759'} />
                    <Text style={[styles.proStatusText, isEnterprise && { color: '#007AFF' }]}>
                      {isEnterprise ? 'Enterprise Active' : 'Pro Active'}
                    </Text>
                  </View>
                  {subscriptionStatus?.currentPeriodEnd && (
                    <Text style={styles.renewalText}>
                      {subscriptionStatus.cancelAtPeriodEnd
                        ? `Cancels: ${new Date(subscriptionStatus.currentPeriodEnd * 1000).toLocaleDateString()}`
                        : `Renews: ${new Date(subscriptionStatus.currentPeriodEnd * 1000).toLocaleDateString()}`}
                    </Text>
                  )}
                  {!subscriptionStatus?.cancelAtPeriodEnd && (
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSubscription}>
                      <Text style={styles.cancelButtonText}>
                        {subscriptionStatus?.billingSource === 'google_play'
                          ? 'Manage in Google Play'
                          : 'Cancel Subscription'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.freeText}>Free Tier</Text>
                  <TouchableOpacity style={styles.upgradeButton} onPress={() => router.push('/paywall')}>
                    <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Business Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            
            {/* Logo */}
            <View style={styles.logoSection}>
              <Text style={styles.label}>Company Logo {!canUploadLogo && <Text style={styles.proTag}>(Enterprise)</Text>}</Text>
              {logoBase64 ? (
                <View style={styles.logoPreview}>
                  <Image source={{ uri: logoBase64 }} style={styles.logoImage} resizeMode="contain" />
                  <TouchableOpacity style={styles.logoRemove} onPress={handleRemoveLogo}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.logoPlaceholder} onPress={handlePickLogo}>
                  <Ionicons name="image-outline" size={32} color={canUploadLogo ? '#007AFF' : '#ccc'} />
                  <Text style={[styles.logoPlaceholderText, !canUploadLogo && { color: '#ccc' }]}>
                    {canUploadLogo ? 'Tap to add logo' : 'Upgrade to Enterprise to add logo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Business Name</Text>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={(t) => { setBusinessName(t); setHasChanges(true); }}
                placeholder="Your Business Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={businessEmail}
                onChangeText={(t) => { setBusinessEmail(t); setHasChanges(true); }}
                placeholder="email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={businessPhone}
                onChangeText={(t) => { setBusinessPhone(t); setHasChanges(true); }}
                placeholder="(555) 123-4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={businessAddress}
                onChangeText={(t) => { setBusinessAddress(t); setHasChanges(true); }}
                placeholder="123 Main St, City, State ZIP"
                placeholderTextColor="#999"
                multiline
              />
            </View>
          </View>

          {/* Tax Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax Settings</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Default Tax Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={defaultTaxRate}
                onChangeText={(t) => { setDefaultTaxRate(t); setHasChanges(true); }}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.hint}>Applied to new estimates. Can be changed per document.</Text>
            </View>
          </View>

          {/* Device ID */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device</Text>
            <Text style={styles.deviceId}>ID: {userId?.slice(0, 8)}...</Text>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!hasChanges}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  section: { backgroundColor: '#fff', marginTop: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', textTransform: 'uppercase', marginBottom: 12 },
  subscriptionCard: { backgroundColor: '#f8f8f8', padding: 16, borderRadius: 12 },
  proStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proStatusText: { fontSize: 18, fontWeight: '600', color: '#34C759' },
  renewalText: { fontSize: 13, color: '#666', marginTop: 8 },
  cancelButton: { marginTop: 12 },
  cancelButtonText: { color: '#FF3B30', fontSize: 14 },
  freeText: { fontSize: 18, fontWeight: '600', color: '#666' },
  upgradeButton: { backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  upgradeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  logoSection: { marginBottom: 16 },
  logoPreview: { position: 'relative', backgroundColor: '#f8f8f8', borderRadius: 8, padding: 16, alignItems: 'center' },
  logoImage: { width: '100%', height: 60 },
  logoRemove: { position: 'absolute', top: 8, right: 8 },
  logoPlaceholder: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed' },
  logoPlaceholderText: { fontSize: 14, color: '#007AFF', marginTop: 8 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  proTag: { color: '#FFD700', fontWeight: 'bold' },
  input: { backgroundColor: '#f8f8f8', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16, color: '#333' },
  hint: { fontSize: 12, color: '#999', marginTop: 4 },
  deviceId: { fontSize: 12, color: '#999', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
