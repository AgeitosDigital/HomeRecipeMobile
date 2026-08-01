import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { LinkIcon } from '@/components/icons';
import {
  AppText,
  Button,
  IconCircle,
  PageHeader,
  Screen,
  Surface,
} from '@/components/ui';
import { Colors, FontFamily, HitTarget, Radius, Spacing } from '@/constants/theme';
import { useWebApi } from '@/lib/web-api';

export default function ImportRecipeScreen() {
  const { importRecipeFromUrl } = useWebApi();
  const params = useLocalSearchParams<{ url?: string }>();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const incoming = typeof params.url === 'string' ? params.url : Array.isArray(params.url) ? params.url[0] : '';
    if (incoming?.trim()) {
      setUrl(incoming.trim());
    }
  }, [params.url]);

  const onImport = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await importRecipeFromUrl(url.trim());
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess('Import started or completed via the web app API. Check Home for the recipe.');
    setUrl('');
  };

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
            onSubmitEditing={onImport}
            returnKeyType="go"
          />
          {error ? <AppText variant="error">{error}</AppText> : null}
          {success ? <AppText style={{ color: Colors.successFg }}>{success}</AppText> : null}
          <Button
            title={busy ? 'Importing…' : 'Cook It!'}
            onPress={onImport}
            disabled={busy || !url.trim()}
            loading={busy}
          />
        </Surface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
