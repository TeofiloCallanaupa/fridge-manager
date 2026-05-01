import { Stack } from 'expo-router'
import { useTheme } from 'react-native-paper'

export default function OnboardingLayout() {
  const theme = useTheme()

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="profile" 
        options={{ title: 'Create Profile', headerLeft: () => null }} 
      />
      <Stack.Screen 
        name="avatar" 
        options={{ title: 'Your Avatar', headerLeft: () => null }} 
      />
      <Stack.Screen 
        name="household" 
        options={{ title: 'Household', headerLeft: () => null }} 
      />
    </Stack>
  )
}
