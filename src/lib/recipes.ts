import type { SupabaseClient } from '@supabase/supabase-js';

import { isOwnNonExpired } from '@/lib/entitlements';
import type { RecipeDetail, RecipeListItem } from '@/lib/types';

export const RECIPE_LIST_COLUMNS =
  'id, recipe_id, recipe_label, calories, cuisine_type, meal_type, time_in_minutes, image_url, website_url, user_id, created_at, deleted_at, expires_at, recipe_nutrition(energy_kcal, nutrition_source)' as const;

export const RECIPE_DETAIL_COLUMNS =
  'id, recipe_id, recipe_label, calories, cuisine_type, meal_type, time_in_minutes, image_url, website_url, user_id, deleted_at, expires_at, ingredient_lines, steps, recipe_nutrition(energy_kcal, protein_g, fat_g, carb_g, nutrition_source, servings)' as const;

export function asStringList(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(/\*\*\*|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function recipeDisplayEnergyKcal(row: RecipeListItem | RecipeDetail): number | null {
  const raw = row.recipe_nutrition;
  const n = Array.isArray(raw) ? raw[0] : raw;
  if (n && typeof n === 'object' && n.energy_kcal != null) {
    const k = Number(n.energy_kcal);
    if (Number.isFinite(k)) return Math.round(k);
  }
  if (row.calories != null && Number.isFinite(Number(row.calories))) {
    return Math.round(Number(row.calories));
  }
  return null;
}

export async function fetchUserRecipes(
  supabase: SupabaseClient,
  userId: string,
  options?: { sort?: 'recent' | 'label' }
): Promise<{ data: RecipeListItem[]; error: string | null }> {
  const sort = options?.sort ?? 'recent';
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_LIST_COLUMNS)
    .is('deleted_at', null)
    .eq('user_id', userId)
    .order(sort === 'label' ? 'recipe_label' : 'created_at', {
      ascending: sort === 'label',
    })
    .limit(100);

  if (error) return { data: [], error: error.message };
  const rows = ((data ?? []) as RecipeListItem[]).filter((r) => isOwnNonExpired(r, userId));
  return { data: rows, error: null };
}

export async function fetchSharedRecipes(
  supabase: SupabaseClient
): Promise<{ data: RecipeListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_LIST_COLUMNS)
    .is('deleted_at', null)
    .is('user_id', null)
    .order('recipe_label', { ascending: true })
    .limit(40);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as RecipeListItem[], error: null };
}

export async function searchRecipes(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  isPro: boolean
): Promise<{ data: RecipeListItem[]; error: string | null }> {
  const pattern = `%${query.trim().replace(/%/g, '\\%')}%`;
  if (!query.trim()) return { data: [], error: null };

  let q = supabase
    .from('recipes')
    .select(RECIPE_LIST_COLUMNS)
    .is('deleted_at', null)
    .ilike('recipe_label', pattern)
    .limit(50);

  if (!isPro) {
    q = q.eq('user_id', userId);
  }

  const { data, error } = await q;
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []) as RecipeListItem[];
  if (isPro) return { data: rows, error: null };
  return {
    data: rows.filter((r) => isOwnNonExpired(r, userId)),
    error: null,
  };
}

export async function fetchRecipeById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: RecipeDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_DETAIL_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as RecipeDetail, error: null };
}

export async function createRecipe(
  supabase: SupabaseClient,
  userId: string,
  input: {
    recipe_label: string;
    ingredient_lines: string;
    steps: string;
    time_in_minutes?: number | null;
    image_url?: string | null;
    website_url?: string | null;
    calories?: number | null;
    meal_type?: string | null;
    recipe_id?: string;
    isPro: boolean;
  }
): Promise<{ data: RecipeDetail | null; error: string | null }> {
  const recipeId =
    input.recipe_id?.trim() ||
    `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = input.isPro
    ? null
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      recipe_id: recipeId,
      recipe_label: input.recipe_label.trim(),
      ingredient_lines: input.ingredient_lines,
      steps: input.steps,
      time_in_minutes: input.time_in_minutes ?? null,
      image_url: input.image_url?.trim() || null,
      website_url: input.website_url?.trim() || null,
      calories: input.calories ?? 0,
      meal_type: input.meal_type ?? null,
      user_id: userId,
      expires_at: expiresAt,
    })
    .select(RECIPE_DETAIL_COLUMNS)
    .single();

  if (error) {
    // Re-import of same URL: return the existing owned row when possible.
    if (input.recipe_id && (error.code === '23505' || /duplicate|unique/i.test(error.message))) {
      const existing = await supabase
        .from('recipes')
        .select(RECIPE_DETAIL_COLUMNS)
        .eq('recipe_id', recipeId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (existing.data) {
        const updated = await supabase
          .from('recipes')
          .update({
            recipe_label: input.recipe_label.trim(),
            ingredient_lines: input.ingredient_lines,
            steps: input.steps,
            time_in_minutes: input.time_in_minutes ?? null,
            image_url: input.image_url?.trim() || null,
            website_url: input.website_url?.trim() || null,
            calories: input.calories ?? 0,
            meal_type: input.meal_type ?? null,
            expires_at: expiresAt,
          })
          .eq('id', (existing.data as RecipeDetail).id)
          .eq('user_id', userId)
          .select(RECIPE_DETAIL_COLUMNS)
          .single();
        if (updated.error) return { data: null, error: updated.error.message };
        return { data: updated.data as RecipeDetail, error: null };
      }
    }
    return { data: null, error: error.message };
  }
  return { data: data as RecipeDetail, error: null };
}

export async function updateRecipe(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: {
    recipe_label: string;
    ingredient_lines: string;
    steps: string;
    time_in_minutes?: number | null;
    image_url?: string | null;
  }
): Promise<{ data: RecipeDetail | null; error: string | null }> {
  const patch: Record<string, unknown> = {
    recipe_label: input.recipe_label.trim(),
    ingredient_lines: input.ingredient_lines,
    steps: input.steps,
    time_in_minutes: input.time_in_minutes ?? null,
  };
  if (input.image_url !== undefined) {
    patch.image_url = input.image_url?.trim() || null;
  }

  const { data, error } = await supabase
    .from('recipes')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select(RECIPE_DETAIL_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as RecipeDetail, error: null };
}

export async function softDeleteRecipe(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('recipes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null);

  return { error: error?.message ?? null };
}
