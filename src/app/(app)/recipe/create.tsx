import { useAuth } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import {
  RecipeEditorForm,
  type RecipeEditorValues,
} from '@/components/recipe-editor-form';
import { Screen } from '@/components/ui';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { createRecipe } from '@/lib/recipes';
import { useWebApi } from '@/lib/web-api';

export default function CreateRecipeScreen() {
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const { uploadRecipeCover } = useWebApi();
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSave = async (values: RecipeEditorValues) => {
    if (!userId) return;
    setBusy(true);
    setError(null);

    let imageUrl: string | null = null;
    if (values.imageNeedsUpload && values.imageUri) {
      const uploaded = await uploadRecipeCover({
        uri: values.imageUri,
        mimeType: values.localImageMimeType ?? 'image/jpeg',
        fileName: values.localImageFileName ?? 'recipe.jpg',
        recipeLabel: values.label,
      });
      if (uploaded.error || !uploaded.url) {
        setBusy(false);
        setError(uploaded.error ?? 'Could not upload photo');
        return;
      }
      imageUrl = uploaded.url;
    } else if (values.imageUri && !values.imageNeedsUpload) {
      imageUrl = values.imageUri;
    }

    const ingredient_lines = values.ingredientLines
      .map((s) => s.trim())
      .filter(Boolean)
      .join('***');
    const steps = values.stepLines
      .map((s) => s.trim())
      .filter(Boolean)
      .join('***');

    const result = await createRecipe(supabase, userId, {
      recipe_label: values.label,
      ingredient_lines,
      steps,
      time_in_minutes: Number(values.minutes),
      image_url: imageUrl,
      isPro,
    });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error ?? 'Could not create recipe');
      return;
    }
    router.replace(`/(app)/recipe/${result.data.id}` as Href);
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <RecipeEditorForm
        freeTierNote={!isPro}
        busy={busy}
        error={error}
        submitLabel="Save recipe"
        onSubmit={(values) => void onSave(values)}
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
