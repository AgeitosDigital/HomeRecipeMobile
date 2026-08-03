import { useAuth } from '@clerk/expo';
import { type ReactNode, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { configurePurchases, isPurchasesConfigured } from '@/lib/purchases';

/**
 * Configures RevenueCat and links the Clerk user id as the app user id
 * so purchases stay attached to the signed-in HomeRecipe account.
 */
export function PurchasesIdentitySync({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      try {
        await configurePurchases();
        if (cancelled || !isPurchasesConfigured()) return;

        if (userId) {
          if (lastUserId.current !== userId) {
            await Purchases.logIn(userId);
            lastUserId.current = userId;
          }
        } else if (lastUserId.current) {
          await Purchases.logOut();
          lastUserId.current = null;
        }
      } catch (err) {
        console.warn('[purchases] identity sync failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  return <>{children}</>;
}
