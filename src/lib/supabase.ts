import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Supabase client authenticated with a Clerk session token (third-party auth).
 * Same pattern as the web app — no Supabase Auth session.
 */
export function createClerkSupabaseClient(
  getToken: () => Promise<string | null | undefined>
): SupabaseClient {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }

  return createSupabaseClient(url, key, {
    accessToken: async () => {
      try {
        const token = await withTimeout(
          Promise.resolve(getToken()),
          8000,
          'Clerk getToken'
        );
        return token ?? null;
      } catch (err) {
        console.warn(
          '[supabase] Clerk getToken failed:',
          err instanceof Error ? err.message : err
        );
        return null;
      }
    },
  });
}
