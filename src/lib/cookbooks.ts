import type { SupabaseClient } from '@supabase/supabase-js';

import { isOwnNonExpired } from '@/lib/entitlements';
import { RECIPE_LIST_COLUMNS } from '@/lib/recipes';
import type { FolderRow, RecipeListItem } from '@/lib/types';

const FOLDER_COLUMNS = 'id, folder_name, user_id, cover_image_url, deleted_at, created_at';
const TRASH_RETENTION_DAYS = 7;

export async function fetchFavorites(
  supabase: SupabaseClient,
  userId: string,
  isPro: boolean
): Promise<{ data: RecipeListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`recipe_id, recipes (${RECIPE_LIST_COLUMNS})`)
    .eq('user_id', userId);

  if (error) return { data: [], error: error.message };

  const recipes = (data ?? [])
    .map((row: { recipes: unknown }) => row.recipes)
    .filter((r): r is RecipeListItem => {
      if (r == null || typeof r !== 'object') return false;
      const row = r as RecipeListItem;
      if (row.deleted_at != null) return false;
      if (isPro) return true;
      return isOwnNonExpired(row, userId);
    });

  return { data: recipes, error: null };
}

export async function fetchFavoriteIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('user_id', userId);
  return new Set((data ?? []).map((r: { recipe_id: string }) => r.recipe_id));
}

export async function addFavorite(
  supabase: SupabaseClient,
  userId: string,
  recipeUuid: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('favorites').insert({
    user_id: userId,
    recipe_id: recipeUuid,
  });
  if (error && error.code !== '23505') return { error: error.message };
  return { error: null };
}

export async function removeFavorite(
  supabase: SupabaseClient,
  userId: string,
  recipeUuid: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeUuid);
  return { error: error?.message ?? null };
}

export async function fetchFolders(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: FolderRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('folder_name', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as FolderRow[], error: null };
}

export async function fetchTrashedFolders(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: FolderRow[]; error: string | null }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRASH_RETENTION_DAYS);

  const { data, error } = await supabase
    .from('folders')
    .select(FOLDER_COLUMNS)
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .gte('deleted_at', cutoff.toISOString())
    .order('deleted_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as FolderRow[], error: null };
}

export async function fetchFolderRecipes(
  supabase: SupabaseClient,
  folderId: string,
  userId: string,
  isPro: boolean
): Promise<{ data: RecipeListItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('folder_recipes')
    .select(`folder_id, recipes (${RECIPE_LIST_COLUMNS})`)
    .eq('folder_id', folderId);

  if (error) return { data: [], error: error.message };

  const recipes = (data ?? [])
    .map((row: { recipes: unknown }) => row.recipes)
    .filter((r): r is RecipeListItem => {
      if (r == null || typeof r !== 'object') return false;
      const row = r as RecipeListItem;
      if (row.deleted_at != null) return false;
      if (isPro) return true;
      return isOwnNonExpired(row, userId);
    });

  return { data: recipes, error: null };
}

export async function fetchFolderRecipeCounts(
  supabase: SupabaseClient,
  folderIds: string[]
): Promise<Record<string, number>> {
  if (folderIds.length === 0) return {};
  const { data } = await supabase
    .from('folder_recipes')
    .select('folder_id')
    .in('folder_id', folderIds);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { folder_id: string }).folder_id;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function createFolder(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<{ data: FolderRow | null; error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) return { data: null, error: 'Name required' };
  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: userId, folder_name: trimmed })
    .select(FOLDER_COLUMNS)
    .single();
  if (error) {
    if (error.code === '23505') return { data: null, error: 'Folder name already exists' };
    return { data: null, error: error.message };
  }
  return { data: data as FolderRow, error: null };
}

export async function renameFolder(
  supabase: SupabaseClient,
  userId: string,
  folderId: string,
  newName: string
): Promise<{ error: string | null }> {
  const trimmed = newName.trim();
  if (!trimmed) return { error: 'Name required' };
  const { error } = await supabase
    .from('folders')
    .update({ folder_name: trimmed })
    .eq('id', folderId)
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (error) {
    if (error.code === '23505') return { error: 'Folder name already exists' };
    return { error: error.message };
  }
  return { error: null };
}

export async function softDeleteFolder(
  supabase: SupabaseClient,
  userId: string,
  folderId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('folders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', folderId)
    .eq('user_id', userId)
    .is('deleted_at', null);
  return { error: error?.message ?? null };
}

export async function restoreFolder(
  supabase: SupabaseClient,
  userId: string,
  folderId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('folders')
    .update({ deleted_at: null })
    .eq('id', folderId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

export async function addRecipeToFolder(
  supabase: SupabaseClient,
  folderId: string,
  recipeUuid: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('folder_recipes').insert({
    folder_id: folderId,
    recipe_id: recipeUuid,
  });
  if (error) {
    if (error.code === '23505') return { error: 'Recipe already in folder' };
    return { error: error.message };
  }
  return { error: null };
}

export async function removeRecipeFromFolder(
  supabase: SupabaseClient,
  folderId: string,
  recipeUuid: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('folder_recipes')
    .delete()
    .eq('folder_id', folderId)
    .eq('recipe_id', recipeUuid);
  return { error: error?.message ?? null };
}
