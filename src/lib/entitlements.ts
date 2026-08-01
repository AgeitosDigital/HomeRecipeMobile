import type { SupabaseClient } from '@supabase/supabase-js';

export type ProfileEntitlements = {
  plan_tier: 'free' | 'pro';
  stripe_subscription_status: string | null;
};

export function isProSubscriptionStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export function isUserProFromProfile(profile: ProfileEntitlements | null): boolean {
  if (!profile) return false;
  return (
    profile.plan_tier === 'pro' ||
    isProSubscriptionStatus(profile.stripe_subscription_status)
  );
}

export async function fetchMyEntitlements(
  supabase: SupabaseClient,
  userId: string
): Promise<{ isPro: boolean; profile: ProfileEntitlements | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan_tier, stripe_subscription_status')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { isPro: false, profile: null, error: error.message };
  }

  const profile = (data as ProfileEntitlements | null) ?? null;
  return { isPro: isUserProFromProfile(profile), profile, error: null };
}

export function isOwnNonExpired(
  recipe: { user_id?: string | null; expires_at?: string | null; deleted_at?: string | null },
  userId: string
): boolean {
  if (recipe.deleted_at != null) return false;
  if (recipe.user_id !== userId) return false;
  if (recipe.expires_at) {
    const exp = Date.parse(recipe.expires_at);
    if (Number.isFinite(exp) && exp < Date.now()) return false;
  }
  return true;
}
