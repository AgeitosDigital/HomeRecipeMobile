import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { DateField, toYmd } from '@/components/date-field';
import { CalendarIcon, PencilIcon, TrashIcon } from '@/components/icons';
import { RecipePickerSheet } from '@/components/recipe-picker-sheet';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  PageHeader,
  ProLockState,
  Screen,
  Surface,
} from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  IconSize,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { usePurchases } from '@/hooks/use-purchases';
import { useSupabase } from '@/hooks/use-supabase';
import {
  createOrUpdateMealDate,
  deleteMealDate,
  fetchMealPlan,
  type MealPlanDay,
} from '@/lib/kitchen';
import type { RecipeListItem } from '@/lib/types';

const placeholder = require('../../../../assets/brand/recipe-placeholder.png');

export default function CalendarScreen() {
  const { userId } = useAuth();
  const { isPro, loading: entitlementsLoading, refresh: refreshEntitlements } = useEntitlements();
  const { presentPaywall } = usePurchases();
  const supabase = useSupabase();
  const router = useRouter();

  const [days, setDays] = useState<MealPlanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(toYmd(new Date()));
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeListItem | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const openNewSchedule = () => {
    setEditingEventId(null);
    setSelectedRecipe(null);
    setScheduleDate(toYmd(new Date()));
    setScheduleOpen(true);
  };

  const openEdit = (day: MealPlanDay) => {
    setEditingEventId(day.event_id);
    setScheduleDate(day.date);
    setSelectedRecipe(day.recipes[0] ?? null);
    setScheduleOpen(true);
  };

  const onSaveSchedule = async () => {
    if (!userId || !selectedRecipe) {
      Alert.alert('Pick a recipe', 'Choose a recipe to schedule.');
      return;
    }
    setSaving(true);
    const result = await createOrUpdateMealDate(supabase, userId, {
      date: scheduleDate,
      recipePublicId: selectedRecipe.recipe_id,
      eventId: editingEventId ?? undefined,
    });
    setSaving(false);
    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }
    setScheduleOpen(false);
    await load();
  };

  const onDelete = (day: MealPlanDay) => {
    if (!userId) return;
    const label = day.recipes[0]?.recipe_label ?? 'this meal';
    Alert.alert('Remove meal?', `Remove “${label}” from the calendar?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteMealDate(supabase, userId, day.event_id);
          if (result.error) Alert.alert('Error', result.error);
          else await load();
        },
      },
    ]);
  };

  if (entitlementsLoading || loading) return <LoadingState />;
  if (!isPro) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ProLockState
          feature="meal planning and the calendar"
          illustration={<CalendarIcon size={48} color={Colors.gray400} />}
          onUpgrade={() => {
            void (async () => {
              const result = await presentPaywall();
              if (result === 'purchased' || result === 'restored' || result === 'skipped') {
                await refreshEntitlements();
              }
            })();
          }}
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
          <View style={{ marginBottom: Spacing[4], gap: Spacing[3] }}>
            <PageHeader
              icon={<CalendarIcon size={IconSize.lg} color={Colors.accent} />}
              title="Meal Calendar"
              subtitle="See what's cooking next"
            />
            <Button title="Schedule meal" onPress={openNewSchedule} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Your calendar is ready"
            message="Schedule a meal to plan what's cooking."
            illustration={<CalendarIcon size={56} color={Colors.gray400} />}
            primaryAction={{ title: 'Schedule meal', onPress: openNewSchedule }}
          />
        }
        renderItem={({ item }) => {
          const d = new Date(`${item.date}T12:00:00`);
          const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
          const day = d.getDate();
          return (
            <Surface style={styles.dayCard} padded={false}>
              <View style={styles.dayInner}>
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
                        onLongPress={() => openEdit(item)}
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
                  <View style={styles.rowActions}>
                    <IconButton
                      accessibilityLabel="Edit meal"
                      onPress={() => openEdit(item)}
                      style={styles.actionBtn}>
                      <PencilIcon size={18} color={Colors.accent} />
                    </IconButton>
                    <IconButton
                      accessibilityLabel="Remove meal"
                      onPress={() => onDelete(item)}
                      style={styles.actionBtn}>
                      <TrashIcon size={18} color={Colors.errorFg} />
                    </IconButton>
                  </View>
                </View>
              </View>
            </Surface>
          );
        }}
      />

      <Modal
        visible={scheduleOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setScheduleOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setScheduleOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation?.()}>
            <AppText variant="title" style={{ marginBottom: Spacing[3] }}>
              {editingEventId ? 'Edit meal' : 'Schedule meal'}
            </AppText>
            <DateField value={scheduleDate} onChange={setScheduleDate} />
            <AppText variant="label" style={{ marginTop: Spacing[3] }}>
              Recipe
            </AppText>
            <Pressable style={styles.recipePick} onPress={() => setPickerOpen(true)}>
              <AppText numberOfLines={2}>
                {selectedRecipe?.recipe_label ?? 'Choose a recipe…'}
              </AppText>
            </Pressable>
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setScheduleOpen(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Save" loading={saving} onPress={onSaveSchedule} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {userId ? (
        <RecipePickerSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(recipe) => setSelectedRecipe(recipe)}
          supabase={supabase}
          userId={userId}
          isPro={isPro}
          title="Pick a recipe"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing[4], paddingBottom: Spacing[12] },
  dayCard: {
    marginBottom: Spacing[3],
    backgroundColor: Colors.upcomingBg,
  },
  dayInner: {
    flexDirection: 'row',
    gap: Spacing[3],
    padding: Spacing[4],
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
  rowActions: {
    flexDirection: 'row',
    gap: Spacing[1],
    marginTop: Spacing[1],
  },
  actionBtn: {
    backgroundColor: Colors.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing[5],
    paddingBottom: Spacing[10],
    gap: Spacing[2],
  },
  recipePick: {
    minHeight: HitTarget.min,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginBottom: Spacing[3],
  },
  modalActions: { flexDirection: 'row', gap: Spacing[2], marginTop: Spacing[2] },
});
