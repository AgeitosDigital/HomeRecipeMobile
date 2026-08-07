import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchFavorites } from '@/lib/cookbooks';
import { startOfMonth, startOfWeek } from '@/lib/dates';
import { fetchUserRecipes } from '@/lib/recipes';
import type { RecipeListItem } from '@/lib/types';

export const STAT_FILTERS = ['all', 'favorites', 'week', 'imported'] as const;
export type StatFilter = (typeof STAT_FILTERS)[number];

export function parseStatFilter(value: string | string[] | undefined): StatFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (STAT_FILTERS as readonly string[]).includes(raw)) {
    return raw as StatFilter;
  }
  return 'all';
}

type EmptyCopy = {
  title: string;
  message: string;
  primary: { title: string; action: 'create' | 'import' | 'browse-all' };
  secondary?: { title: string; action: 'create' | 'import' };
};

type FilterMeta = {
  title: string;
  accessibilityHint: string;
  homeCaption: (count: number) => string;
  empty: EmptyCopy;
  headerAction?: { title: string; action: 'create' | 'import' };
};

export const STAT_FILTER_META: Record<StatFilter, FilterMeta> = {
  all: {
    title: 'All Recipes',
    accessibilityHint: 'Shows all your recipes',
    homeCaption: (count) => (count === 0 ? 'Start building your cookbook' : 'View all recipes'),
    empty: {
      title: 'No recipes yet',
      message: 'Create one or import from a URL.',
      primary: { title: 'Create recipe', action: 'create' },
      secondary: { title: 'Import', action: 'import' },
    },
    headerAction: { title: 'Create', action: 'create' },
  },
  favorites: {
    title: 'Favorites',
    accessibilityHint: 'Shows your favorite recipes',
    homeCaption: (count) => (count === 0 ? 'No favorites yet' : 'View your favorites'),
    empty: {
      title: 'No favorites yet',
      message: 'Heart a recipe from Home or Cookbooks to see it here.',
      primary: { title: 'Browse recipes', action: 'browse-all' },
    },
  },
  week: {
    title: 'Recipes This Week',
    accessibilityHint: 'Shows recipes you added this week',
    homeCaption: () => "View this week's recipes",
    empty: {
      title: 'Nothing added this week',
      message: 'Recipes you create or import this week show up here.',
      primary: { title: 'Create recipe', action: 'create' },
      secondary: { title: 'Import', action: 'import' },
    },
    headerAction: { title: 'Create', action: 'create' },
  },
  imported: {
    title: 'Imported This Month',
    accessibilityHint: 'Shows recipes you imported this month',
    homeCaption: (count) => (count === 0 ? 'No imports yet' : 'View imports'),
    empty: {
      title: 'No imports this month',
      message: "Paste a recipe URL and we'll do the rest.",
      primary: { title: 'Import a recipe', action: 'import' },
    },
    headerAction: { title: 'Import', action: 'import' },
  },
};

export function isCreatedThisWeek(recipe: RecipeListItem, weekStart = startOfWeek()): boolean {
  const created = recipe.created_at ? new Date(recipe.created_at).getTime() : NaN;
  return Number.isFinite(created) && created >= weekStart.getTime();
}

export function isImportedThisMonth(
  recipe: RecipeListItem,
  monthStart = startOfMonth()
): boolean {
  if (!recipe.website_url) return false;
  const created = recipe.created_at ? new Date(recipe.created_at).getTime() : NaN;
  return Number.isFinite(created) && created >= monthStart.getTime();
}

export function computeOwnedStats(ownedRecipes: RecipeListItem[]) {
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  let recipesThisWeek = 0;
  let importedThisMonth = 0;
  for (const r of ownedRecipes) {
    if (isCreatedThisWeek(r, weekStart)) recipesThisWeek += 1;
    if (isImportedThisMonth(r, monthStart)) importedThisMonth += 1;
  }
  return {
    total: ownedRecipes.length,
    recipesThisWeek,
    importedThisMonth,
  };
}

export function subtitleForFilter(filter: StatFilter, count: number): string {
  switch (filter) {
    case 'all':
      return `${count} recipe${count === 1 ? '' : 's'} in your library`;
    case 'favorites':
      return `${count} liked recipe${count === 1 ? '' : 's'}`;
    case 'week': {
      const since = startOfWeek().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      return `Added since ${since}`;
    }
    case 'imported': {
      const month = startOfMonth().toLocaleDateString(undefined, { month: 'long' });
      return `URL imports in ${month}`;
    }
  }
}

function sortByCreatedDesc(recipes: RecipeListItem[]) {
  return [...recipes].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

export async function loadRecipesForFilter(
  supabase: SupabaseClient,
  userId: string,
  isPro: boolean,
  filter: StatFilter
): Promise<{ data: RecipeListItem[]; error: string | null }> {
  if (filter === 'favorites') {
    const result = await fetchFavorites(supabase, userId, isPro);
    if (result.error) return result;
    return { data: sortByCreatedDesc(result.data), error: null };
  }

  const owned = await fetchUserRecipes(supabase, userId);
  if (owned.error) return owned;

  if (filter === 'all') {
    return { data: owned.data, error: null };
  }

  if (filter === 'week') {
    const weekStart = startOfWeek();
    return {
      data: owned.data.filter((r) => isCreatedThisWeek(r, weekStart)),
      error: null,
    };
  }

  const monthStart = startOfMonth();
  return {
    data: owned.data.filter((r) => isImportedThisMonth(r, monthStart)),
    error: null,
  };
}
