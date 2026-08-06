import { useAuth, useUser } from '@clerk/expo';
import { type ReactNode, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { useSupabase } from '@/hooks/use-supabase';
import { configurePurchases, isPurchasesConfigured } from '@/lib/purchases';
import { fetchMyProfile, syncProfileToRevenueCat } from '@/lib/profile';

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
 * Configures RevenueCat and links the Clerk user id as the app user id.
 * Merges Supabase profile fields (display name, phone, birthday) with Clerk
 * so free and Pro customers stay identifiable in the RevenueCat dashboard.
 */
export function PurchasesIdentitySync({ children }: { children: ReactNode }) {
  const { isLoaded: authLoaded, userId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const supabase = useSupabase();
  const lastUserId = useRef<string | null>(null);
  const lastSyncedAttrs = useRef<string | null>(null);

  const clerkEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;
  const clerkPhone =
    user?.primaryPhoneNumber?.phoneNumber ??
    user?.phoneNumbers[0]?.phoneNumber ??
    null;
  const clerkDisplayName =
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

          if (!userLoaded || !user) return;

          let profileDisplayName: string | null = null;
          let profilePhone: string | null = null;
          let profileBirthday: string | null = null;

          try {
            const { profile } = await fetchMyProfile(supabase, userId);
            if (cancelled) return;
            profileDisplayName = profile?.display_name?.trim() || null;
            profilePhone = profile?.phone_number?.trim() || null;
            profileBirthday = profile?.birthday || null;
          } catch {
            // Profile read is best-effort for RC attributes.
          }

          const email = clerkEmail;
          const displayName = profileDisplayName || clerkDisplayName;
          const phone = profilePhone || clerkPhone;
          const birthday = profileBirthday;

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
            birthday,
          ].join('|');
          if (lastSyncedAttrs.current === attrKey) return;

          try {
            await Purchases.getCustomerInfo();
          } catch {
            // Still attempt attributes.
          }
          if (cancelled) return;

          await syncProfileToRevenueCat({
            email,
            displayName,
            phone,
            birthday,
            clerkUserId: userId,
            firstName,
            lastName,
            username,
            authProvider,
            accountCreatedAt,
          });

          lastSyncedAttrs.current = attrKey;
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
    supabase,
    clerkEmail,
    clerkPhone,
    clerkDisplayName,
    firstName,
    lastName,
    username,
    authProvider,
    accountCreatedAt,
  ]);

  return <>{children}</>;
}
