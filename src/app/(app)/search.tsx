import { useAuth } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { SearchIcon } from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { Colors, FontFamily, HitTarget, Radius, Spacing } from '@/constants/theme';
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
        <View style={styles.searchRow}>
          <SearchIcon size={18} color={Colors.gray500} />
          <TextInput
            autoFocus
            placeholder={isPro ? 'Search all recipes' : 'Search your recipes'}
            placeholderTextColor={Colors.gray500}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        {error ? <AppText variant="error">{error}</AppText> : null}
        {searching ? <AppText variant="muted">Searching…</AppText> : null}
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.trim() ? (
            <EmptyState title="No matches" message="Try another name." />
          ) : (
            <EmptyState title="Search recipes" message="Type a recipe name to begin." />
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    minHeight: HitTarget.min,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.body,
    color: Colors.foreground,
  },
  list: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[12] },
});
