import { Tabs } from 'expo-router'
import { Pressable } from 'react-native'
import { useTheme } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

function SettingsGearButton() {
  const theme = useTheme()
  return (
    <Pressable
      onPress={() => router.push('/(app)/settings')}
      style={{ marginRight: 12 }}
      testID="header-settings"
    >
      <MaterialCommunityIcons
        name="cog-outline"
        size={24}
        color={theme.colors.onSurfaceVariant}
      />
    </Pressable>
  )
}

export default function AppLayout() {
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        headerRight: () => <SettingsGearButton />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 18,
          includeFontPadding: false,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Grocery',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="fridge-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />
      {/* Hide the old index route from tabs */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      {/* Settings is accessed via header gear icon — hide from tab bar */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Settings',
        }}
      />

    </Tabs>
  )
}
