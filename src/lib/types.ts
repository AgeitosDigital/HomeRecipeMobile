export type RecipeListItem = {
  id: string;
  recipe_id: string;
  recipe_label: string;
  calories: number | null;
  cuisine_type: string[] | string | null;
  meal_type: string[] | string | null;
  time_in_minutes: number | null;
  image_url: string | null;
  website_url: string | null;
  user_id: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
  expires_at?: string | null;
  recipe_nutrition?:
    | { energy_kcal: number | null; nutrition_source?: string | null }
    | { energy_kcal: number | null; nutrition_source?: string | null }[]
    | null;
};

export type RecipeDetail = RecipeListItem & {
  ingredient_lines: string[] | string | null;
  steps: string[] | string | null;
  recipe_nutrition?:
    | {
        energy_kcal: number | null;
        protein_g: number | null;
        fat_g: number | null;
        carb_g: number | null;
        nutrition_source: string | null;
        servings: number | null;
      }
    | {
        energy_kcal: number | null;
        protein_g: number | null;
        fat_g: number | null;
        carb_g: number | null;
        nutrition_source: string | null;
        servings: number | null;
      }[]
    | null;
};

export type FolderRow = {
  id: string;
  folder_name: string;
  user_id: string;
  cover_image_url?: string | null;
  deleted_at?: string | null;
  created_at?: string;
};

export type GroceryItem = {
  id: string;
  item_text: string;
  checked: boolean;
  created_at?: string;
  category?: string | null;
};

export type GroceryCategory = 'produce' | 'dairy' | 'pantry' | 'condiments';

export type MealDateRow = {
  id: string;
  date: string;
  event_id: string;
  user_id: string;
};

/** JSON returned by the static URL recipe import service (`/api/recipes/import-url`) */
export type UrlImportedRecipe = {
  source_url: string;
  title: string | null;
  image: string | null;
  ingredients: string[];
  instructions: string | null;
  instructions_list: string[];
  cooktime_minutes: number | null;
  prep_time_minutes: number | null;
  total_time_minutes: number | null;
  calories: string | null;
  yields: string | null;
};
