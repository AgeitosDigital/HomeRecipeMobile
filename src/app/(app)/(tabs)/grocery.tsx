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
  toggleGroceryItem,
} from '@/lib/kitchen';
import type { GroceryItem } from '@/lib/types';
import { useWebApi } from '@/lib/web-api';

export default function GroceryScreen() {
  const { userId } = useAuth();
  const { isPro, loading: entitlementsLoading } = useEntitlements();
  const { billingUrl } = useWebApi();
  const supabase = useSupabase();

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [draft, setDraft] = useState('');
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
    const result = await addGroceryItem(supabase, userId, draft);
    setAdding(false);
    if (result.error) {
      setError(result.error);
      return;
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
            <AppText variant="muted">Keep track of everything you need. Check off as you shop.</AppText>
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

        {checkedCount > 0 ? (
          <Pressable onPress={onClearChecked} hitSlop={8} style={styles.clearBtn}>
            <AppText style={styles.clearText}>Clear checked ({checkedCount})</AppText>
          </Pressable>
        ) : null}
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
              label={item.item_text}
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
  clearBtn: {
    alignSelf: 'flex-start',
    minHeight: HitTarget.min - 8,
    justifyContent: 'center',
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
