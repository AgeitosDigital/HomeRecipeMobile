import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { LinkIcon } from '@/components/icons';
import { RecipeDetailShell } from '@/components/recipe-detail-shell';
import {
  AppText,
  Button,
  IconCircle,
  PageHeader,
  Screen,
  Surface,
} from '@/components/ui';
import { Colors, FontFamily, HitTarget, Radius, Spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useSupabase } from '@/hooks/use-supabase';
import { createRecipe } from '@/lib/recipes';
import type { UrlImportedRecipe } from '@/lib/types';
import {
  buildUrlImportCreateInput,
  isUrlImportSaveable,
} from '@/lib/url-import';
import { useWebApi } from '@/lib/web-api';

const STATUS_LINES = [
  'Fetching the page…',
  'Looking for recipe data…',
  'Parsing ingredients and steps…',
  'Cleaning up the result…',
] as const;

function isUrlImportedRecipe(value: unknown): value is UrlImportedRecipe {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.source_url === 'string' && Array.isArray(v.ingredients);
}

export default function ImportRecipeScreen() {
  const { userId } = useAuth();
  const { isPro } = useEntitlements();
  const supabase = useSupabase();
  const { importRecipeFromUrl, billingUrl } = useWebApi();
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string }>();

  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<UrlImportedRecipe | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);
  const [cookingMode, setCookingMode] = useState(false);

  useEffect(() => {
    const incoming =
      typeof params.url === 'string'
        ? params.url
        : Array.isArray(params.url)
          ? params.url[0]
          : '';
    if (incoming?.trim()) setUrl(incoming.trim());
  }, [params.url]);

  useEffect(() => {
    if (!busy) {
      setStatusIndex(0);
      return;
    }
    const t = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 2200);
    return () => clearInterval(t);
  }, [busy]);

  const draftInput = useMemo(
    () => (draft ? buildUrlImportCreateInput(draft) : null),
    [draft]
  );

  const onImport = async () => {
    setBusy(true);
    setError(null);
    setDraft(null);
    const result = await importRecipeFromUrl(url.trim());
    setBusy(false);
    if (result.error) {
      if (result.status === 403 && result.code === 'PLAN_LIMIT') {
        Alert.alert(
          'Extraction limit reached',
          'Upgrade to Pro for more URL imports this month.',
          [
            { text: 'Not now', style: 'cancel' },
            billingUrl
              ? {
                  text: 'View billing',
                  onPress: () => void Linking.openURL(billingUrl),
                }
              : undefined,
          ].filter(Boolean) as { text: string; style?: 'cancel'; onPress?: () => void }[]
        );
        return;
      }
      setError(result.error);
      return;
    }
    if (!isUrlImportedRecipe(result.data)) {
      setError('Import returned an unexpected response.');
      return;
    }
    if (!isUrlImportSaveable(result.data)) {
      setError('Could not find a usable title and ingredients on that page.');
      return;
    }
    setDraft(result.data);
  };

  const onSaveDraft = async () => {
    if (!userId || !draftInput) return;
    setSaving(true);
    setError(null);
    const result = await createRecipe(supabase, userId, {
      recipe_label: draftInput.recipe_label,
      ingredient_lines: draftInput.ingredient_lines,
      steps: draftInput.steps,
      time_in_minutes: draftInput.time_in_minutes,
      image_url: draftInput.image_url,
      website_url: draftInput.website_url,
      calories: draftInput.calories,
      meal_type: draftInput.meal_type,
      recipe_id: draftInput.recipe_id,
      isPro,
    });
    setSaving(false);
    if (result.error || !result.data) {
      setError(result.error ?? 'Could not save imported recipe');
      return;
    }
    router.replace(`/(app)/recipe/${result.data.id}` as Href);
  };

  if (draft && draftInput) {
    const metaLine = [
      draftInput.time_in_minutes ? `${draftInput.time_in_minutes} min` : null,
      draftInput.calories ? `${draftInput.calories} kcal` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}>
          <RecipeDetailShell
            title={draftInput.recipe_label}
            imageUrl={draftInput.image_url}
            metaLine={metaLine || null}
            favorited={false}
            canFavorite={false}
            cookingMode={cookingMode}
            onToggleCookingMode={() => setCookingMode((v) => !v)}
            showSecondaryActions={!cookingMode}
            onOpenSource={
              draftInput.website_url
                ? () => void Linking.openURL(draftInput.website_url!)
                : undefined
            }
            ingredients={draftInput.ingredientList}
            steps={draftInput.stepList}
          />
        </ScrollView>
        <View style={styles.draftFooter}>
          {error ? <AppText variant="error">{error}</AppText> : null}
          <Button
            title={saving ? 'Saving…' : 'Save recipe'}
            loading={saving}
            disabled={saving}
            onPress={() => void onSaveDraft()}
          />
          <Button
            title="Import another"
            variant="ghost"
            disabled={saving}
            onPress={() => {
              setDraft(null);
              setCookingMode(false);
              setError(null);
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.content}>
        <PageHeader
          icon={<LinkIcon size={22} color={Colors.accent} />}
          title="Import a Recipe"
          subtitle="Paste a TikTok link or any recipe webpage URL and we'll do the rest."
        />

        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <IconCircle tone="accent" size={44}>
              <LinkIcon size={20} color={Colors.accent} />
            </IconCircle>
            <AppText variant="muted" style={{ flex: 1 }}>
              Imports go through the HomeRecipe web API — secrets never leave the server.
            </AppText>
          </View>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://example.com/recipe"
            placeholderTextColor={Colors.gray500}
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={() => void onImport()}
            returnKeyType="go"
            editable={!busy}
          />
          {busy ? (
            <View style={styles.busyBox}>
              <AppText style={styles.busyLine}>{STATUS_LINES[statusIndex]}</AppText>
              <AppText variant="muted" style={{ fontSize: 12 }}>
                This usually takes a few seconds.
              </AppText>
            </View>
          ) : null}
          {error ? <AppText variant="error">{error}</AppText> : null}
          <Button
            title={busy ? 'Importing…' : 'Cook It!'}
            onPress={() => void onImport()}
            disabled={busy || !url.trim()}
            loading={busy}
          />
        </Surface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[4] },
  card: {
    gap: Spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.body,
    color: Colors.foreground,
    backgroundColor: Colors.backgroundPanel,
    minHeight: HitTarget.min,
  },
  busyBox: {
    gap: Spacing[1],
    paddingVertical: Spacing[2],
  },
  busyLine: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.foreground,
  },
  draftFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing[4],
    gap: Spacing[2],
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
