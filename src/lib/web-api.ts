import { useAuth } from '@clerk/expo';

/**
 * Call HomeRecipe web BFF with the Clerk session token.
 * Never call OpenAI / import workers from the mobile client.
 */
export function useWebApi() {
  const { getToken } = useAuth();
  const baseUrl = (process.env.EXPO_PUBLIC_APP_URL ?? '').replace(/\/$/, '');

  async function importRecipeFromUrl(url: string): Promise<{
    error: string | null;
    data?: unknown;
    status?: number;
    code?: string;
  }> {
    if (!baseUrl) {
      return { error: 'EXPO_PUBLIC_APP_URL is not configured' };
    }
    const token = await getToken();
    if (!token) return { error: 'Not signed in' };

    const res = await fetch(`${baseUrl}/api/recipes/import-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error:
          (json as { error?: string }).error ||
          `Import failed (${res.status})`,
        status: res.status,
        code: (json as { code?: string }).code,
      };
    }
    return { error: null, data: json, status: res.status };
  }

  async function uploadRecipeCover(input: {
    uri: string;
    mimeType: string;
    fileName: string;
    recipeLabel: string;
  }): Promise<{ error: string | null; url: string | null }> {
    if (!baseUrl) {
      return { error: 'EXPO_PUBLIC_APP_URL is not configured', url: null };
    }
    const token = await getToken();
    if (!token) return { error: 'Not signed in', url: null };

    const form = new FormData();
    form.append('recipeLabel', input.recipeLabel || 'recipe');
    form.append('image', {
      uri: input.uri,
      type: input.mimeType || 'image/jpeg',
      name: input.fileName || 'recipe.jpg',
    } as unknown as Blob);

    const res = await fetch(`${baseUrl}/api/recipes/upload-cover`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error:
          (json as { error?: string }).error ||
          `Upload failed (${res.status})`,
        url: null,
      };
    }
    const url = (json as { url?: string }).url ?? null;
    if (!url) return { error: 'Upload succeeded but no URL returned', url: null };
    return { error: null, url };
  }

  const billingUrl = baseUrl ? `${baseUrl}/dashboard/billing` : null;
  const calendarUrl = baseUrl ? `${baseUrl}/dashboard/calendar` : null;
  return {
    importRecipeFromUrl,
    uploadRecipeCover,
    billingUrl,
    calendarUrl,
    appUrl: baseUrl || null,
  };
}
