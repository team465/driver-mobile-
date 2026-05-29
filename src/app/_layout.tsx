import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/contexts/AuthContext';
import { DriverProvider } from '@/contexts/DriverContext';

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <DriverProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </DriverProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
