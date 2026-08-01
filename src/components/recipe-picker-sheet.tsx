import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

import { AppText, Button } from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  Radius,
  Spacing,
} from '@/constants/theme';
import { fetchSharedRecipes, fetchUserRecipes, searchRecipes } from '@/lib/recipes';
import type { RecipeListItem } from '@/lib/types';

const placeholder = require('../../assets/brand/recipe-placeholder.png');

export function RecipePickerSheet({
  visible,
  onClose,
  onSelect,
  supabase,
  userId,
  isPro,
  title = 'Choose a recipe',
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipe: RecipeListItem) => void;
  supabase: SupabaseClient;
  userId: string;
  isPro: boolean;
  title?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      const trimmed = q.trim();
      if (trimmed) {
        const result = await searchRecipes(supabase, userId, trimmed, isPro);
        setLoading(false);
        if (result.error) {
          setError(result.error);
          setResults([]);
          return;
        }
        setResults(result.data);
        return;
      }

      const owned = await fetchUserRecipes(supabase, userId);
      if (owned.error) {
        setLoading(false);
        setError(owned.error);
        setResults([]);
        return;
      }
      if (isPro) {
        const shared = await fetchSharedRecipes(supabase);
        setLoading(false);
        if (shared.error) {
          setResults(owned.data);
          return;
        }
        const seen = new Set(owned.data.map((r) => r.id));
        const merged = [...owned.data];
        for (const r of shared.data) {
          if (!seen.has(r.id)) merged.push(r);
        }
        setResults(merged.slice(0, 50));
        return;
      }
      setLoading(false);
      setResults(owned.data);
    },
    [supabase, userId, isPro]
  );

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    void runSearch('');
  }, [visible, runSearch]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      void runSearch(query);
    }, 280);
    return () => clearTimeout(t);
  }, [query, visible, runSearch]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <AppText variant="title" style={{ marginBottom: Spacing[2] }}>
            {title}
          </AppText>
          <TextInput
            autoFocus
            placeholder="Search recipes…"
            placeholderTextColor={Colors.gray500}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
          />
          {error ? <AppText variant="error">{error}</AppText> : null}
          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: Spacing[6] }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360 }}
              ListEmptyComponent={
                <AppText variant="muted" style={{ paddingVertical: Spacing[4] }}>
                  No recipes found.
                </AppText>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}>
                  <Image
                    source={item.image_url ? { uri: item.image_url } : placeholder}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <AppText numberOfLines={2} style={styles.label}>
                      {item.recipe_label}
                    </AppText>
                    {item.time_in_minutes ? (
                      <AppText variant="muted">{item.time_in_minutes} min</AppText>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          )}
          <Button title="Cancel" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing[5],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
    maxHeight: '85%',
  },
  input: {
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: HitTarget.min,
    paddingVertical: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray200,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
});
