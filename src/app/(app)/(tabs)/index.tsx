import { useAuth, useUser } from '@clerk/expo';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  CalendarIcon,
  ChevronRightIcon,
  CookbookIcon,
  EmptyCookbookArt,
  FolderIcon,
  HeartIcon,
  LinkIcon,
  SearchIcon,
  StarIcon,
} from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import {
  AppText,
  EmptyState,
  ErrorState,
  IconButton,
  IconCircle,
  Screen,
  SectionHeader,
  Skeleton,
  Surface,
} from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import {
  fetchFavorites,
  fetchFolderRecipeCounts,
  fetchFolders,
  addFavorite,
  removeFavorite,
} from '@/lib/cookbooks';
import { fetchMealPlan, type MealPlanDay } from '@/lib/kitchen';
import { fetchUserRecipes } from '@/lib/recipes';
import { computeOwnedStats, STAT_FILTER_META, type StatFilter } from '@/lib/stat-filters';
import type { FolderRow, RecipeListItem } from '@/lib/types';

function formatUpcomingLabel(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [ownedRecipes, setOwnedRecipes] = useState<RecipeListItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [upcoming, setUpcoming] = useState<MealPlanDay[]>([]);
  const [importUrl, setImportUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);

    const [owned, favs, fold] = await Promise.all([
      fetchUserRecipes(supabase, userId),
      fetchFavorites(supabase, userId, isPro),
      fetchFolders(supabase, userId),
    ]);

    if (owned.error) {
      setError(owned.error);
      setOwnedRecipes([]);
      return;
    }

    setOwnedRecipes(owned.data);
    if (!favs.error) {
      setFavoriteIds(new Set(favs.data.map((r) => r.id)));
    }

    if (!fold.error) {
      setFolders(fold.data);
      const counts = await fetchFolderRecipeCounts(
        supabase,
        fold.data.map((f) => f.id)
      );
      setFolderCounts(counts);
    }

    if (isPro) {
      const meals = await fetchMealPlan(supabase, userId);
      if (!meals.error) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingDays = meals.data
          .filter((d) => {
            const dt = new Date(`${d.date}T12:00:00`);
            return dt >= today && d.recipes.length > 0;
          })
          .slice(0, 4);
        setUpcoming(upcomingDays);
      } else {
        setUpcoming([]);
      }
    } else {
      setUpcoming([]);
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

  const stats = useMemo(() => {
    const owned = computeOwnedStats(ownedRecipes);
    return {
      total: owned.total,
      favorites: favoriteIds.size,
      recipesThisWeek: owned.recipesThisWeek,
      importedThisMonth: owned.importedThisMonth,
    };
  }, [ownedRecipes, favoriteIds]);

  const recentRecipes = useMemo(() => ownedRecipes.slice(0, 8), [ownedRecipes]);
  const firstName = user?.firstName;

  const openStatFilter = (filter: StatFilter) => {
    router.push({ pathname: '/(app)/recipes', params: { filter } } as Href);
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

  const onCookIt = () => {
    const trimmed = importUrl.trim();
    if (!trimmed) {
      router.push('/(app)/recipe/import' as Href);
      return;
    }
    router.push({
      pathname: '/(app)/recipe/import',
      params: { url: trimmed },
    } as Href);
    setImportUrl('');
  };

  if (loading) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={styles.pad}>
          <Skeleton height={32} width="60%" style={{ marginBottom: Spacing[3] }} />
          <Skeleton height={18} width="40%" style={{ marginBottom: Spacing[5] }} />
          <View style={styles.statsGrid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={100} style={styles.statSkeleton} />
            ))}
          </View>
          <Skeleton height={140} style={{ marginTop: Spacing[4], borderRadius: Radius['2xl'] }} />
          <Skeleton height={120} style={{ marginTop: Spacing[4], borderRadius: Radius['2xl'] }} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRefresh} />;
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">
              {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}{' '}
              <AppText style={styles.wave}>👋</AppText>
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
          <StatCard
            label="Total Recipes"
            value={stats.total}
            tone="blue"
            caption={STAT_FILTER_META.all.homeCaption(stats.total)}
            accessibilityHint={STAT_FILTER_META.all.accessibilityHint}
            icon={<CookbookIcon size={18} color={Colors.brandBlue} />}
            onPress={() => openStatFilter('all')}
          />
          <StatCard
            label="Favorites"
            value={stats.favorites}
            tone="green"
            caption={STAT_FILTER_META.favorites.homeCaption(stats.favorites)}
            accessibilityHint={STAT_FILTER_META.favorites.accessibilityHint}
            icon={<HeartIcon size={18} color={Colors.brandLimeFg} filled />}
            onPress={() => openStatFilter('favorites')}
          />
          <StatCard
            label="Recipes This Week"
            value={stats.recipesThisWeek}
            tone="red"
            caption={STAT_FILTER_META.week.homeCaption(stats.recipesThisWeek)}
            accessibilityHint={STAT_FILTER_META.week.accessibilityHint}
            icon={<CalendarIcon size={18} color={Colors.accent} />}
            onPress={() => openStatFilter('week')}
          />
          <StatCard
            label="Imported This Month"
            value={stats.importedThisMonth}
            tone="purple"
            caption={STAT_FILTER_META.imported.homeCaption(stats.importedThisMonth)}
            accessibilityHint={STAT_FILTER_META.imported.accessibilityHint}
            icon={<StarIcon size={18} color="#7b5ea7" />}
            onPress={() => openStatFilter('imported')}
          />
        </View>

        <Surface style={styles.importCard}>
          <View style={styles.importHeader}>
            <IconCircle tone="accent" size={48}>
              <LinkIcon size={22} color={Colors.accent} />
            </IconCircle>
            <View style={{ flex: 1 }}>
              <AppText style={styles.importTitle}>Import a Recipe</AppText>
              <AppText variant="muted">
                Paste a TikTok link or any recipe webpage URL and we'll do the rest.
              </AppText>
            </View>
          </View>
          <View style={styles.importForm}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="Paste recipe URL…"
              placeholderTextColor={Colors.gray500}
              style={styles.importInput}
              value={importUrl}
              onChangeText={setImportUrl}
              onSubmitEditing={onCookIt}
              returnKeyType="go"
            />
            <Pressable
              onPress={onCookIt}
              style={({ pressed }) => [styles.cookItBtn, pressed && { opacity: 0.85 }]}>
              <AppText style={styles.cookItText}>Cook It!</AppText>
            </Pressable>
          </View>
        </Surface>

        <Surface style={styles.panel}>
          <View style={styles.panelHeader}>
            <FolderIcon size={18} color={Colors.brandBlue} />
            <AppText variant="section" style={{ flex: 1 }}>
              Your Collections
            </AppText>
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/cookbooks' as Href)}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <AppText style={styles.viewAll}>View all</AppText>
            </Pressable>
          </View>
          <AppText variant="muted" style={{ marginBottom: Spacing[2] }}>
            Quick access to your saved collections
          </AppText>
          {folders.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionsRow}>
              {folders.map((folder) => (
                <Pressable
                  key={folder.id}
                  onPress={() => router.push(`/(app)/cookbook/${folder.id}` as Href)}
                  style={({ pressed }) => [
                    styles.collectionChip,
                    pressed && { opacity: 0.9 },
                  ]}>
                  <AppText style={styles.collectionName} numberOfLines={2}>
                    {folder.folder_name}
                  </AppText>
                  <AppText style={styles.collectionCount}>
                    {folderCounts[folder.id] ?? 0}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <AppText variant="muted">
              Create folders in Cookbooks to organize your recipes.
            </AppText>
          )}
        </Surface>

        <Surface style={[styles.panel, { backgroundColor: Colors.upcomingBg }]}>
          <View style={styles.upcomingHeader}>
            <CalendarIcon size={18} color={Colors.accent} />
            <AppText variant="section">Upcoming Recipes</AppText>
          </View>
          <AppText variant="muted" style={{ marginBottom: Spacing[3] }}>
            See what's cooking next
          </AppText>
          {!isPro ? (
            <AppText variant="muted">Upgrade to Pro to plan meals on the calendar.</AppText>
          ) : upcoming.length > 0 ? (
            <View style={{ gap: Spacing[2] }}>
              {upcoming.map((day) => {
                const d = new Date(`${day.date}T12:00:00`);
                const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
                const dayNum = d.getDate();
                const recipeLabel = day.recipes[0]?.recipe_label ?? 'Scheduled meal';
                return (
                  <Pressable
                    key={day.id}
                    onPress={() => router.push('/(app)/(tabs)/calendar' as Href)}
                    style={({ pressed }) => [
                      styles.upcomingEntry,
                      pressed && { opacity: 0.9 },
                    ]}>
                    <View style={styles.upcomingBadge}>
                      <AppText style={styles.upcomingMonth}>{month}</AppText>
                      <AppText style={styles.upcomingDay}>{dayNum}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="muted" style={{ fontSize: FontSize.xs }}>
                        Scheduled for
                      </AppText>
                      <AppText style={styles.upcomingLabel} numberOfLines={1}>
                        {formatUpcomingLabel(day.date)}
                      </AppText>
                      <AppText variant="muted" numberOfLines={1}>
                        {recipeLabel}
                      </AppText>
                    </View>
                    <ChevronRightIcon size={20} color={Colors.gray500} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.upcomingEmpty}>
              <EmptyCookbookArt size={72} color={Colors.gray400} />
              <AppText style={styles.upcomingEmptyTitle}>No upcoming recipes</AppText>
              <Pressable
                onPress={() => router.push('/(app)/(tabs)/calendar' as Href)}
                hitSlop={8}>
                <AppText style={styles.viewAll}>Open calendar</AppText>
              </Pressable>
            </View>
          )}
        </Surface>

        <SectionHeader dense title="Recent recipes" />
        {recentRecipes.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentRow}>
            {recentRecipes.map((item) => (
              <RecipeCard
                key={item.id}
                recipe={item}
                favorited={favoriteIds.has(item.id)}
                compact
                onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
                onToggleFavorite={
                  canFavoriteRecipe(item) ? () => void onToggleFavorite(item) : undefined
                }
              />
            ))}
          </ScrollView>
        ) : (
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
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  tone,
  caption,
  icon,
  onPress,
  accessibilityHint,
}: {
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'red' | 'purple';
  caption: string;
  icon: ReactNode;
  onPress: () => void;
  accessibilityHint: string;
}) {
  const captionColors = {
    blue: Colors.brandBlue,
    green: Colors.brandLimeFg,
    red: Colors.accent,
    purple: '#7b5ea7',
  } as const;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.9 }]}>
      <IconCircle tone={tone} size={40}>
        {icon}
      </IconCircle>
      <AppText variant="label">{label}</AppText>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={[styles.statCaption, { color: captionColors[tone] }]} numberOfLines={2}>
        {caption}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing[4] },
  list: {
    padding: Spacing[4],
    paddingBottom: Spacing[12],
    gap: Spacing[4],
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  wave: {
    fontFamily: FontFamily.display,
    fontSize: FontSize['3xl'],
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
  },
  statSkeleton: {
    width: '47%',
    flexGrow: 1,
    borderRadius: Radius.xl,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[1],
    ...Shadows.soft,
  },
  statValue: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize['2xl'],
    color: Colors.foreground,
  },
  statCaption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  importCard: {
    gap: Spacing[4],
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  importTitle: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.foreground,
    marginBottom: 2,
  },
  importForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.backgroundPanel,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: Spacing[4],
    paddingRight: Spacing[1],
    paddingVertical: Spacing[1],
    minHeight: HitTarget.min + 4,
  },
  importInput: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.foreground,
    paddingVertical: Spacing[2],
  },
  cookItBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    minHeight: HitTarget.min - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookItText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
  },
  panel: {
    gap: Spacing[2],
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  viewAll: {
    color: Colors.accent,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
  collectionsRow: {
    gap: Spacing[2],
    paddingVertical: Spacing[1],
  },
  collectionChip: {
    width: 112,
    minHeight: 88,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundPanel,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    justifyContent: 'space-between',
  },
  collectionName: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.foreground,
  },
  collectionCount: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.lg,
    color: Colors.brandLimeFg,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[1],
  },
  upcomingEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    minHeight: HitTarget.min + 8,
  },
  upcomingBadge: {
    width: 48,
    alignItems: 'center',
  },
  upcomingMonth: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    color: Colors.gray600,
    letterSpacing: 0.5,
  },
  upcomingDay: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.foreground,
  },
  upcomingLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
  upcomingEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing[5],
    gap: Spacing[2],
  },
  upcomingEmptyTitle: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
  recentRow: {
    gap: Spacing[3],
    paddingBottom: Spacing[2],
  },
});
