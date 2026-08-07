import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { RecipeCard } from '@/components/recipe-card';
import { AppText, Button } from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  Radius,
  Spacing,
} from '@/constants/theme';
import { pickRecipeImage } from '@/lib/pick-recipe-image';
import type { RecipeListItem } from '@/lib/types';

export type RecipeEditorValues = {
  label: string;
  ingredientLines: string[];
  stepLines: string[];
  minutes: string;
  /** Local file URI or remote URL for preview / save */
  imageUri: string | null;
  /** True when imageUri is a local file that still needs upload */
  imageNeedsUpload: boolean;
  localImageMimeType: string | null;
  localImageFileName: string | null;
};

export type RecipeEditorFormProps = {
  initial?: Partial<RecipeEditorValues>;
  busy?: boolean;
  error?: string | null;
  freeTierNote?: boolean;
  submitLabel?: string;
  onSubmit: (values: RecipeEditorValues) => void;
  onCancel?: () => void;
};

type TabKey = 'ingredients' | 'steps' | 'details';

function normalizeLines(lines: string[]): string[] {
  const trimmed = lines.map((s) => s.trim()).filter(Boolean);
  return trimmed.length > 0 ? trimmed : [''];
}

export function RecipeEditorForm({
  initial,
  busy,
  error,
  freeTierNote,
  submitLabel = 'Save recipe',
  onSubmit,
  onCancel,
}: RecipeEditorFormProps) {
  const [tab, setTab] = useState<TabKey>('ingredients');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [ingredientLines, setIngredientLines] = useState(
    normalizeLines(initial?.ingredientLines ?? [''])
  );
  const [stepLines, setStepLines] = useState(normalizeLines(initial?.stepLines ?? ['']));
  const [minutes, setMinutes] = useState(initial?.minutes ?? '');
  const [imageUri, setImageUri] = useState<string | null>(initial?.imageUri ?? null);
  const [imageNeedsUpload, setImageNeedsUpload] = useState(
    initial?.imageNeedsUpload ?? false
  );
  const [localImageMimeType, setLocalImageMimeType] = useState<string | null>(
    initial?.localImageMimeType ?? null
  );
  const [localImageFileName, setLocalImageFileName] = useState<string | null>(
    initial?.localImageFileName ?? null
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const snapshot = useMemo(
    () => ({
      label: (initial?.label ?? '').trim(),
      minutes: initial?.minutes ?? '',
      imageUri: initial?.imageUri ?? null,
      ingredients: (initial?.ingredientLines ?? [''])
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n'),
      steps: (initial?.stepLines ?? [''])
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n'),
    }),
    [initial]
  );

  const isDirty =
    label.trim() !== snapshot.label ||
    minutes !== snapshot.minutes ||
    imageUri !== snapshot.imageUri ||
    ingredientLines.map((s) => s.trim()).filter(Boolean).join('\n') !==
      snapshot.ingredients ||
    stepLines.map((s) => s.trim()).filter(Boolean).join('\n') !== snapshot.steps;

  const previewRecipe = useMemo<RecipeListItem>(() => {
    const time = Number(minutes);
    return {
      id: 'draft-preview',
      recipe_id: 'draft-preview',
      recipe_label: label.trim() || 'Untitled Recipe',
      calories: null,
      cuisine_type: null,
      meal_type: null,
      time_in_minutes: Number.isFinite(time) && time >= 1 ? time : null,
      image_url: imageUri,
      website_url: null,
      user_id: null,
    };
  }, [imageUri, label, minutes]);

  const values = (): RecipeEditorValues => ({
    label,
    ingredientLines,
    stepLines,
    minutes,
    imageUri,
    imageNeedsUpload,
    localImageMimeType,
    localImageFileName,
  });

  const validate = (): string | null => {
    if (!label.trim()) return 'Recipe name is required.';
    if (!ingredientLines.map((s) => s.trim()).filter(Boolean).length) {
      return 'Add at least one ingredient.';
    }
    const time = Number(minutes);
    if (!Number.isFinite(time) || time < 1) {
      return 'Cook time of at least 1 minute is required.';
    }
    return null;
  };

  const onPickPhoto = async () => {
    const result = await pickRecipeImage({ hasExisting: !!imageUri });
    if (result === 'removed') {
      setImageUri(null);
      setImageNeedsUpload(false);
      setLocalImageMimeType(null);
      setLocalImageFileName(null);
      return;
    }
    if (!result) return;
    setImageUri(result.uri);
    setImageNeedsUpload(true);
    setLocalImageMimeType(result.mimeType);
    setLocalImageFileName(result.fileName);
  };

  const handleCancel = () => {
    if (!onCancel) return;
    if (!isDirty) {
      onCancel();
      return;
    }
    Alert.alert('Discard changes?', 'Your unsaved edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onCancel },
    ]);
  };

  const handleSubmit = () => {
    const v = validate();
    if (v) {
      setLocalError(v);
      return;
    }
    setLocalError(null);
    onSubmit(values());
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {freeTierNote ? (
          <AppText variant="muted">Free recipes may expire after 30 days.</AppText>
        ) : null}

        <View style={styles.previewWrap}>
          <RecipeCard recipe={previewRecipe} onPress={onPickPhoto} />
          <AppText variant="muted" style={styles.previewHint}>
            Tap the card to add or change the photo
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="label">
            Recipe name <AppText style={{ color: Colors.accent }}>*</AppText>
          </AppText>
          <TextInput
            value={label}
            onChangeText={(t) => {
              setLabel(t);
              setLocalError(null);
            }}
            placeholder="Recipe Name"
            placeholderTextColor={Colors.gray500}
            style={styles.input}
          />
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(
            [
              ['ingredients', 'Ingredients'],
              ['steps', 'Steps'],
              ['details', 'Details'],
            ] as const
          ).map(([key, title]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}>
              <AppText
                style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {title}
              </AppText>
            </Pressable>
          ))}
        </View>

        {tab === 'ingredients' ? (
          <View style={styles.panel}>
            {ingredientLines.map((line, i) => (
              <View key={`ing-${i}`} style={styles.lineRow}>
                <TextInput
                  value={line}
                  onChangeText={(t) => {
                    const next = [...ingredientLines];
                    next[i] = t;
                    setIngredientLines(next);
                    setLocalError(null);
                  }}
                  onSubmitEditing={() => {
                    setIngredientLines((lines) => [...lines, '']);
                  }}
                  returnKeyType="next"
                  placeholder="Ingredient"
                  placeholderTextColor={Colors.gray500}
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable
                  accessibilityLabel="Remove ingredient"
                  hitSlop={8}
                  onPress={() => {
                    const next = ingredientLines.filter((_, idx) => idx !== i);
                    setIngredientLines(next.length ? next : ['']);
                  }}
                  style={styles.removeBtn}>
                  <AppText style={styles.removeText}>×</AppText>
                </Pressable>
              </View>
            ))}
            <Button
              title="+ Add ingredient"
              variant="soft"
              compact
              onPress={() => setIngredientLines((lines) => [...lines, ''])}
            />
          </View>
        ) : null}

        {tab === 'steps' ? (
          <View style={styles.panel}>
            {stepLines.map((line, i) => (
              <View key={`step-${i}`} style={styles.lineRow}>
                <AppText style={styles.stepNum}>{i + 1}.</AppText>
                <TextInput
                  value={line}
                  onChangeText={(t) => {
                    const next = [...stepLines];
                    next[i] = t;
                    setStepLines(next);
                  }}
                  multiline
                  placeholder="Step"
                  placeholderTextColor={Colors.gray500}
                  style={[styles.input, styles.stepInput, { flex: 1 }]}
                />
                <Pressable
                  accessibilityLabel="Remove step"
                  hitSlop={8}
                  onPress={() => {
                    const next = stepLines.filter((_, idx) => idx !== i);
                    setStepLines(next.length ? next : ['']);
                  }}
                  style={styles.removeBtn}>
                  <AppText style={styles.removeText}>×</AppText>
                </Pressable>
              </View>
            ))}
            <Button
              title="+ Add step"
              variant="soft"
              compact
              onPress={() => setStepLines((lines) => [...lines, ''])}
            />
          </View>
        ) : null}

        {tab === 'details' ? (
          <View style={styles.panel}>
            <View style={styles.field}>
              <AppText variant="label">
                Cook time (minutes) <AppText style={{ color: Colors.accent }}>*</AppText>
              </AppText>
              <TextInput
                value={minutes}
                onChangeText={(t) => {
                  setMinutes(t.replace(/[^\d]/g, ''));
                  setLocalError(null);
                }}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={Colors.gray500}
                style={styles.input}
              />
            </View>
            <Button
              title={imageUri ? 'Change photo' : 'Add photo'}
              variant="secondary"
              onPress={() => void onPickPhoto()}
            />
            {imageUri ? (
              <Button
                title="Remove photo"
                variant="ghost"
                onPress={() => {
                  setImageUri(null);
                  setImageNeedsUpload(false);
                  setLocalImageMimeType(null);
                  setLocalImageFileName(null);
                }}
              />
            ) : null}
          </View>
        ) : null}

        {localError || error ? (
          <AppText variant="error">{localError || error}</AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {onCancel ? (
          <Button title="Cancel" variant="ghost" onPress={handleCancel} disabled={busy} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            title={busy ? 'Saving…' : submitLabel}
            onPress={handleSubmit}
            disabled={busy}
            loading={busy}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: Spacing[6],
  },
  previewWrap: { gap: Spacing[2] },
  previewHint: { textAlign: 'center', fontSize: FontSize.xs },
  field: { gap: Spacing[2] },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.body,
    color: Colors.foreground,
    backgroundColor: Colors.white,
    minHeight: HitTarget.min,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing[2],
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: Spacing[1],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    minHeight: HitTarget.min - 8,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.gray700,
    fontSize: FontSize.sm,
  },
  tabTextActive: {
    color: Colors.accent,
  },
  panel: { gap: Spacing[3] },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  stepNum: {
    width: 24,
    paddingTop: Spacing[3],
    fontFamily: FontFamily.bodyMedium,
    color: Colors.gray700,
  },
  stepInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  removeBtn: {
    width: HitTarget.min - 8,
    height: HitTarget.min - 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  removeText: {
    fontSize: 22,
    color: Colors.gray600,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
