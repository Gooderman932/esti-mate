import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../src/SubscriptionContext';
import { PRODUCT_IDS, TIER_PRICES } from '../src/lib/subscriptionConfig';

const PRO_FEATURES = [
  '15 estimates per month',
  '15 invoices per month',
  'Up to 50 unique customers',
  'Camera measurement tool',
  'PDF export & sharing',
  'Priority email support',
];

const ENTERPRISE_FEATURES = [
  'Unlimited estimates & invoices',
  'Unlimited customers',
  'Custom invoice branding + logo',
  'Team accounts (up to 10 users)',
  'Advanced reporting',
  'Dedicated phone & email support',
];

export default function PaywallScreen() {
  const router = useRouter();
  const { tier, purchase, restore } = useSubscription();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async (sku: string) => {
    setPurchasing(sku);
    const ok = await purchase(sku);
    setPurchasing(null);
    if (ok) {
      Alert.alert('Success!', 'Your subscription is now active.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const ok = await restore();
    setRestoring(false);
    if (ok) {
      Alert.alert('Restored', 'Your purchases have been restored.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Nothing Found', 'No previous purchases found for this account.');
    }
  };

  if (tier === 'enterprise') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.alreadyActive}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          <Text style={styles.alreadyTitle}>You're on Enterprise!</Text>
          <Text style={styles.alreadySub}>You have unlimited access to all features.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>UPGRADE</Text>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>Built for contractors who mean business</Text>
        </View>

        {/* Current plan note */}
        {tier === 'free' && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>
              Free plan: 3 estimates + 3 invoices/month · 5 customers
            </Text>
          </View>
        )}

        {/* Pro Card */}
        <View style={styles.card}>
          <Text style={styles.planName}>Esti-Mate Pro</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{TIER_PRICES.pro}</Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.planDesc}>Perfect for independent contractors</Text>

          <View style={styles.featureList}>
            {PRO_FEATURES.map(f => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {tier === 'pro' ? (
            <View style={styles.currentPlanBtn}>
              <Text style={styles.currentPlanText}>✓ Current Plan</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() => handlePurchase(PRODUCT_IDS.PRO)}
              disabled={!!purchasing}
            >
              {purchasing === PRODUCT_IDS.PRO ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buyBtnText}>Get Pro — {TIER_PRICES.pro}/mo</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Enterprise Card */}
        <View style={[styles.card, styles.cardEnterprise]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>BEST VALUE</Text>
          </View>
          <Text style={styles.planName}>Esti-Mate Enterprise</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: '#f97316' }]}>{TIER_PRICES.enterprise}</Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.planDesc}>For growing construction companies</Text>

          <View style={styles.featureList}>
            {ENTERPRISE_FEATURES.map(f => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#f97316" />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.buyBtn, styles.buyBtnEnterprise]}
            onPress={() => handlePurchase(PRODUCT_IDS.ENTERPRISE)}
            disabled={!!purchasing}
          >
            {purchasing === PRODUCT_IDS.ENTERPRISE ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buyBtnText}>
                Get Enterprise — {TIER_PRICES.enterprise}/mo
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Included in all plans */}
        <View style={styles.comparison}>
          <Text style={styles.comparisonTitle}>All plans include:</Text>
          {[
            'Materials catalog',
            'Tax calculations',
            'PDF export',
            'Local data storage — works offline',
          ].map(f => (
            <Text key={f} style={styles.comparisonItem}>• {f}</Text>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text style={styles.restoreBtnText}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.legal}>
          Subscriptions auto-renew unless cancelled at least 24 hours before renewal.
          Manage in Google Play.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  header: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  badge: { color: '#f97316', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },

  freeBadge: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1e293b', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#334155', alignItems: 'center',
  },
  freeBadgeText: { color: '#64748b', fontSize: 13 },

  card: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 22,
    marginHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  cardEnterprise: { borderColor: '#f97316', borderWidth: 2 },

  popularBadge: {
    backgroundColor: '#f97316', alignSelf: 'flex-start',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  planName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  price: { color: '#60a5fa', fontSize: 32, fontWeight: '800' },
  period: { color: '#64748b', fontSize: 15, marginLeft: 4 },
  planDesc: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },

  featureList: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { color: '#cbd5e1', fontSize: 14, marginLeft: 10, flex: 1 },

  buyBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  buyBtnEnterprise: { backgroundColor: '#f97316' },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  currentPlanBtn: {
    backgroundColor: '#166534', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  currentPlanText: { color: '#4ade80', fontSize: 15, fontWeight: '700' },

  comparison: {
    marginHorizontal: 16, padding: 16,
    backgroundColor: '#1e293b', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  comparisonTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  comparisonItem: { color: '#64748b', fontSize: 13, marginTop: 4 },

  footer: { padding: 16, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b' },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreBtnText: { color: '#64748b', fontSize: 14 },
  legal: { color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 },

  alreadyActive: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  alreadyTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 16 },
  alreadySub: { color: '#94a3b8', fontSize: 15, marginTop: 8, textAlign: 'center' },
  backBtn: {
    marginTop: 24, paddingVertical: 12, paddingHorizontal: 32,
    backgroundColor: '#f97316', borderRadius: 10,
  },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
