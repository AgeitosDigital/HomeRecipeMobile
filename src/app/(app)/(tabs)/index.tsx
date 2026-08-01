import { useAuth, useUser } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { SearchIcon } from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import {
  AppText,
  EmptyState,
  ErrorState,
  IconButton,
  SectionHeader,
  Skeleton,
  Screen,
} from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { addFavorite, fetchFavoriteIds, removeFavorite } from '@/lib/cookbooks';
import { fetchSharedRecipes, fetchUserRecipes } from '@/lib/recipes';
import type { RecipeListItem } from '@/lib/types';

function startOfWeek(d = new Date()) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function HomeScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [ownedRecipes, setOwnedRecipes] = useState<RecipeListItem[]>([]);
  const [section, setSection] = useState<'yours' | 'shared'>('yours');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const [owned, favs] = await Promise.all([
      fetchUserRecipes(supabase, userId),
      fetchFavoriteIds(supabase, userId),
    ]);
    setFavoriteIds(favs);

    if (owned.error) {
      setError(owned.error);
      setRecipes([]);
      setOwnedRecipes([]);
      return;
    }

    setOwnedRecipes(owned.data);

    if (owned.data.length > 0) {
      setRecipes(owned.data);
      setSection('yours');
      return;
    }

    if (isPro) {
      const shared = await fetchSharedRecipes(supabase);
      if (shared.error) {
        setError(shared.error);
        setRecipes([]);
        return;
      }
      setRecipes(shared.data);
      setSection('shared');
    } else {
      setRecipes([]);
      setSection('yours');
    }
  }, [supabase, userId, isPro]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    const monthStart = startOfMonth().getTime();
    let recipesThisWeek = 0;
    let importedThisMonth = 0;
    for (const r of ownedRecipes) {
      const created = r.created_at ? new Date(r.created_at).getTime() : NaN;
      if (Number.isFinite(created) && created >= weekStart) recipesThisWeek += 1;
      if (
        r.website_url &&
        Number.isFinite(created) &&
        created >= monthStart
      ) {
        importedThisMonth += 1;
      }
    }
    return {
      total: ownedRecipes.length,
      favorites: favoriteIds.size,
      recipesThisWeek,
      importedThisMonth,
    };
  }, [ownedRecipes, favoriteIds]);

  const toggleFavorite = async (recipe: RecipeListItem) => {
    if (!userId) return;
    const isFav = favoriteIds.has(recipe.id);
    const next = new Set(favoriteIds);
    if (isFav) {
      next.delete(recipe.id);
      setFavoriteIds(next);
      await removeFavorite(supabase, userId, recipe.id);
    } else {
      if (!isPro && recipe.user_id !== userId) return;
      next.add(recipe.id);
      setFavoriteIds(next);
      await addFavorite(supabase, userId, recipe.id);
    }
  };

  const firstName = user?.firstName;

  return (
    <Screen edges={['top', 'left', 'right']}>
      {loading ? (
        <View style={styles.pad}>
          <Skeleton height={32} width="60%" style={{ marginBottom: Spacing[3] }} />
          <Skeleton height={18} width="40%" style={{ marginBottom: Spacing[5] }} />
          <View style={styles.statsGrid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={88} style={styles.statCard} />
            ))}
          </View>
          <Skeleton height={100} style={{ marginTop: Spacing[4], borderRadius: Radius['2xl'] }} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View>
              <View style={styles.welcomeRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">
                    {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
                  </AppText>
                  <AppText variant="muted" style={{ marginTop: 4 }}>
                    {isPro ? "Let's make today delicious." : 'Free plan · cook something new today.'}
                  </AppText>
                </View>
                <IconButton
                  accessibilityLabel="Search recipes"
                  onPress={() => router.push('/(app)/search' as Href)}
                  style={styles.searchBtn}>
                  <SearchIcon size={20} color={Colors.accent} />
                </IconButton>
              </View>

              <Pressable
                onPress={() => router.push('/(app)/recipe/create' as Href)}
                style={({ pressed }) => [styles.createCta, pressed && { opacity: 0.85 }]}>
                <AppText style={styles.createCtaText}>+ Create Recipe</AppText>
              </Pressable>

              <View style={styles.statsGrid}>
                <StatCard label="Total Recipes" value={stats.total} tint={Colors.brandBlue} />
                <StatCard label="Favorites" value={stats.favorites} tint={Colors.brandLimeFg} />
                <StatCard label="This Week" value={stats.recipesThisWeek} tint={Colors.accent} />
                <StatCard
                  label="Imported"
                  value={stats.importedThisMonth}
                  tint={Colors.brandBlue}
                />
              </View>

              <Pressable
                onPress={() => router.push('/(app)/recipe/import' as Href)}
                style={({ pressed }) => [styles.importCard, pressed && { opacity: 0.9 }]}>
                <View style={styles.importIcon}>
                  <AppText style={{ color: Colors.accent, fontFamily: FontFamily.bodyBold }}>
                    ↓
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: FontFamily.bodyBold }}>Import a Recipe</AppText>
                  <AppText variant="muted">
                    Paste a TikTok link or any recipe webpage URL.
                  </AppText>
                </View>
              </Pressable>

              <SectionHeader
                title={section === 'yours' ? 'Your recipes' : 'Shared catalog'}
                subtitle={
                  section === 'shared'
                    ? 'Browse the catalog while you build your kitchen'
                    : undefined
                }
              />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title="No recipes yet"
              message="Create one or import from a URL to get started."
              primaryAction={{
                title: 'Create recipe',
                onPress: () => router.push('/(app)/recipe/create' as Href),
              }}
              secondaryAction={{
                title: 'Import URL',
                onPress: () => router.push('/(app)/recipe/import' as Href),
              }}
            />
          }
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              favorited={favoriteIds.has(item.id)}
              onToggleFavorite={() => toggleFavorite(item)}
              onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statDot, { backgroundColor: tint }]} />
      <AppText variant="label">{label}</AppText>
      <AppText style={styles.statValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing[4] },
  list: {
    padding: Spacing[4],
    paddingBottom: Spacing[12],
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  searchBtn: {
    backgroundColor: Colors.accentMutedBg,
  },
  createCta: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4] + 2,
    paddingVertical: Spacing[3],
    marginBottom: Spacing[5],
    ...Shadows.soft,
  },
  createCtaText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize['2xl'],
    color: Colors.foreground,
  },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[5],
    ...Shadows.soft,
  },
  importIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentMutedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
