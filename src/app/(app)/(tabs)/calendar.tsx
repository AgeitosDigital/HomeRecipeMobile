import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CalendarIcon } from '@/components/icons';
import {
  AppText,
  EmptyState,
  ErrorState,
  LoadingState,
  ProLockState,
  Screen,
} from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  IconSize,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { fetchMealPlan, type MealPlanDay } from '@/lib/kitchen';
import { useWebApi } from '@/lib/web-api';

const placeholder = require('../../../../assets/brand/recipe-placeholder.png');

export default function CalendarScreen() {
  const { userId } = useAuth();
  const { isPro, loading: entitlementsLoading } = useEntitlements();
  const { billingUrl, calendarUrl } = useWebApi();
  const supabase = useSupabase();
  const router = useRouter();

  const [days, setDays] = useState<MealPlanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !isPro) return;
    setError(null);
    const result = await fetchMealPlan(supabase, userId);
    if (result.error) {
      setError(result.error);
      setDays([]);
      return;
    }
    setDays(result.data);
  }, [supabase, userId, isPro]);

  useEffect(() => {
    if (entitlementsLoading) return;
    if (!isPro) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, isPro, entitlementsLoading]);

  if (entitlementsLoading || loading) return <LoadingState />;
  if (!isPro) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ProLockState
          feature="meal planning and the calendar"
          illustration={<CalendarIcon size={48} color={Colors.gray400} />}
          onUpgrade={
            billingUrl
              ? () => {
                  void Linking.openURL(billingUrl);
                }
              : undefined
          }
        />
      </Screen>
    );
  }
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
      />
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <FlatList
        data={days}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
          <Animated.View entering={FadeInDown.duration(200)} style={styles.pageHeader}>
            <View style={styles.iconChip}>
              <CalendarIcon size={IconSize.lg} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">Meal Calendar</AppText>
              <AppText variant="muted">See what's cooking next</AppText>
            </View>
          </Animated.View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Your calendar is ready"
            message="You don't have any upcoming recipes scheduled yet. Plan meals on the web for now."
            illustration={<CalendarIcon size={56} color={Colors.gray400} />}
            secondaryAction={
              calendarUrl
                ? {
                    title: 'Plan on web',
                    onPress: () => {
                      void Linking.openURL(calendarUrl);
                    },
                  }
                : undefined
            }
          />
        }
        renderItem={({ item }) => {
          const d = new Date(`${item.meal_date}T12:00:00`);
          const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
          const day = d.getDate();
          return (
            <View style={styles.dayCard}>
              <View style={styles.dateBadge}>
                <AppText style={styles.month}>{month}</AppText>
                <AppText style={styles.dayNum}>{day}</AppText>
              </View>
              <View style={{ flex: 1, gap: Spacing[2] }}>
                {item.recipes.length === 0 ? (
                  <AppText variant="muted">No recipes</AppText>
                ) : (
                  item.recipes.map((recipe) => (
                    <Pressable
                      key={recipe.id}
                      onPress={() => router.push(`/(app)/recipe/${recipe.id}` as Href)}
                      style={({ pressed }) => [
                        styles.recipeRow,
                        pressed && { opacity: 0.85 },
                      ]}>
                      <Image
                        source={recipe.image_url ? { uri: recipe.image_url } : placeholder}
                        style={styles.thumb}
                        contentFit="cover"
                      />
                      <AppText style={styles.recipe} numberOfLines={2}>
                        {recipe.recipe_label}
                      </AppText>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing[4], paddingBottom: Spacing[12] },
  pageHeader: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'center',
    marginBottom: Spacing[5],
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: {
    flexDirection: 'row',
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    backgroundColor: Colors.upcomingBg,
    ...Shadows.soft,
  },
  dateBadge: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xs,
    color: Colors.gray600,
    letterSpacing: 0.5,
  },
  dayNum: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.foreground,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: HitTarget.min,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing[2],
    paddingRight: Spacing[3],
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray200,
  },
  recipe: {
    flex: 1,
    color: Colors.foreground,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
  },
});
