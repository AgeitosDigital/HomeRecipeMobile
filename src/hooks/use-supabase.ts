import { useAuth } from '@clerk/expo';
import { useMemo, useRef } from 'react';

import { createClerkSupabaseClient } from '@/lib/supabase';

/**
 * Stable Supabase client. getToken from useAuth can change identity every render;
 * storing it in a ref prevents remount loops that leave the recipes screen spinning.
 */
export function useSupabase() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  return useMemo(
    () => createClerkSupabaseClient(async () => getTokenRef.current()),
    []
  );
}
