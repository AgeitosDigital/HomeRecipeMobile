import { useAuth } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ChevronRightIcon, CookbookIcon, EmptyCookbookArt } from '@/components/icons';
import { RecipeCard } from '@/components/recipe-card';
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  SectionHeader,
  Skeleton,
  Surface,
} from '@/components/ui';
import {
  Colors,
  FontFamily,
  HitTarget,
  IconSize,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import {
  createFolder,
  fetchFavorites,
  fetchFolderRecipeCounts,
  fetchFolders,
  fetchTrashedFolders,
  removeFavorite,
  renameFolder,
  restoreFolder,
  softDeleteFolder,
} from '@/lib/cookbooks';
import type { FolderRow, RecipeListItem } from '@/lib/types';

export default function CookbooksScreen() {
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [favorites, setFavorites] = useState<RecipeListItem[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [trashed, setTrashed] = useState<FolderRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FolderRow | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    const [fav, fold, trash] = await Promise.all([
      fetchFavorites(supabase, userId, isPro),
      fetchFolders(supabase, userId),
      fetchTrashedFolders(supabase, userId),
    ]);
    if (fav.error || fold.error || trash.error) {
      setError(fav.error || fold.error || trash.error);
      return;
    }
    setFavorites(fav.data);
    setFolders(fold.data);
    setTrashed(trash.data);
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
      Alert.alert('Error', result.error);
      return;
    }
    setNewFolder('');
    setModalOpen(false);
    await load();
  };

  const onRename = async () => {
    if (!userId || !renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    const result = await renameFolder(supabase, userId, renameTarget.id, renameValue);
    setRenaming(false);
    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }
    setRenameTarget(null);
    setRenameValue('');
    await load();
  };

  const onFolderLongPress = (folder: FolderRow) => {
    if (!userId) return;
    Alert.alert(folder.folder_name, 'Manage cookbook', [
      {
        text: 'Rename',
        onPress: () => {
          setRenameTarget(folder);
          setRenameValue(folder.folder_name);
        },
      },
      {
        text: 'Move to trash',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete cookbook?', `Move “${folder.folder_name}” to trash?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Trash',
              style: 'destructive',
              onPress: async () => {
                const result = await softDeleteFolder(supabase, userId, folder.id);
                if (result.error) Alert.alert('Error', result.error);
                else await load();
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
          <Skeleton height={72} style={{ marginBottom: Spacing[2], borderRadius: Radius['2xl'] }} />
          <Skeleton height={72} style={{ borderRadius: Radius['2xl'] }} />
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
        <PageHeader
          icon={<CookbookIcon size={IconSize.lg} color={Colors.accent} />}
          title="Cookbooks"
          subtitle="Discover, organize and save your favorite recipes. Long-press a folder to rename or trash."
        />

        <SectionHeader
          dense
          title="Your Cookbooks"
          subtitle={
            folders.length > 0
              ? `${folders.length} folder${folders.length === 1 ? '' : 's'}`
              : undefined
          }
          action={
            <Button title="+ New" variant="soft" compact onPress={() => setModalOpen(true)} />
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
              style={({ pressed }) => pressed && { opacity: 0.9 }}
              onPress={() => router.push(`/(app)/cookbook/${folder.id}` as Href)}
              onLongPress={() => onFolderLongPress(folder)}>
              <Surface style={styles.folderCard} padded={false}>
                <View style={styles.folderInner}>
                  <View style={styles.folderIcon}>
                    <CookbookIcon size={18} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontFamily: FontFamily.bodyBold }}>
                      {folder.folder_name}
                    </AppText>
                    <AppText variant="muted">
                      {counts[folder.id] ?? 0} recipe
                      {(counts[folder.id] ?? 0) === 1 ? '' : 's'}
                    </AppText>
                  </View>
                  <ChevronRightIcon size={20} color={Colors.gray500} />
                </View>
              </Surface>
            </Pressable>
          ))
        )}

        {trashed.length > 0 ? (
          <View style={{ marginTop: Spacing[6] }}>
            <SectionHeader dense title="Trash" subtitle="Restorable for 7 days" />
            {trashed.map((folder) => (
              <Surface key={folder.id} style={styles.folderCard} padded={false}>
                <View style={styles.folderInner}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontFamily: FontFamily.bodyBold }}>
                      {folder.folder_name}
                    </AppText>
                    <AppText variant="muted">In trash</AppText>
                  </View>
                  <Button
                    title="Restore"
                    variant="soft"
                    compact
                    onPress={async () => {
                      if (!userId) return;
                      const result = await restoreFolder(supabase, userId, folder.id);
                      if (result.error) Alert.alert('Error', result.error);
                      else await load();
                    }}
                  />
                </View>
              </Surface>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: Spacing[6] }}>
          <SectionHeader dense title="Liked Recipes" subtitle="Your hearted recipes" />
          {favorites.length > 0 ? (
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
                  onToggleFavorite={() => {
                    if (!userId) return;
                    setFavorites((prev) => prev.filter((r) => r.id !== item.id));
                    void removeFavorite(supabase, userId, item.id).then((result) => {
                      if (result.error) {
                        void load();
                      }
                    });
                  }}
                />
              ))}
            </ScrollView>
          ) : (
            <EmptyState
              title="No liked recipes yet"
              message="Heart recipes from Home to save them here."
            />
          )}
        </View>
      </ScrollView>

      <NameModal
        visible={modalOpen}
        title="New Folder"
        subtitle="Enter folder name"
        placeholder="e.g. Weeknight dinners"
        value={newFolder}
        onChangeText={setNewFolder}
        loading={creating}
        confirmLabel="Create"
        onClose={() => {
          setModalOpen(false);
          setNewFolder('');
        }}
        onConfirm={onCreateFolder}
      />

      <NameModal
        visible={renameTarget != null}
        title="Rename cookbook"
        subtitle="Enter a new name"
        placeholder="Folder name"
        value={renameValue}
        onChangeText={setRenameValue}
        loading={renaming}
        confirmLabel="Save"
        onClose={() => {
          setRenameTarget(null);
          setRenameValue('');
        }}
        onConfirm={onRename}
      />
    </Screen>
  );
}

function NameModal({
  visible,
  title,
  subtitle,
  placeholder,
  value,
  onChangeText,
  loading,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  loading: boolean;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation?.()}>
          <AppText variant="title" style={{ marginBottom: Spacing[2] }}>
            {title}
          </AppText>
          <AppText variant="muted" style={{ marginBottom: Spacing[4] }}>
            {subtitle}
          </AppText>
          <TextInput
            autoFocus
            placeholder={placeholder}
            placeholderTextColor={Colors.gray500}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onConfirm}
          />
          <View style={styles.modalActions}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="secondary" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={confirmLabel} loading={loading} onPress={onConfirm} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pad: { padding: Spacing[4] },
  list: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[2] },
  folderCard: {
    marginBottom: Spacing[2],
  },
  folderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: HitTarget.min + 16,
    padding: Spacing[4],
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
