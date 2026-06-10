/**
 * Paywall Screen
 *
 * Pro and Enterprise plan selection. Android uses native Google Play
 * billing; other platforms fall back to Stripe browser checkout.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSubscription } from '../src/SubscriptionContext';
import { TIER_LIMITS, TIER_PRICES } from '../src/types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SUPPORT_EMAIL = 'admin@poordudeholdings.com';

type Plan = 'pro' | 'enterprise';

const PLAN_FEATURES: Record<Plan, { title: string; features: { name: string; desc: string }[] }> = {
  pro: {
    title: 'Pro',
    features: [
      { name: `${TIER_LIMITS.pro.maxDocumentsPerMonth} Documents per Month`, desc: `Free tier limited to ${TIER_LIMITS.free.maxDocumentsPerMonth} estimates/invoices per month` },
      { name: 'Full Materials Catalog', desc: 'Unlimited materials with pricing' },
      { name: 'PDF Export & Sharing', desc: 'Professional documents for your customers' },
      { name: 'Priority Support', desc: 'Get help when you need it' },
    ],
  },
  enterprise: {
    title: 'Enterprise',
    features: [
      { name: 'Unlimited Documents', desc: 'No monthly limits on estimates or invoices' },
      { name: 'Custom Company Branding', desc: 'Add your logo to all invoices and estimates' },
      { name: 'Full Materials Catalog', desc: 'Unlimited materials with pricing' },
      { name: 'Priority Support', desc: 'Get help when you need it' },
    ],
  },
};

export default function PaywallScreen() {
  const router = useRouter();
  const {
    userId,
    tier,
    isPro,
    isPurchasing,
    checkSubscription,
    purchaseSubscription,
    restorePurchases,
    getStorePrices,
  } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('pro');
  const [storePrices, setStorePrices] = useState<Partial<Record<Plan, string>>>({});

  useEffect(() => {
    getStorePrices().then(setStorePrices).catch(() => {});
  }, []);

  const priceFor = (plan: Plan) => storePrices[plan] || TIER_PRICES[plan];

  const handleSubscribe = async () => {
    if (!userId) {
      Alert.alert('Error', 'Unable to identify user. Please restart the app.');
      return;
    }

    if (Platform.OS === 'android') {
      try {
        await purchaseSubscription(selectedPlan);
        // Completion is handled by the purchase listener; status updates automatically
      } catch (error: any) {
        if (error?.code !== 'user-cancelled' && error?.code !== 'E_USER_CANCELLED') {
          Alert.alert('Purchase Failed', error?.message || 'Could not start the purchase. Please try again.');
        }
      }
      return;
    }

    // Non-Android: Stripe browser checkout
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/subscriptions/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, plan: selectedPlan }),
      });
      const data = await response.json();

      if (data.checkout_url) {
        const supported = await Linking.canOpenURL(data.checkout_url);
        if (supported) {
          await Linking.openURL(data.checkout_url);
          setTimeout(() => {
            checkSubscription();
          }, 2000);
        } else {
          Alert.alert('Error', 'Cannot open checkout URL');
        }
      } else if (data.detail || data.message) {
        Alert.alert('Error', data.detail || data.message);
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

  const handleRestorePurchase = async () => {
    try {
      setLoading(true);
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('Restored', 'Your subscription has been restored!');
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

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  };

  if (isPro) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.alreadyPro}>
          <Ionicons name="checkmark-circle" size={64} color="#34C759" />
          <Text style={styles.alreadyProTitle}>
            {tier === 'enterprise' ? "You're on Enterprise!" : "You're a Pro!"}
          </Text>
          <Text style={styles.alreadyProSubtitle}>
            {tier === 'enterprise'
              ? 'Unlimited documents and custom branding are unlocked'
              : `You can create up to ${TIER_LIMITS.pro.maxDocumentsPerMonth} documents per month`}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const busy = loading || isPurchasing;
  const planInfo = PLAN_FEATURES[selectedPlan];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>{planInfo.title.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>Choose Your Plan</Text>
          <Text style={styles.heroSubtitle}>Take your estimating to the next level</Text>
        </View>

        {/* Plan selector */}
        <View style={styles.planRow}>
          {(['pro', 'enterprise'] as Plan[]).map((plan) => (
            <TouchableOpacity
              key={plan}
              style={[styles.planCard, selectedPlan === plan && styles.planCardSelected]}
              onPress={() => setSelectedPlan(plan)}
            >
              <Text style={[styles.planName, selectedPlan === plan && styles.planNameSelected]}>
                {PLAN_FEATURES[plan].title}
              </Text>
              <Text style={[styles.planPrice, selectedPlan === plan && styles.planPriceSelected]}>
                {priceFor(plan)}
              </Text>
              <Text style={styles.planPeriod}>per month</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What you get with {planInfo.title}:</Text>
          {planInfo.features.map((feature) => (
            <View key={feature.name} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              <View style={styles.featureText}>
                <Text style={styles.featureName}>{feature.name}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Free tier comparison */}
        <View style={styles.comparison}>
          <Text style={styles.comparisonTitle}>Free Tier Includes:</Text>
          <Text style={styles.comparisonItem}>• Up to {TIER_LIMITS.free.maxDocumentsPerMonth} estimates/invoices per month</Text>
          <Text style={styles.comparisonItem}>• Full materials catalog</Text>
          <Text style={styles.comparisonItem}>• PDF and text export</Text>
          <Text style={styles.comparisonItem}>• Tax calculations</Text>
        </View>

        <TouchableOpacity style={styles.supportLink} onPress={handleContactSupport}>
          <Text style={styles.supportLinkText}>Questions? Contact {SUPPORT_EMAIL}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.subscribeButton, busy && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              Subscribe to {planInfo.title} — {priceFor(selectedPlan)}/mo
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchase} disabled={busy}>
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
  planRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 12 },
  planCard: { flex: 1, alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  planCardSelected: { borderColor: '#007AFF' },
  planName: { fontSize: 16, fontWeight: '600', color: '#666' },
  planNameSelected: { color: '#007AFF' },
  planPrice: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 8 },
  planPriceSelected: { color: '#007AFF' },
  planPeriod: { fontSize: 13, color: '#666', marginTop: 2 },
  features: { padding: 16, marginTop: 16 },
  featuresTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  featureText: { marginLeft: 12, flex: 1 },
  featureName: { fontSize: 16, fontWeight: '600', color: '#333' },
  featureDesc: { fontSize: 13, color: '#666', marginTop: 2 },
  comparison: { marginHorizontal: 16, padding: 16, backgroundColor: '#f0f0f0', borderRadius: 12 },
  comparisonTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  comparisonItem: { fontSize: 13, color: '#888', marginTop: 4 },
  supportLink: { alignItems: 'center', marginTop: 16 },
  supportLinkText: { fontSize: 13, color: '#007AFF' },
  cta: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  subscribeButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  subscribeButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  restoreButton: { paddingVertical: 12, alignItems: 'center' },
  restoreButtonText: { color: '#007AFF', fontSize: 15 },
  terms: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },
  alreadyPro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  alreadyProTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 16 },
  alreadyProSubtitle: { fontSize: 15, color: '#666', marginTop: 8, textAlign: 'center' },
  backButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: '#007AFF', borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
