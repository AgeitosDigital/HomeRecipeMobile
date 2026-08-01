import { useAuth } from '@clerk/expo';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, ErrorState, LoadingState, Screen } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useSupabase } from '@/hooks/use-supabase';
import { asStringList, fetchRecipeById, updateRecipe } from '@/lib/recipes';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();

  const [label, setLabel] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [minutes, setMinutes] = useState('');
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
      setLabel(result.data.recipe_label);
      setIngredients(asStringList(result.data.ingredient_lines).join('\n'));
      setSteps(asStringList(result.data.steps).join('\n'));
      setMinutes(
        result.data.time_in_minutes != null ? String(result.data.time_in_minutes) : ''
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, supabase, userId]);

  const onSave = async () => {
    if (!userId || !id) return;
    if (!label.trim()) {
      setError('Title is required');
      return;
    }
    setBusy(true);
    setError(null);
    const ingredient_lines = ingredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .join('***');
    const stepLines = steps
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .join('***');
    const result = await updateRecipe(supabase, userId, id, {
      recipe_label: label,
      ingredient_lines,
      steps: stepLines,
      time_in_minutes: minutes ? Number(minutes) : null,
    });
    setBusy(false);
    if (result.error || !result.data) {
      setError(result.error ?? 'Could not save recipe');
      return;
    }
    router.replace(`/(app)/recipe/${result.data.id}` as Href);
  };

  if (loading) return <LoadingState />;
  if (loadError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit recipe' }} />
        <ErrorState
          message={loadError}
          onRetry={() => router.back()}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit recipe' }} />
      <Screen edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Title" value={label} onChangeText={setLabel} />
          <Field
            label="Time (minutes)"
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
          />
          <Field
            label="Ingredients"
            value={ingredients}
            onChangeText={setIngredients}
            multiline
          />
          <Field label="Steps" value={steps} onChangeText={setSteps} multiline />
          {error ? <AppText variant="error">{error}</AppText> : null}
          <Button title="Save changes" loading={busy} onPress={onSave} />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => {
              Alert.alert('Discard changes?', undefined, [
                { text: 'Keep editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => router.back() },
              ]);
            }}
          />
        </ScrollView>
      </Screen>
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={{ gap: Spacing[2] }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor={Colors.gray500}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[12] },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.body,
    color: Colors.foreground,
    backgroundColor: Colors.white,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
