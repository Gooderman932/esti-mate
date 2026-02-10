/**
 * App Layout with Stack Navigation
 * 
 * Provides navigation structure for the app.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="estimate/[id]"
          options={{
            title: 'Document',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}
