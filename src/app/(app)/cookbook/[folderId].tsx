import { useAuth } from '@clerk/expo';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { RecipePickerSheet } from '@/components/recipe-picker-sheet';
import { RecipeCard } from '@/components/recipe-card';
import { AppText, Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import {
  addRecipeToFolder,
  fetchFolderRecipes,
  fetchFolders,
  removeRecipeFromFolder,
} from '@/lib/cookbooks';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !folderId) return;
    setError(null);
    const [folders, items] = await Promise.all([
      fetchFolders(supabase, userId),
      fetchFolderRecipes(supabase, folderId, userId, isPro),
    ]);
    const folder = folders.data.find((f) => f.id === folderId);
    if (folder) setTitle(folder.folder_name);
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

  const onAddRecipe = async (recipe: RecipeListItem) => {
    if (!folderId) return;
    setAdding(true);
    const result = await addRecipeToFolder(supabase, folderId, recipe.id);
    setAdding(false);
    if (result.error) {
      Alert.alert('Could not add', result.error);
      return;
    }
    await load();
  };

  const onRemove = (recipe: RecipeListItem) => {
    if (!folderId) return;
    Alert.alert('Remove recipe?', `Remove “${recipe.recipe_label}” from this cookbook?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await removeRecipeFromFolder(supabase, folderId, recipe.id);
          if (result.error) Alert.alert('Error', result.error);
          else await load();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            userId ? (
              <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
                <AppText style={styles.headerAction}>Add</AppText>
              </Pressable>
            ) : null,
        }}
      />
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
            ListHeaderComponent={
              <View style={{ marginBottom: Spacing[3] }}>
                <Button
                  title={adding ? 'Adding…' : 'Add recipe'}
                  loading={adding}
                  onPress={() => setPickerOpen(true)}
                />
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                title="Empty cookbook"
                message="Add recipes from your library to this folder."
                primaryAction={{
                  title: 'Add recipe',
                  onPress: () => setPickerOpen(true),
                }}
              />
            }
            renderItem={({ item }) => (
              <View style={{ marginBottom: Spacing[2] }}>
                <RecipeCard
                  recipe={item}
                  onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
                />
                <Pressable onPress={() => onRemove(item)} hitSlop={8} style={styles.removeBtn}>
                  <AppText style={styles.removeText}>Remove from cookbook</AppText>
                </Pressable>
              </View>
            )}
          />
        </Screen>
      )}

      {userId ? (
        <RecipePickerSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(recipe) => void onAddRecipe(recipe)}
          supabase={supabase}
          userId={userId}
          isPro={isPro}
          title="Add to cookbook"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    color: Colors.accent,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
    paddingHorizontal: Spacing[2],
  },
  removeBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing[2],
    marginBottom: Spacing[2],
  },
  removeText: {
    color: Colors.errorFg,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
});
