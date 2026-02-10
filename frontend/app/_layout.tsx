/**
 * App Layout
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SubscriptionProvider } from '@/src/context/SubscriptionContext';

export default function RootLayout() {
  return (
    <SubscriptionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#007AFF',
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="estimate/[id]" options={{ title: 'Document', headerBackTitle: 'Back' }} />
        <Stack.Screen name="materials/index" options={{ title: 'Materials Catalog', headerBackTitle: 'Back' }} />
        <Stack.Screen name="materials/[id]" options={{ title: 'Edit Material', headerBackTitle: 'Back' }} />
        <Stack.Screen name="paywall" options={{ title: 'Upgrade to Pro', headerBackTitle: 'Back', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Back' }} />
      </Stack>
    </SubscriptionProvider>
  );
}
