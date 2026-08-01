import { useAuth } from '@clerk/expo';
import { useEffect, useState } from 'react';

import { useSupabase } from '@/hooks/use-supabase';
import { fetchMyEntitlements } from '@/lib/entitlements';

export function useEntitlements() {
  const { userId } = useAuth();
  const supabase = useSupabase();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!userId) {
      setIsPro(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchMyEntitlements(supabase, userId);
    setIsPro(result.isPro);
    setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [userId, supabase]);

  return { isPro, loading, error, refresh };
}
