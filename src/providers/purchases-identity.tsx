import { useAuth, useUser } from '@clerk/expo';
import { type ReactNode, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { configurePurchases, isPurchasesConfigured } from '@/lib/purchases';

/**
 * Configures RevenueCat and links the Clerk user id as the app user id
 * so purchases stay attached to the signed-in HomeRecipe account.
 * Also syncs email/display name as subscriber attributes for dashboard search.
 */
export function PurchasesIdentitySync({ children }: { children: ReactNode }) {
  const { isLoaded: authLoaded, userId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const lastUserId = useRef<string | null>(null);
  const lastSyncedAttrs = useRef<string | null>(null);

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;
  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    null;

  useEffect(() => {
    if (!authLoaded || Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      try {
        await configurePurchases();
        if (cancelled || !isPurchasesConfigured()) return;

        if (userId) {
          if (lastUserId.current !== userId) {
            await Purchases.logIn(userId);
            lastUserId.current = userId;
            lastSyncedAttrs.current = null;
          }

          // Wait for Clerk user profile before writing attributes.
          if (!userLoaded || !user) return;

          const attrKey = `${userId}|${email ?? ''}|${displayName ?? ''}`;
          if (lastSyncedAttrs.current === attrKey) return;
          if (!email && !displayName) return;

          // Ensure the subscriber exists after logIn / customer deletes before attributes sync.
          try {
            await Purchases.getCustomerInfo();
          } catch {
            // Still attempt attributes; failures are non-fatal for Pro access.
          }
          if (cancelled) return;

          try {
            if (email) await Purchases.setEmail(email);
            if (displayName) await Purchases.setDisplayName(displayName);
            lastSyncedAttrs.current = attrKey;
          } catch (attrErr) {
            // Attribute sync is best-effort (dashboard search). Do not block billing.
            console.warn('[purchases] subscriber attributes sync failed:', attrErr);
          }
        } else if (lastUserId.current) {
          await Purchases.logOut();
          lastUserId.current = null;
          lastSyncedAttrs.current = null;
        }
      } catch (err) {
        console.warn('[purchases] identity sync failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, userLoaded, userId, user, email, displayName]);

  return <>{children}</>;
}
