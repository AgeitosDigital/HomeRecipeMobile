import { useAuth } from '@clerk/expo';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  AppText,
  Button,
  ErrorState,
  LoadingState,
} from '@/components/ui';
import { Colors, FontFamily, HitTarget, Radius, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import {
  addFavorite,
  addRecipeToFolder,
  createFolder,
  fetchFavoriteIds,
  fetchFolders,
  removeFavorite,
} from '@/lib/cookbooks';
import { addGroceryItems } from '@/lib/kitchen';
import {
  asStringList,
  fetchRecipeById,
  recipeDisplayEnergyKcal,
  softDeleteRecipe,
} from '@/lib/recipes';
import type { FolderRow, RecipeDetail } from '@/lib/types';

const placeholder = require('../../../../assets/brand/recipe-placeholder.png');

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const [folderModal, setFolderModal] = useState(false);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const result = await fetchRecipeById(supabase, id);
    setRecipe(result.data);
    setError(result.error);
    if (userId && result.data) {
      const ids = await fetchFavoriteIds(supabase, userId);
      setFavorited(ids.has(result.data.id));
    }
    setLoading(false);
  }, [id, supabase, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (cookingMode) {
      void activateKeepAwakeAsync('cooking');
    } else {
      void deactivateKeepAwake('cooking');
    }
    return () => {
      void deactivateKeepAwake('cooking');
    };
  }, [cookingMode]);

  const ingredients = asStringList(recipe?.ingredient_lines);
  const steps = asStringList(recipe?.steps);
  const kcal = recipe ? recipeDisplayEnergyKcal(recipe) : null;
  const owned = !!(recipe?.user_id && userId && recipe.user_id === userId);
  const canFavorite = isPro || owned;

  const openSaveToFolder = async () => {
    if (!userId) return;
    const result = await fetchFolders(supabase, userId);
    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }
    setFolders(result.data);
    setNewFolderName('');
    setFolderModal(true);
  };

  const saveToFolder = async (folderId: string) => {
    if (!recipe) return;
    setBusyAction('folder');
    const result = await addRecipeToFolder(supabase, folderId, recipe.id);
    setBusyAction(null);
    setFolderModal(false);
    if (result.error) {
      Alert.alert('Could not save', result.error);
      return;
    }
    Alert.alert('Saved', 'Recipe added to cookbook.');
  };

  const onCreateAndSave = async () => {
    if (!userId || !newFolderName.trim()) return;
    setCreatingFolder(true);
    const created = await createFolder(supabase, userId, newFolderName);
    setCreatingFolder(false);
    if (created.error || !created.data) {
      Alert.alert('Error', created.error ?? 'Could not create folder');
      return;
    }
    await saveToFolder(created.data.id);
  };

  const onAddToGrocery = async () => {
    if (!userId || !isPro) {
      Alert.alert('Pro feature', 'Upgrade to Pro to add ingredients to your grocery list.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('No ingredients', 'This recipe has no ingredient lines to add.');
      return;
    }
    setBusyAction('grocery');
    const result = await addGroceryItems(supabase, userId, ingredients);
    setBusyAction(null);
    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }
    Alert.alert(
      'Grocery list updated',
      result.added === 0
        ? 'All ingredients were already on your list.'
        : `Added ${result.added} item${result.added === 1 ? '' : 's'}.`
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe?.recipe_label ?? 'Recipe',
          headerRight: () =>
            recipe ? (
              <Pressable
                onPress={async () => {
                  if (!userId || !recipe || !canFavorite) return;
                  if (favorited) {
                    setFavorited(false);
                    await removeFavorite(supabase, userId, recipe.id);
                  } else {
                    setFavorited(true);
                    await addFavorite(supabase, userId, recipe.id);
                  }
                }}>
                <AppText style={{ color: Colors.accent, fontSize: 22, paddingHorizontal: 8 }}>
                  {favorited ? '♥' : '♡'}
                </AppText>
              </Pressable>
            ) : null,
        }}
      />
      {loading ? (
        <LoadingState />
      ) : error || !recipe ? (
        <ErrorState message={error ?? 'Recipe not found'} onRetry={reload} />
      ) : (
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[styles.content, cookingMode && styles.cooking]}>
          <Image
            source={recipe.image_url ? { uri: recipe.image_url } : placeholder}
            style={styles.hero}
            contentFit="cover"
          />
          <AppText variant="heading">{recipe.recipe_label}</AppText>
          <AppText variant="muted">
            {[
              recipe.time_in_minutes ? `${recipe.time_in_minutes} min` : null,
              kcal != null ? `${kcal} kcal` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>

          <View style={styles.actions}>
            <Button
              title={cookingMode ? 'Exit cooking mode' : 'Cooking mode'}
              variant={cookingMode ? 'secondary' : 'primary'}
              onPress={() => setCookingMode((v) => !v)}
            />
            {owned ? (
              <Button
                title="Edit"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/(app)/recipe/edit', params: { id: recipe.id } } as Href)
                }
              />
            ) : null}
            <Button
              title="Save to cookbook"
              variant="secondary"
              loading={busyAction === 'folder'}
              onPress={openSaveToFolder}
            />
            <Button
              title="Add ingredients to grocery"
              variant="secondary"
              loading={busyAction === 'grocery'}
              onPress={onAddToGrocery}
            />
            {owned ? (
              <Button
                title="Delete"
                variant="ghost"
                onPress={() => {
                  if (!userId) return;
                  Alert.alert('Delete recipe?', 'This moves the recipe to trash.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await softDeleteRecipe(supabase, userId, recipe.id);
                        router.replace('/(app)/(tabs)' as Href);
                      },
                    },
                  ]);
                }}
              />
            ) : null}
          </View>

          {ingredients.length > 0 ? (
            <View style={styles.section}>
              <AppText variant="title">Ingredients</AppText>
              {ingredients.map((line, index) => (
                <AppText
                  key={`${index}-${line}`}
                  style={[styles.line, cookingMode && styles.lineLarge]}>
                  • {line}
                </AppText>
              ))}
            </View>
          ) : null}

          {steps.length > 0 ? (
            <View style={styles.section}>
              <AppText variant="title">Steps</AppText>
              {steps.map((line, index) => (
                <AppText
                  key={`${index}-${line}`}
                  style={[styles.line, cookingMode && styles.lineLarge]}>
                  {index + 1}. {line}
                </AppText>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={folderModal}
        animationType="slide"
        transparent
        onRequestClose={() => setFolderModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFolderModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation?.()}>
            <AppText variant="title" style={{ marginBottom: Spacing[3] }}>
              Save to cookbook
            </AppText>
            {folders.map((folder) => (
              <Pressable
                key={folder.id}
                style={({ pressed }) => [styles.folderRow, pressed && { opacity: 0.85 }]}
                onPress={() => void saveToFolder(folder.id)}>
                <AppText style={{ fontFamily: FontFamily.bodyMedium }}>
                  {folder.folder_name}
                </AppText>
              </Pressable>
            ))}
            <AppText variant="label" style={{ marginTop: Spacing[3] }}>
              Or create new
            </AppText>
            <TextInput
              placeholder="Folder name"
              placeholderTextColor={Colors.gray500}
              style={styles.input}
              value={newFolderName}
              onChangeText={setNewFolderName}
            />
            <Button
              title="Create & save"
              loading={creatingFolder}
              onPress={onCreateAndSave}
              disabled={!newFolderName.trim()}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setFolderModal(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[3] },
  cooking: { backgroundColor: Colors.backgroundMuted },
  hero: {
    width: '100%',
    height: 220,
    borderRadius: Radius.xl,
    backgroundColor: Colors.gray100,
  },
  actions: { flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' },
  section: { marginTop: Spacing[3], gap: Spacing[2] },
  line: {
    color: Colors.foreground,
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  lineLarge: { fontSize: 18, lineHeight: 28 },
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
  folderRow: {
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
});
