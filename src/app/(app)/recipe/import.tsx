import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Screen } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useWebApi } from '@/lib/web-api';

export default function ImportRecipeScreen() {
  const { importRecipeFromUrl } = useWebApi();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        <AppText variant="muted">
          Imports go through the HomeRecipe web API — secrets never leave the server.
        </AppText>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://example.com/recipe"
          placeholderTextColor={Colors.gray500}
          style={styles.input}
          value={url}
          onChangeText={setUrl}
        />
        {error ? <AppText variant="error">{error}</AppText> : null}
        {success ? <AppText style={{ color: Colors.successFg }}>{success}</AppText> : null}
        <Button title={busy ? 'Importing…' : 'Import recipe'} onPress={onImport} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing[4], gap: Spacing[4] },
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
});
