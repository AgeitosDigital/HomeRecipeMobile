import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesError,
} from 'react-native-purchases';

/** Must match the entitlement identifier in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT_ID = 'HomeRecipe Pro';

/** Store product identifiers configured in App Store Connect / RevenueCat. */
export const PRODUCT_IDS = {
  monthly: 'monthly',
  yearly: 'yearly',
} as const;

let configured = false;

export function isPurchasesConfigured(): boolean {
  return configured;
}

export function getRevenueCatApiKey(): string | null {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  if (Platform.OS === 'ios') return ios || null;
  if (Platform.OS === 'android') return android || ios || null;
  return ios || android || null;
}

/**
 * Configure the RevenueCat SDK once at app start.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function configurePurchases(): Promise<void> {
  if (configured) return;
  if (Platform.OS === 'web') return;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    console.warn(
      '[purchases] Missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (or ANDROID). Skipping configure.'
    );
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  }

  Purchases.configure({ apiKey });
  configured = true;
}

export function hasActiveProEntitlement(customerInfo: CustomerInfo | null | undefined): boolean {
  if (!customerInfo) return false;
  return typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
}

export function purchasesErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const purchasesError = error as PurchasesError;
    return purchasesError.message || 'Purchase failed';
  }
  if (error instanceof Error) return error.message;
  return 'Purchase failed';
}
