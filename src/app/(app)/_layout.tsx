import { useAuth } from '@clerk/expo';
import { Redirect, Stack, type Href } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { Colors, FontFamily } from '@/constants/theme';

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingState />;
  if (!isSignedIn) return <Redirect href={'/sign-in' as Href} />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.foreground,
        headerTitleStyle: { fontFamily: FontFamily.bodyBold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="recipe/[id]" options={{ title: 'Recipe' }} />
      <Stack.Screen name="recipe/edit" options={{ title: 'Edit recipe', presentation: 'modal' }} />
      <Stack.Screen name="recipe/create" options={{ title: 'New recipe', presentation: 'modal' }} />
      <Stack.Screen name="recipe/import" options={{ title: 'Import URL', presentation: 'modal' }} />
      <Stack.Screen name="cookbook/[folderId]" options={{ title: 'Cookbook' }} />
      <Stack.Screen name="recipes" options={{ title: 'Recipes' }} />
      <Stack.Screen name="search" options={{ title: 'Search', presentation: 'modal' }} />
    </Stack>
  );
}
