import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  useFonts as usePlayfair,
} from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { PurchasesIdentitySync } from '@/providers/purchases-identity';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.local');
}

function RootNavigator() {
  const { isLoaded } = useAuth();
  const [creatoLoaded] = useFonts({
    CreatoDisplay: require('../../assets/fonts/CreatoDisplay-Regular.otf'),
    'CreatoDisplay-Medium': require('../../assets/fonts/CreatoDisplay-Medium.otf'),
    'CreatoDisplay-Bold': require('../../assets/fonts/CreatoDisplay-Bold.otf'),
  });
  const [playfairLoaded] = usePlayfair({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });

  const ready = isLoaded && creatoLoaded && playfairLoaded;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sso-callback" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <PurchasesIdentitySync>
          <RootNavigator />
        </PurchasesIdentitySync>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
