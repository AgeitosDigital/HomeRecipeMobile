import { useAuth } from '@clerk/expo';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  RecipeEditorForm,
  type RecipeEditorValues,
} from '@/components/recipe-editor-form';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useSupabase } from '@/hooks/use-supabase';
import { asStringList, fetchRecipeById, updateRecipe } from '@/lib/recipes';
import { useWebApi } from '@/lib/web-api';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const supabase = useSupabase();
  const { uploadRecipeCover } = useWebApi();
  const router = useRouter();

  const [initial, setInitial] = useState<Partial<RecipeEditorValues> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id || !userId) return;
      setLoading(true);
      const result = await fetchRecipeById(supabase, id);
      if (cancelled) return;
      if (result.error || !result.data) {
        setLoadError(result.error ?? 'Recipe not found');
        setLoading(false);
        return;
      }
      if (result.data.user_id !== userId) {
        setLoadError('You can only edit your own recipes');
        setLoading(false);
        return;
      }
      setInitial({
        label: result.data.recipe_label,
        ingredientLines: asStringList(result.data.ingredient_lines),
        stepLines: asStringList(result.data.steps),
        minutes:
          result.data.time_in_minutes != null
            ? String(result.data.time_in_minutes)
            : '',
        imageUri: result.data.image_url,
        imageNeedsUpload: false,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase, userId]);

  const onSave = async (values: RecipeEditorValues) => {
    if (!userId || !id) return;
    setBusy(true);
    setError(null);

    let imageUrl: string | null | undefined = undefined;
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
    } else if (values.imageUri === null) {
      imageUrl = null;
    }

    const ingredient_lines = values.ingredientLines
      .map((s) => s.trim())
      .filter(Boolean)
      .join('***');
    const stepLines = values.stepLines
      .map((s) => s.trim())
      .filter(Boolean)
      .join('***');

    const result = await updateRecipe(supabase, userId, id, {
      recipe_label: values.label,
      ingredient_lines,
      steps: stepLines,
      time_in_minutes: Number(values.minutes),
      image_url: imageUrl,
    });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error ?? 'Could not save recipe');
      return;
    }
    router.replace(`/(app)/recipe/${result.data.id}` as Href);
  };

  if (loading) return <LoadingState />;
  if (loadError || !initial) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit recipe' }} />
        <ErrorState message={loadError ?? 'Recipe not found'} onRetry={() => router.back()} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit recipe' }} />
      <Screen edges={['left', 'right', 'bottom']}>
        <RecipeEditorForm
          initial={initial}
          busy={busy}
          error={error}
          submitLabel="Save changes"
          onSubmit={(values) => void onSave(values)}
          onCancel={() => router.back()}
        />
      </Screen>
    </>
  );
}
