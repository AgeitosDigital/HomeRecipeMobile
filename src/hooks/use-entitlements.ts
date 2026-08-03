import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { useSupabase } from '@/hooks/use-supabase';
import { fetchMyEntitlements } from '@/lib/entitlements';
import {
  configurePurchases,
  hasActiveProEntitlement,
  isPurchasesConfigured,
} from '@/lib/purchases';

/**
 * Pro if either Stripe-backed profile entitlements OR RevenueCat "HomeRecipe Pro" is active.
 */
export function useEntitlements() {
  const { userId } = useAuth();
  const supabase = useSupabase();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsPro(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const profileResult = await fetchMyEntitlements(supabase, userId);
      let revenueCatPro = false;

      if (Platform.OS !== 'web') {
        try {
          await configurePurchases();
          if (isPurchasesConfigured()) {
            const info: CustomerInfo = await Purchases.getCustomerInfo();
            revenueCatPro = hasActiveProEntitlement(info);
          }
        } catch {
          // Store / Preview API may be unavailable; fall back to profile only.
        }
      }

      setIsPro(profileResult.isPro || revenueCatPro);
      setError(profileResult.error);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS === 'web' || !userId) return;

    let remove: (() => void) | undefined;
    (async () => {
      try {
        await configurePurchases();
        if (!isPurchasesConfigured()) return;
        const listener = () => {
          void refresh();
        };
        Purchases.addCustomerInfoUpdateListener(listener);
        remove = () => {
          Purchases.removeCustomerInfoUpdateListener(listener);
        };
      } catch {
        // ignore
      }
    })();

    return () => {
      remove?.();
    };
  }, [refresh, userId]);

  return { isPro, loading, error, refresh };
}
