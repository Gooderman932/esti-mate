/**
 * Paywall Screen
 * 
 * Shows Pro tier benefits and handles Stripe subscription checkout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSubscription } from '../src/SubscriptionContext';
import { FREE_TIER_LIMITS } from '../src/types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function PaywallScreen() {
  const router = useRouter();
  const { userId, isPro, checkSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!userId) {
      Alert.alert('Error', 'Unable to identify user. Please restart the app.');
      return;
    }

    try {
      setLoading(true);

      // Create subscription checkout
      const response = await fetch(`${API_URL}/api/subscriptions/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await response.json();

      if (data.checkout_url) {
        // Open Stripe Checkout in browser
        const supported = await Linking.canOpenURL(data.checkout_url);
        if (supported) {
          await Linking.openURL(data.checkout_url);
          // After returning from checkout, refresh subscription status
          setTimeout(() => {
            checkSubscription();
          }, 2000);
        } else {
          Alert.alert('Error', 'Cannot open checkout URL');
        }
      } else if (data.detail) {
        Alert.alert('Error', data.detail);
      } else {
        throw new Error('Failed to create checkout');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'Failed to start subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };
      setLoading(false);
    }
  };

  const handleRestorePurchase = async () => {
    try {
      setLoading(true);
      await checkSubscription();
      if (isPro) {
        Alert.alert('Restored', 'Your Pro subscription has been restored!');
        router.back();
      } else {
        Alert.alert('No Subscription', 'No active subscription found for this device.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchase.');
    } finally {
      setLoading(false);
    }
  };

  if (isPro) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.alreadyPro}>
          <Ionicons name="checkmark-circle" size={64} color="#34C759" />
          <Text style={styles.alreadyProTitle}>You're a Pro!</Text>
          <Text style={styles.alreadyProSubtitle}>You have access to all Pro features</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.heroTitle}>Unlock Pro Features</Text>
          <Text style={styles.heroSubtitle}>Take your estimating to the next level</Text>
        </View>

        {/* Price */}
        <View style={styles.priceCard}>
          <Text style={styles.price}>$9.99</Text>
          <Text style={styles.pricePeriod}>per month</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What you get:</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Unlimited Estimates</Text>
              <Text style={styles.featureDesc}>Free tier limited to {FREE_TIER_LIMITS.maxActiveEstimates} active documents</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Custom Company Logo</Text>
              <Text style={styles.featureDesc}>Add your logo to all invoices and estimates</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Professional Branding</Text>
              <Text style={styles.featureDesc}>Your business info on all exports</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Priority Support</Text>
              <Text style={styles.featureDesc}>Get help when you need it</Text>
            </View>
          </View>
        </View>

        {/* Free tier comparison */}
        <View style={styles.comparison}>
          <Text style={styles.comparisonTitle}>Free Tier Includes:</Text>
          <Text style={styles.comparisonItem}>• Up to {FREE_TIER_LIMITS.maxActiveEstimates} active estimates/invoices</Text>
          <Text style={styles.comparisonItem}>• Full materials catalog</Text>
          <Text style={styles.comparisonItem}>• PDF and text export</Text>
          <Text style={styles.comparisonItem}>• Tax calculations</Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.subscribeButton, loading && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>Upgrade to Pro</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchase} disabled={loading}>
          <Text style={styles.restoreButtonText}>Restore Purchase</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>Cancel anytime. Subscription auto-renews monthly.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  hero: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff' },
  proBadge: { backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  proBadgeText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: '#666' },
  priceCard: { alignItems: 'center', paddingVertical: 24, marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  price: { fontSize: 48, fontWeight: 'bold', color: '#007AFF' },
  pricePeriod: { fontSize: 16, color: '#666', marginTop: 4 },
  features: { padding: 16, marginTop: 16 },
  featuresTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  featureText: { marginLeft: 12, flex: 1 },
  featureName: { fontSize: 16, fontWeight: '600', color: '#333' },
  featureDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  comparison: { marginHorizontal: 16, padding: 16, backgroundColor: '#f0f0f0', borderRadius: 12 },
  comparisonTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  comparisonItem: { fontSize: 13, color: '#888', marginTop: 4 },
  cta: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  subscribeButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  subscribeButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  restoreButton: { paddingVertical: 12, alignItems: 'center' },
  restoreButtonText: { color: '#007AFF', fontSize: 15 },
  terms: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },
  alreadyPro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  alreadyProTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 16 },
  alreadyProSubtitle: { fontSize: 15, color: '#666', marginTop: 8, textAlign: 'center' },
  backButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: '#007AFF', borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
