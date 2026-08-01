import { useAuth } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ChevronRightIcon, CookbookIcon, EmptyCookbookArt } from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
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
  createFolder,
  fetchFavorites,
  fetchFolderRecipeCounts,
  fetchFolders,
} from '@/lib/cookbooks';
import type { FolderRow, RecipeListItem } from '@/lib/types';

export default function CookbooksScreen() {
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [favorites, setFavorites] = useState<RecipeListItem[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const [fav, fold] = await Promise.all([
      fetchFavorites(supabase, userId, isPro),
      fetchFolders(supabase, userId),
    ]);
    if (fav.error || fold.error) {
      setError(fav.error || fold.error);
      return;
    }
    setFavorites(fav.data);
    setFolders(fold.data);
    const nextCounts = await fetchFolderRecipeCounts(
      supabase,
      fold.data.map((f) => f.id)
    );
    setCounts(nextCounts);
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

  const onCreateFolder = async () => {
    if (!userId || !newFolder.trim()) return;
    setCreating(true);
    const result = await createFolder(supabase, userId, newFolder);
    setCreating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewFolder('');
    setModalOpen(false);
    await load();
  };

  if (loading) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        <View style={styles.pad}>
          <Skeleton height={32} width="50%" />
          <Skeleton
            height={16}
            width="70%"
            style={{ marginTop: Spacing[2], marginBottom: Spacing[5] }}
          />
          <Skeleton height={64} style={{ marginBottom: Spacing[2], borderRadius: Radius.lg }} />
          <Skeleton height={64} style={{ borderRadius: Radius.lg }} />
        </View>
      </Screen>
    );
  }
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(200)}>
          <View style={styles.pageHeader}>
            <View style={styles.iconChip}>
              <CookbookIcon size={IconSize.lg} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">Cookbooks</AppText>
              <AppText variant="muted">
                Discover, organize and save your favorite recipes.
              </AppText>
            </View>
          </View>

          <SectionHeader
            title="Your Cookbooks"
            subtitle={
              folders.length > 0
                ? `${folders.length} folder${folders.length === 1 ? '' : 's'}`
                : undefined
            }
            action={
              <Pressable
                onPress={() => setModalOpen(true)}
                style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.8 }]}
                hitSlop={8}>
                <AppText style={styles.newBtnText}>+ New</AppText>
              </Pressable>
            }
          />

          {folders.length === 0 ? (
            <EmptyState
              title="No cookbooks yet"
              message="Create a folder to organize recipes."
              illustration={<EmptyCookbookArt size={96} color={Colors.gray400} />}
              primaryAction={{
                title: 'Create cookbook',
                onPress: () => setModalOpen(true),
              }}
            />
          ) : (
            folders.map((folder) => (
              <Pressable
                key={folder.id}
                style={({ pressed }) => [styles.folderCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/(app)/cookbook/${folder.id}` as Href)}>
                <View style={styles.folderIcon}>
                  <CookbookIcon size={18} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: FontFamily.bodyBold }}>{folder.name}</AppText>
                  <AppText variant="muted">
                    {counts[folder.id] ?? 0} recipe
                    {(counts[folder.id] ?? 0) === 1 ? '' : 's'}
                  </AppText>
                </View>
                <ChevronRightIcon size={20} color={Colors.gray500} />
              </Pressable>
            ))
          )}

          {favorites.length > 0 ? (
            <View style={{ marginTop: Spacing[6] }}>
              <SectionHeader title="Liked Recipes" subtitle="Your hearted recipes" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Spacing[2] }}>
                {favorites.map((item) => (
                  <RecipeCard
                    key={item.id}
                    recipe={item}
                    favorited
                    compact
                    onPress={() => router.push(`/(app)/recipe/${item.id}` as Href)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : folders.length > 0 ? (
            <View style={{ marginTop: Spacing[6] }}>
              <SectionHeader title="Liked Recipes" />
              <AppText variant="muted">Heart recipes from Home to save them here.</AppText>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation?.()}>
            <AppText variant="title" style={{ marginBottom: Spacing[2] }}>
              New Folder
            </AppText>
            <AppText variant="muted" style={{ marginBottom: Spacing[4] }}>
              Enter folder name
            </AppText>
            <TextInput
              autoFocus
              placeholder="e.g. Weeknight dinners"
              placeholderTextColor={Colors.gray500}
              style={styles.input}
              value={newFolder}
              onChangeText={setNewFolder}
              onSubmitEditing={onCreateFolder}
            />
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setModalOpen(false);
                    setNewFolder('');
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Create" loading={creating} onPress={onCreateFolder} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing[4] },
  list: { padding: Spacing[4], paddingBottom: Spacing[12] },
  pageHeader: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtn: {
    minHeight: HitTarget.min - 8,
    paddingHorizontal: Spacing[3],
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.accentMutedBg,
  },
  newBtnText: {
    color: Colors.accent,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: HitTarget.min + 16,
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    marginBottom: Spacing[2],
    ...Shadows.soft,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentMutedBg,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: Spacing[4],
    minHeight: HitTarget.min,
  },
  modalActions: { flexDirection: 'row', gap: Spacing[2] },
});
