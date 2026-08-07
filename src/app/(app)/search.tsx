import { useAuth } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { SearchIcon } from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import { AppText, EmptyState, Screen, Surface } from '@/components/ui';
import { Colors, FontFamily, HitTarget, Radius, Shadows, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import {
  addFavorite,
  fetchFavoriteIds,
  removeFavorite,
} from '@/lib/cookbooks';
import { searchRecipes } from '@/lib/recipes';
import type { RecipeListItem } from '@/lib/types';

export default function SearchScreen() {
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecipeListItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const loadFavoriteIds = useCallback(async () => {
    if (!userId) return;
    const ids = await fetchFavoriteIds(supabase, userId);
    setFavoriteIds(ids);
  }, [supabase, userId]);

  useEffect(() => {
    void loadFavoriteIds();
  }, [loadFavoriteIds]);

  useEffect(() => {
    if (!userId) return;
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setError(null);
        return;
      }
      setSearching(true);
      const result = await searchRecipes(supabase, userId, query, isPro);
      setResults(result.data);
      setError(result.error);
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, userId, supabase, isPro]);

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
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Surface style={styles.searchSurface} padded={false} elevated>
          <View style={styles.searchRow}>
            <SearchIcon size={18} color={Colors.accent} />
            <TextInput
              autoFocus
              placeholder={isPro ? 'Search all recipes' : 'Search your recipes'}
              placeholderTextColor={Colors.gray500}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </Surface>
        {error ? <AppText variant="error">{error}</AppText> : null}
        {searching ? <AppText variant="muted">Searching…</AppText> : null}
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState
              title="No matches"
              message="Try another name or check your spelling."
              illustration={<SearchIcon size={48} color={Colors.gray400} />}
            />
          ) : (
            <EmptyState
              title="Search recipes"
              message="Type a recipe name to find something delicious."
              illustration={<SearchIcon size={48} color={Colors.gray400} />}
            />
          )
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            favorited={favoriteIds.has(item.id)}
            onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
            onToggleFavorite={
              canFavoriteRecipe(item) ? () => void onToggleFavorite(item) : undefined
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing[4], gap: Spacing[2] },
  searchSurface: {
    borderRadius: Radius.full,
    ...Shadows.soft,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    minHeight: HitTarget.min + 4,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.body,
    color: Colors.foreground,
  },
  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[12] },
});
