import { useAuth } from '@clerk/expo';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  ErrorState,
  LoadingState,
} from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { addFavorite, fetchFavoriteIds, removeFavorite } from '@/lib/cookbooks';
import {
  asStringList,
  fetchRecipeById,
  recipeDisplayEnergyKcal,
  softDeleteRecipe,
} from '@/lib/recipes';
import type { RecipeDetail } from '@/lib/types';

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      const result = await fetchRecipeById(supabase, id);
      if (cancelled) return;
      setRecipe(result.data);
      setError(result.error);
      if (userId && result.data) {
        const ids = await fetchFavoriteIds(supabase, userId);
        setFavorited(ids.has(result.data.id));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase, userId]);

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
  const owned = recipe?.user_id && userId && recipe.user_id === userId;

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe?.recipe_label ?? 'Recipe',
          headerRight: () =>
            recipe ? (
              <Pressable
                onPress={async () => {
                  if (!userId || !recipe) return;
                  if (!isPro && recipe.user_id !== userId) return;
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
        <ErrorState message={error ?? 'Recipe not found'} />
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
                title="Delete"
                variant="ghost"
                onPress={async () => {
                  if (!userId) return;
                  await softDeleteRecipe(supabase, userId, recipe.id);
                  router.replace('/(app)/(tabs)' as Href);
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
});
