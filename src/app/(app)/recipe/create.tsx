import { useAuth } from '@clerk/expo';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { createRecipe } from '@/lib/recipes';

export default function CreateRecipeScreen() {
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const router = useRouter();

  const [label, setLabel] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    if (!userId) return;
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
    const result = await createRecipe(supabase, userId, {
      recipe_label: label,
      ingredient_lines,
      steps: stepLines,
      time_in_minutes: minutes ? Number(minutes) : null,
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
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="muted">
          Free recipes may expire after 30 days.
        </AppText>
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
        <Button title={busy ? 'Saving…' : 'Save recipe'} onPress={onSave} disabled={busy} />
      </ScrollView>
    </Screen>
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
