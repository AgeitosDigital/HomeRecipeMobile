import { useAuth } from '@clerk/expo';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { RecipeCard } from '@/components/recipe-card';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { fetchFolderRecipes, fetchFolders } from '@/lib/cookbooks';
import type { RecipeListItem } from '@/lib/types';

export default function FolderDetailScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [title, setTitle] = useState('Cookbook');
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !folderId) return;
    setError(null);
    const [folders, items] = await Promise.all([
      fetchFolders(supabase, userId),
      fetchFolderRecipes(supabase, folderId, userId, isPro),
    ]);
    const folder = folders.data.find((f) => f.id === folderId);
    if (folder) setTitle(folder.name);
    if (items.error) {
      setError(items.error);
      setRecipes([]);
      return;
    }
    setRecipes(items.data);
  }, [supabase, userId, folderId, isPro]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title }} />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Screen edges={['left', 'right']}>
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing[4], paddingBottom: Spacing[12] }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await load();
                  setRefreshing(false);
                }}
              />
            }
            ListEmptyComponent={
              <EmptyState title="Empty cookbook" message="Add recipes to this folder on the web." />
            }
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
              />
            )}
          />
        </Screen>
      )}
    </>
  );
}
