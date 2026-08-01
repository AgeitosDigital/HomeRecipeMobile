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
      };
    }
    return { error: null, data: json };
  }

  const billingUrl = baseUrl ? `${baseUrl}/dashboard/billing` : null;
  const calendarUrl = baseUrl ? `${baseUrl}/dashboard/calendar` : null;
  return { importRecipeFromUrl, billingUrl, calendarUrl, appUrl: baseUrl || null };
}
