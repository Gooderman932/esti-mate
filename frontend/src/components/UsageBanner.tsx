import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '../SubscriptionContext';

export function UsageBanner() {
  const router = useRouter();
  const { tier, remainingEstimates, remainingInvoices, resetDate } = useSubscription();

  if (tier === 'enterprise') return null;

  const isLow = (n: number | null) => n !== null && n <= 1;
  const isOut = (n: number | null) => n !== null && n === 0;

  const estColor = isOut(remainingEstimates) ? '#ef4444' : isLow(remainingEstimates) ? '#f97316' : '#22c55e';
  const invColor = isOut(remainingInvoices) ? '#ef4444' : isLow(remainingInvoices) ? '#f97316' : '#22c55e';

  const monthlyMax = tier === 'pro' ? '15' : '3';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.label}>Estimates left</Text>
          <Text style={[styles.value, { color: estColor }]}>
            {remainingEstimates ?? '∞'}
            <Text style={styles.limit}>/{monthlyMax}</Text>
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.label}>Invoices left</Text>
          <Text style={[styles.value, { color: invColor }]}>
            {remainingInvoices ?? '∞'}
            <Text style={styles.limit}>/{monthlyMax}</Text>
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.label}>Resets</Text>
          <Text style={[styles.value, { color: '#94a3b8', fontSize: 12 }]}>{resetDate}</Text>
        </View>
      </View>

      {tier === 'free' && (
        <TouchableOpacity style={styles.upgradeBar} onPress={() => router.push('/paywall')}>
          <Text style={styles.upgradeText}>⚡ Upgrade to Pro — 15/month · $29.99</Text>
        </TouchableOpacity>
      )}

      {tier === 'pro' && (isOut(remainingEstimates) || isOut(remainingInvoices)) && (
        <TouchableOpacity
          style={[styles.upgradeBar, styles.upgradeBarPurple]}
          onPress={() => router.push('/paywall')}
        >
          <Text style={[styles.upgradeText, { color: '#a78bfa' }]}>
            ⚡ Upgrade to Enterprise for unlimited access
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    padding: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  label: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: { color: '#fff', fontSize: 20, fontWeight: '700' },
  limit: { color: '#475569', fontSize: 13, fontWeight: '400' },
  divider: { width: 1, backgroundColor: '#334155', marginHorizontal: 8 },
  upgradeBar: {
    backgroundColor: 'rgba(249,115,22,0.12)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeBarPurple: { backgroundColor: 'rgba(124,58,237,0.12)' },
  upgradeText: { color: '#f97316', fontSize: 13, fontWeight: '600' },
});
