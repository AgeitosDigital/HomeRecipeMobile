import * as Crypto from 'expo-crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { RECIPE_LIST_COLUMNS } from '@/lib/recipes';
import type { GroceryCategory, GroceryItem, RecipeListItem } from '@/lib/types';

export async function fetchGroceryItems(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: GroceryItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('grocery_items')
    .select('id, item_text, checked, created_at, category')
    .eq('user_id', userId)
    .order('checked', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (/category/i.test(error.message)) {
      const fallback = await supabase
        .from('grocery_items')
        .select('id, item_text, checked, created_at')
        .eq('user_id', userId)
        .order('checked', { ascending: true })
        .order('created_at', { ascending: true });
      if (fallback.error) return { data: [], error: fallback.error.message };
      return { data: (fallback.data ?? []) as GroceryItem[], error: null };
    }
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as GroceryItem[], error: null };
}

export async function addGroceryItem(
  supabase: SupabaseClient,
  userId: string,
  itemText: string,
  category?: GroceryCategory | null
): Promise<{ error: string | null; duplicate?: boolean }> {
  const trimmed = itemText.trim();
  if (!trimmed) return { error: 'Item cannot be empty' };

  const { data: existing } = await supabase
    .from('grocery_items')
    .select('id')
    .eq('user_id', userId)
    .ilike('item_text', trimmed)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: null, duplicate: true };
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    item_text: trimmed,
    checked: false,
  };
  if (category) row.category = category;

  const { error } = await supabase.from('grocery_items').insert(row);
  return { error: error?.message ?? null };
}

export async function addGroceryItems(
  supabase: SupabaseClient,
  userId: string,
  itemTexts: string[]
): Promise<{ added: number; error: string | null }> {
  const cleaned = itemTexts.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) return { added: 0, error: null };

  const { data: existing, error: existingError } = await supabase
    .from('grocery_items')
    .select('item_text')
    .eq('user_id', userId);

  if (existingError) return { added: 0, error: existingError.message };

  const existingSet = new Set(
    (existing ?? []).map((r: { item_text: string }) => r.item_text.trim().toLowerCase())
  );

  const toInsert: { user_id: string; item_text: string; checked: boolean }[] = [];
  const seen = new Set<string>();
  for (const text of cleaned) {
    const key = text.toLowerCase();
    if (existingSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    toInsert.push({ user_id: userId, item_text: text, checked: false });
  }

  if (toInsert.length === 0) return { added: 0, error: null };

  const { error } = await supabase.from('grocery_items').insert(toInsert);
  if (error) return { added: 0, error: error.message };
  return { added: toInsert.length, error: null };
}

export async function toggleGroceryItem(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  checked: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('grocery_items')
    .update({ checked })
    .eq('id', id)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function setAllGroceryItemsChecked(
  supabase: SupabaseClient,
  userId: string,
  checked: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('grocery_items')
    .update({ checked })
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function deleteGroceryItem(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function clearCheckedGroceryItems(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('user_id', userId)
    .eq('checked', true);
  return { error: error?.message ?? null };
}

export type MealPlanDay = {
  id: string;
  date: string;
  event_id: string;
  recipes: RecipeListItem[];
};

export async function fetchMealPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: MealPlanDay[]; error: string | null }> {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const end = new Date();
  end.setMonth(end.getMonth() + 2);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data: dates, error } = await supabase
    .from('meal_dates')
    .select('id, date, event_id, user_id')
    .eq('user_id', userId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: true });

  if (error) return { data: [], error: error.message };
  if (!dates?.length) return { data: [], error: null };

  const ids = dates.map((d: { id: string }) => d.id);
  const { data: links, error: linkError } = await supabase
    .from('meal_date_recipes')
    .select(`meal_date_id, recipes (${RECIPE_LIST_COLUMNS})`)
    .in('meal_date_id', ids);

  if (linkError) return { data: [], error: linkError.message };

  const byDate = new Map<string, RecipeListItem[]>();
  for (const link of links ?? []) {
    const row = link as unknown as {
      meal_date_id: string;
      recipes: RecipeListItem | RecipeListItem[] | null;
    };
    const recipe = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes;
    if (!recipe || recipe.deleted_at) continue;
    const list = byDate.get(row.meal_date_id) ?? [];
    list.push(recipe);
    byDate.set(row.meal_date_id, list);
  }

  return {
    data: dates.map((d: { id: string; date: string; event_id: string }) => ({
      id: d.id,
      date: d.date,
      event_id: d.event_id,
      recipes: byDate.get(d.id) ?? [],
    })),
    error: null,
  };
}

/**
 * Upsert a meal by client-generated event_id (mirrors web createOrUpdateMealDate).
 * recipePublicId = recipes.recipe_id (public string), not the UUID pk.
 */
export async function createOrUpdateMealDate(
  supabase: SupabaseClient,
  userId: string,
  params: {
    date: string;
    recipePublicId: string;
    eventId?: string;
  }
): Promise<{ eventId: string; error: string | null }> {
  const eventId = params.eventId ?? Crypto.randomUUID();

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('id, deleted_at')
    .eq('recipe_id', params.recipePublicId)
    .is('deleted_at', null)
    .maybeSingle();

  if (recipeError) return { eventId, error: recipeError.message };
  if (!recipe) return { eventId, error: 'Recipe not found' };

  const { data: existing } = await supabase
    .from('meal_dates')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  let mealDateId: string;

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('meal_dates')
      .update({ date: params.date })
      .eq('id', existing.id)
      .eq('user_id', userId);
    if (updateError) return { eventId, error: updateError.message };
    mealDateId = existing.id;

    await supabase.from('meal_date_recipes').delete().eq('meal_date_id', mealDateId);
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('meal_dates')
      .insert({
        user_id: userId,
        event_id: eventId,
        date: params.date,
      })
      .select('id')
      .single();
    if (insertError) return { eventId, error: insertError.message };
    mealDateId = inserted.id;
  }

  const { error: linkError } = await supabase.from('meal_date_recipes').insert({
    meal_date_id: mealDateId,
    recipe_id: recipe.id,
  });
  if (linkError) return { eventId, error: linkError.message };

  return { eventId, error: null };
}

export async function deleteMealDate(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<{ error: string | null }> {
  const { data: meal, error: findError } = await supabase
    .from('meal_dates')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (findError) return { error: findError.message };
  if (!meal) return { error: null };

  await supabase.from('meal_date_recipes').delete().eq('meal_date_id', meal.id);
  const { error } = await supabase
    .from('meal_dates')
    .delete()
    .eq('id', meal.id)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
