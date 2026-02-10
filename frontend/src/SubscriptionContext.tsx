/**
 * Subscription Context
 * 
 * Manages subscription state across the app and provides
 * feature gating logic
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import {
  getSettings,
  saveSettings,
  getSubscriptionStatus,
  saveSubscriptionStatus,
  getActiveEstimatesCount,
} from './store/storage';
import { SubscriptionStatus, AppSettings, FREE_TIER_LIMITS } from './types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  userId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  settings: AppSettings | null;
  checkSubscription: () => Promise<void>;
  canCreateEstimate: () => Promise<boolean>;
  canUploadLogo: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Initialize on mount
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      
      // Load settings (includes userId)
      const appSettings = await getSettings();
      setSettings(appSettings);
      setUserId(appSettings.userId);
      
      // Check subscription status
      await checkSubscriptionFromServer(appSettings.userId);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionFromServer = async (uid: string) => {
    try {
      // Try to ensure customer exists
      await fetch(`${API_URL}/api/customers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid }),
      });
      
      // Check subscription status
      const response = await fetch(`${API_URL}/api/subscriptions/status/${uid}`);
      if (response.ok) {
        const data = await response.json();
        const status: SubscriptionStatus = {
          userId: uid,
          isPro: data.is_pro,
          subscriptionId: data.subscription_id,
          status: data.status,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
        };
        setSubscriptionStatus(status);
        setIsPro(data.is_pro);
        await saveSubscriptionStatus(status);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Fall back to cached status
      const cached = await getSubscriptionStatus();
      if (cached) {
        setSubscriptionStatus(cached);
        setIsPro(cached.isPro);
      }
    }
  };

  const checkSubscription = useCallback(async () => {
    if (userId) {
      await checkSubscriptionFromServer(userId);
    }
  }, [userId]);

  const canCreateEstimate = async (): Promise<boolean> => {
    if (isPro) return true;
    
    const activeCount = await getActiveEstimatesCount();
    return activeCount < FREE_TIER_LIMITS.maxActiveEstimates;
  };

  const refreshSettings = async () => {
    const appSettings = await getSettings();
    setSettings(appSettings);
  };

  const updateSettings = async (newSettings: AppSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
  };

  const value: SubscriptionContextType = {
    isPro,
    isLoading,
    userId,
    subscriptionStatus,
    settings,
    checkSubscription,
    canCreateEstimate,
    canUploadLogo: isPro,
    refreshSettings,
    updateSettings,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
