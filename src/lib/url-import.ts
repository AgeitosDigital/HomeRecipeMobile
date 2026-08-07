import type { UrlImportedRecipe } from '@/lib/types';

function generateHashKey(inputString: string): string {
  const index = inputString.indexOf('?X-Amz-Security-Token');
  const cleanedUrl = index !== -1 ? inputString.substring(0, index) : inputString;
  let hash = 0;
  if (cleanedUrl.length === 0) return hash.toString();
  for (let i = 0; i < cleanedUrl.length; i++) {
    const char = cleanedUrl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function normalizeSourceUrlForHash(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    const host = u.hostname.toLowerCase();
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return `${u.protocol}//${host}${path}${u.search}`;
  } catch {
    return url.trim();
  }
}

function parseScrapedCaloriesString(calories: string | null): number {
  if (!calories?.trim()) return 0;
  const match = calories.match(/[\d.]+/);
  if (!match) return 0;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function urlImportInstructionSteps(imported: UrlImportedRecipe): string[] {
  if (imported.instructions_list?.length > 0) {
    return imported.instructions_list.map((s) => s.trim()).filter(Boolean);
  }
  if (imported.instructions?.trim()) {
    return imported.instructions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

export function isUrlImportSaveable(imported: UrlImportedRecipe | null): boolean {
  if (!imported) return false;
  const title = imported.title?.trim() ?? '';
  const hasIngredients = imported.ingredients.some((s) => s.trim().length > 0);
  return title.length > 0 && hasIngredients;
}

export function buildUrlImportCreateInput(imported: UrlImportedRecipe) {
  const normalized = normalizeSourceUrlForHash(imported.source_url);
  const recipe_id = `url-import-${generateHashKey(normalized)}`;
  const ingredient_lines = imported.ingredients
    .map((s) => s.trim())
    .filter(Boolean)
    .join('***');
  const stepLines = urlImportInstructionSteps(imported);
  const steps = stepLines.join('***');
  const timeRaw =
    imported.total_time_minutes ??
    imported.cooktime_minutes ??
    imported.prep_time_minutes ??
    0;
  const time = Number(timeRaw);

  return {
    recipe_id,
    recipe_label: imported.title?.trim() || 'Untitled Recipe',
    ingredient_lines,
    steps,
    time_in_minutes: Number.isFinite(time) && time >= 0 ? time : null,
    image_url: imported.image?.trim() || null,
    website_url: imported.source_url?.trim() || null,
    calories: parseScrapedCaloriesString(imported.calories),
    meal_type: imported.yields?.trim() || null,
    ingredientList: imported.ingredients.map((s) => s.trim()).filter(Boolean),
    stepList: stepLines,
  };
}
