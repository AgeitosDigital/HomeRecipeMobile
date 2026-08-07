import { useAuth } from '@clerk/expo';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { RecipeCard } from '@/components/recipe-card';
import { AppText, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { addFavorite, fetchFavorites, removeFavorite } from '@/lib/cookbooks';
import {
  loadRecipesForFilter,
  parseStatFilter,
  STAT_FILTER_META,
  subtitleForFilter,
} from '@/lib/stat-filters';
import type { RecipeListItem } from '@/lib/types';

export default function RecipesFilterScreen() {
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const filter = parseStatFilter(filterParam);
  const meta = STAT_FILTER_META[filter];

  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const [list, favs] = await Promise.all([
      loadRecipesForFilter(supabase, userId, isPro, filter),
      fetchFavorites(supabase, userId, isPro),
    ]);
    if (list.error) {
      setError(list.error);
      setRecipes([]);
      return;
    }
    setRecipes(list.data);
    if (!favs.error) {
      setFavoriteIds(new Set(favs.data.map((r) => r.id)));
    }
  }, [supabase, userId, isPro, filter]);

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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const canFavoriteRecipe = (recipe: RecipeListItem) =>
    isPro || !!(recipe.user_id && userId && recipe.user_id === userId);

  const onToggleFavorite = async (recipe: RecipeListItem) => {
    if (!userId || !canFavoriteRecipe(recipe)) return;
    const wasFavorited = favoriteIds.has(recipe.id);

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(recipe.id);
      else next.add(recipe.id);
      return next;
    });

    if (filter === 'favorites' && wasFavorited) {
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    }

    const result = wasFavorited
      ? await removeFavorite(supabase, userId, recipe.id)
      : await addFavorite(supabase, userId, recipe.id);

    if (result.error) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.add(recipe.id);
        else next.delete(recipe.id);
        return next;
      });
      if (filter === 'favorites' && wasFavorited) {
        await load();
      }
    }
  };

  const runEmptyAction = (action: 'create' | 'import' | 'browse-all') => {
    if (action === 'create') {
      router.push('/(app)/recipe/create' as Href);
      return;
    }
    if (action === 'import') {
      router.push('/(app)/recipe/import' as Href);
      return;
    }
    router.push({ pathname: '/(app)/recipes', params: { filter: 'all' } } as Href);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: meta.title,
          headerRight: () =>
            meta.headerAction ? (
              <Pressable
                onPress={() => runEmptyAction(meta.headerAction!.action)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={meta.headerAction.title}>
                <AppText style={styles.headerAction}>{meta.headerAction.title}</AppText>
              </Pressable>
            ) : null,
        }}
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} />
      ) : (
        <Screen edges={['left', 'right']}>
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
            }
            ListHeaderComponent={
              <AppText variant="muted" style={styles.subtitle}>
                {subtitleForFilter(filter, recipes.length)}
              </AppText>
            }
            ListEmptyComponent={
              <EmptyState
                title={meta.empty.title}
                message={meta.empty.message}
                primaryAction={{
                  title: meta.empty.primary.title,
                  onPress: () => runEmptyAction(meta.empty.primary.action),
                }}
                secondaryAction={
                  meta.empty.secondary
                    ? {
                        title: meta.empty.secondary.title,
                        onPress: () => runEmptyAction(meta.empty.secondary!.action),
                      }
                    : undefined
                }
              />
            }
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <RecipeCard
                  recipe={item}
                  favorited={favoriteIds.has(item.id)}
                  onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
                  onToggleFavorite={
                    canFavoriteRecipe(item) ? () => void onToggleFavorite(item) : undefined
                  }
                />
              </View>
            )}
          />
        </Screen>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing[4],
    paddingBottom: Spacing[12],
    flexGrow: 1,
  },
  subtitle: {
    marginBottom: Spacing[3],
  },
  cardWrap: {
    marginBottom: Spacing[3],
  },
  headerAction: {
    color: Colors.accent,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
    paddingHorizontal: Spacing[2],
  },
});
