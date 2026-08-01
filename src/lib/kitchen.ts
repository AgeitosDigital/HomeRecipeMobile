import type { SupabaseClient } from '@supabase/supabase-js';

import { RECIPE_LIST_COLUMNS } from '@/lib/recipes';
import type { GroceryItem, RecipeListItem } from '@/lib/types';

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
  itemText: string
): Promise<{ error: string | null }> {
  const trimmed = itemText.trim();
  if (!trimmed) return { error: 'Item cannot be empty' };
  const { error } = await supabase.from('grocery_items').insert({
    user_id: userId,
    item_text: trimmed,
    checked: false,
  });
  return { error: error?.message ?? null };
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
  meal_date: string;
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
    .select('id, meal_date, user_id')
    .eq('user_id', userId)
    .gte('meal_date', startStr)
    .lte('meal_date', endStr)
    .order('meal_date', { ascending: true });

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
    data: dates.map((d: { id: string; meal_date: string }) => ({
      id: d.id,
      meal_date: d.meal_date,
      recipes: byDate.get(d.id) ?? [],
    })),
    error: null,
  };
}
