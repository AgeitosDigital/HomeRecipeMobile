import { useAuth, useUser } from '@clerk/expo';
import { type ReactNode, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { configurePurchases, isPurchasesConfigured } from '@/lib/purchases';

function clerkAuthProvider(user: {
  externalAccounts?: { provider?: string | null }[] | null;
  passwordEnabled?: boolean;
} | null): string | null {
  const oauth = user?.externalAccounts?.find((a) => a.provider)?.provider;
  if (oauth) return oauth;
  if (user?.passwordEnabled) return 'email';
  return null;
}

/**
 * Configures RevenueCat and links the Clerk user id as the app user id
 * so purchases stay attached to the signed-in HomeRecipe account.
 * Syncs profile attributes for free and Pro customers (dashboard search).
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
  const phone =
    user?.primaryPhoneNumber?.phoneNumber ??
    user?.phoneNumbers[0]?.phoneNumber ??
    null;
  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    null;
  const firstName = user?.firstName?.trim() || null;
  const lastName = user?.lastName?.trim() || null;
  const username = user?.username?.trim() || null;
  const authProvider = clerkAuthProvider(user);
  const accountCreatedAt = user?.createdAt
    ? new Date(user.createdAt).toISOString()
    : null;

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

          const attrKey = [
            userId,
            email,
            phone,
            displayName,
            firstName,
            lastName,
            username,
            authProvider,
            accountCreatedAt,
          ].join('|');
          if (lastSyncedAttrs.current === attrKey) return;

          // Ensure the subscriber exists after logIn / customer deletes.
          try {
            await Purchases.getCustomerInfo();
          } catch {
            // Still attempt attributes; failures are non-fatal for Pro access.
          }
          if (cancelled) return;

          try {
            // Reserved attributes (show in RevenueCat customer profile).
            await Purchases.setEmail(email);
            await Purchases.setDisplayName(displayName);
            await Purchases.setPhoneNumber(phone);

            // Custom attributes (searchable; do not store subscription status here).
            await Purchases.setAttributes({
              clerk_user_id: userId,
              first_name: firstName,
              last_name: lastName,
              username,
              auth_provider: authProvider,
              account_created_at: accountCreatedAt,
            });

            // Push attributes immediately — otherwise RC waits for background/purchase.
            await Purchases.syncAttributesAndOfferingsIfNeeded();

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
  }, [
    authLoaded,
    userLoaded,
    userId,
    user,
    email,
    phone,
    displayName,
    firstName,
    lastName,
    username,
    authProvider,
    accountCreatedAt,
  ]);

  return <>{children}</>;
}
