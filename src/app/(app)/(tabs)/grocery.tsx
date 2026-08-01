import { useAuth } from '@clerk/expo';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { GroceryIcon } from '@/components/icons';
import {
  AppText,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  IconButton,
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
import {
  addGroceryItem,
  clearCheckedGroceryItems,
  deleteGroceryItem,
  fetchGroceryItems,
  setAllGroceryItemsChecked,
  toggleGroceryItem,
} from '@/lib/kitchen';
import type { GroceryCategory, GroceryItem } from '@/lib/types';
import { useWebApi } from '@/lib/web-api';

const CATEGORIES: { id: GroceryCategory | null; label: string }[] = [
  { id: null, label: 'None' },
  { id: 'produce', label: 'Produce' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'condiments', label: 'Condiments' },
];

export default function GroceryScreen() {
  const { userId } = useAuth();
  const { isPro, loading: entitlementsLoading } = useEntitlements();
  const { billingUrl } = useWebApi();
  const supabase = useSupabase();

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<GroceryCategory | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !isPro) return;
    setError(null);
    const result = await fetchGroceryItems(supabase, userId);
    if (result.error) {
      setError(result.error);
      setItems([]);
      return;
    }
    setItems(result.data);
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

  const onAdd = async () => {
    if (!userId || !draft.trim()) return;
    setAdding(true);
    const result = await addGroceryItem(supabase, userId, draft, category);
    setAdding(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.duplicate) {
      Alert.alert('Already on list', 'That item is already on your grocery list.');
    }
    setDraft('');
    await load();
  };

  const checkedCount = items.filter((i) => i.checked).length;

  const onClearChecked = () => {
    if (!userId || checkedCount === 0) return;
    Alert.alert(
      'Clear checked items',
      `Remove ${checkedCount} checked item${checkedCount === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearCheckedGroceryItems(supabase, userId);
            await load();
          },
        },
      ]
    );
  };

  const onCheckAll = async (checked: boolean) => {
    if (!userId || items.length === 0) return;
    await setAllGroceryItemsChecked(supabase, userId, checked);
    await load();
  };

  if (entitlementsLoading || loading) return <LoadingState />;
  if (!isPro) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <ProLockState
          feature="grocery lists"
          illustration={<GroceryIcon size={48} color={Colors.gray400} />}
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
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.pageHeader}>
          <View style={styles.iconCircle}>
            <GroceryIcon size={IconSize.lg} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">Grocery List</AppText>
            <AppText variant="muted">
              Keep track of everything you need. Check off as you shop.
            </AppText>
          </View>
        </View>

        <View style={styles.addRow}>
          <TextInput
            placeholder="Add an item…"
            placeholderTextColor={Colors.gray500}
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={onAdd}
            returnKeyType="done"
          />
          <Button title="Add" loading={adding} onPress={onAdd} />
        </View>

        <View style={styles.catRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => setCategory(c.id)}
              style={[styles.catChip, category === c.id && styles.catChipActive]}>
              <AppText
                style={[styles.catText, category === c.id && styles.catTextActive]}>
                {c.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.toolbar}>
          {items.length > 0 ? (
            <>
              <Pressable onPress={() => void onCheckAll(true)} hitSlop={8}>
                <AppText style={styles.clearText}>Check all</AppText>
              </Pressable>
              <Pressable onPress={() => void onCheckAll(false)} hitSlop={8}>
                <AppText style={styles.clearText}>Uncheck all</AppText>
              </Pressable>
            </>
          ) : null}
          {checkedCount > 0 ? (
            <Pressable onPress={onClearChecked} hitSlop={8}>
              <AppText style={styles.clearText}>Clear checked ({checkedCount})</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
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
        ListEmptyComponent={
          <EmptyState
            title="Your grocery list is empty"
            message="Add items from recipes or type above."
            illustration={<GroceryIcon size={56} color={Colors.gray400} />}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.checked && styles.rowChecked]}>
            <Checkbox
              checked={item.checked}
              label={
                item.category
                  ? `${item.item_text} · ${item.category}`
                  : item.item_text
              }
              onPress={async () => {
                if (!userId) return;
                await toggleGroceryItem(supabase, userId, item.id, !item.checked);
                await load();
              }}
            />
            <IconButton
              accessibilityLabel={`Delete ${item.item_text}`}
              onPress={() => {
                if (!userId) return;
                Alert.alert('Delete item', `Remove “${item.item_text}”?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteGroceryItem(supabase, userId, item.id);
                      await load();
                    },
                  },
                ]);
              }}>
              <AppText style={{ color: Colors.errorFg, fontSize: FontSize.sm }}>Delete</AppText>
            </IconButton>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    gap: Spacing[3],
  },
  pageHeader: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentMutedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: { flexDirection: 'row', gap: Spacing[2], alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.body,
    color: Colors.foreground,
    backgroundColor: Colors.white,
    minHeight: HitTarget.min,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  catChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    minHeight: HitTarget.min - 12,
    justifyContent: 'center',
  },
  catChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentMutedBg,
  },
  catText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray600,
  },
  catTextActive: {
    color: Colors.accent,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[4],
    minHeight: HitTarget.min - 8,
    alignItems: 'center',
  },
  clearText: {
    color: Colors.accent,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
  list: { padding: Spacing[4], paddingBottom: Spacing[12] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[2],
    ...Shadows.soft,
  },
  rowChecked: {
    backgroundColor: Colors.backgroundMuted,
    borderColor: Colors.gray200,
  },
});
