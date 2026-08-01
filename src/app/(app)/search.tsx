import { useAuth } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { SearchIcon } from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import { AppText, EmptyState, Screen, Surface } from '@/components/ui';
import { Colors, FontFamily, HitTarget, Radius, Shadows, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { searchRecipes } from '@/lib/recipes';
import type { RecipeListItem } from '@/lib/types';

export default function SearchScreen() {
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecipeListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

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
            onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
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
