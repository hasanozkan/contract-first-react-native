import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { mockMode } from '../api/clients';
import { colors } from '../ui/theme';

export default function RootLayout() {
  const [client] = useState(() => new QueryClient());
  const tag = (mock: boolean) => (mock ? ' · mock' : '');
  return (
    <QueryClientProvider client={client}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: `Catalog${tag(mockMode.library)}`,
            tabBarLabel: 'Catalog',
            tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            title: `Assistant${tag(mockMode.assistant)}`,
            tabBarLabel: 'Assistant',
            tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} />,
          }}
        />
      </Tabs>
    </QueryClientProvider>
  );
}
