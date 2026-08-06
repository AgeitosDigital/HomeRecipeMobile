import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { configurePurchases, isPurchasesConfigured } from '@/lib/purchases';

/**
 * Editable profile facts live in Supabase `profiles`, then fan out to
 * RevenueCat (and Clerk name when callers update it). Do not store Pro/plan here.
 */
export type ProfileDetails = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  phone_number: string | null;
  birthday: string | null;
};

export type ProfileEditableFields = {
  display_name: string | null;
  phone_number: string | null;
  birthday: string | null;
};

export async function fetchMyProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: ProfileDetails | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, username, display_name, phone_number, birthday')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: (data as ProfileDetails | null) ?? null, error: null };
}

export async function updateMyProfile(
  supabase: SupabaseClient,
  userId: string,
  fields: ProfileEditableFields,
  identity: { email: string; username: string }
): Promise<{ profile: ProfileDetails | null; error: string | null }> {
  const patch = {
    id: userId,
    email: identity.email,
    username: identity.username,
    display_name: fields.display_name,
    phone_number: fields.phone_number,
    birthday: fields.birthday,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(patch, { onConflict: 'id' })
    .select('id, email, username, display_name, phone_number, birthday')
    .single();

  if (error) {
    return { profile: null, error: error.message };
  }

  return { profile: data as ProfileDetails, error: null };
}

/** Normalize optional phone for storage (empty → null). */
export function normalizePhoneInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

/** Normalize display name (empty → null). */
export function normalizeDisplayNameInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

/**
 * Accept empty or YYYY-MM-DD. Rejects clearly invalid / future dates.
 */
export function normalizeBirthdayInput(raw: string): {
  value: string | null;
  error: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { value: null, error: 'Use birthday format YYYY-MM-DD' };
  }

  const date = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { value: null, error: 'Enter a valid birthday' };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) {
    return { value: null, error: 'Birthday cannot be in the future' };
  }

  return { value: trimmed, error: null };
}

export function lightPhoneLooksOk(phone: string | null): boolean {
  if (!phone) return true;
  // Allow digits, spaces, +, -, (), common formatting; require some digits.
  if (!/^[+\d\s().-]{7,20}$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Push profile + Clerk-derived identity into RevenueCat attributes.
 * Best-effort; never throws to callers.
 */
export async function syncProfileToRevenueCat(input: {
  email: string | null;
  displayName: string | null;
  phone: string | null;
  birthday: string | null;
  clerkUserId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  authProvider?: string | null;
  accountCreatedAt?: string | null;
}): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await configurePurchases();
    if (!isPurchasesConfigured()) return;

    await Purchases.setEmail(input.email);
    await Purchases.setDisplayName(input.displayName);
    await Purchases.setPhoneNumber(input.phone);

    await Purchases.setAttributes({
      clerk_user_id: input.clerkUserId,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      username: input.username ?? null,
      auth_provider: input.authProvider ?? null,
      account_created_at: input.accountCreatedAt ?? null,
      display_name: input.displayName,
      birthday: input.birthday,
    });

    await Purchases.syncAttributesAndOfferingsIfNeeded();
  } catch (err) {
    console.warn('[profile] RevenueCat attribute sync failed:', err);
  }
}
