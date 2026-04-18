import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionTier } from '../lib/subscriptionConfig';

type GateType = 'estimate' | 'invoice' | 'camera' | 'branding';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: GateType;
  tier: SubscriptionTier;
  resetDate?: string;
}

interface GateCopy {
  title: string;
  message: string;
  upgrade: string;
}

const COPY: Record<GateType, Record<'free' | 'pro', GateCopy>> = {
  estimate: {
    free: {
      title: 'Monthly Limit Reached',
      message: "You've used all 3 free estimates this month.",
      upgrade: 'Upgrade to Pro for 15/month, or Enterprise for unlimited.',
    },
    pro: {
      title: 'Monthly Limit Reached',
      message: "You've used all 15 Pro estimates this month.",
      upgrade: 'Upgrade to Enterprise for unlimited estimates.',
    },
  },
  invoice: {
    free: {
      title: 'Monthly Limit Reached',
      message: "You've used all 3 free invoices this month.",
      upgrade: 'Upgrade to Pro for 15/month, or Enterprise for unlimited.',
    },
    pro: {
      title: 'Monthly Limit Reached',
      message: "You've used all 15 Pro invoices this month.",
      upgrade: 'Upgrade to Enterprise for unlimited invoices.',
    },
  },
  camera: {
    free: {
      title: 'Pro Feature',
      message: 'Camera-based measurement requires a Pro subscription.',
      upgrade: 'Upgrade to measure walls and surfaces with your camera.',
    },
    pro: {
      title: 'Pro Feature',
      message: 'Camera-based measurement requires a Pro subscription.',
      upgrade: '',
    },
  },
  branding: {
    free: {
      title: 'Enterprise Feature',
      message: 'Custom invoice branding requires Enterprise.',
      upgrade: 'Add your logo and company colors to every document.',
    },
    pro: {
      title: 'Enterprise Feature',
      message: 'Custom invoice branding requires Enterprise.',
      upgrade: 'Add your logo and company colors to every document.',
    },
  },
};

export function UpgradeGate({ visible, onClose, type, tier, resetDate }: Props) {
  const router = useRouter();
  const copyTier: 'free' | 'pro' = tier === 'enterprise' ? 'pro' : tier;
  const copy = COPY[type][copyTier];
  const needsEnterprise = type === 'branding' || (tier === 'pro' && (type === 'estimate' || type === 'invoice'));
  const showReset = resetDate && (type === 'estimate' || type === 'invoice');

  const handleUpgrade = () => {
    onClose();
    router.push('/paywall');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.icon}>
            {type === 'camera' || type === 'branding' ? '🔒' : '📊'}
          </Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.message}>{copy.message}</Text>

          {showReset && (
            <View style={styles.resetBadge}>
              <Text style={styles.resetText}>🔄 Resets {resetDate}</Text>
            </View>
          )}

          {copy.upgrade ? <Text style={styles.sub}>{copy.upgrade}</Text> : null}

          <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
            <Text style={styles.upgradeBtnText}>
              {needsEnterprise
                ? 'Upgrade to Enterprise — $99.99/mo'
                : 'View Plans — from $29.99/mo'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#cbd5e1',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  resetBadge: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  resetText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  sub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { color: '#64748b', fontSize: 14 },
});
