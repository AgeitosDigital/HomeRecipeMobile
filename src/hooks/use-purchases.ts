import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesOfferings } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import {
  PRO_ENTITLEMENT_ID,
  configurePurchases,
  hasActiveProEntitlement,
  isPurchasesConfigured,
  purchasesErrorMessage,
} from '@/lib/purchases';

export type PresentPaywallOutcome = 'purchased' | 'restored' | 'cancelled' | 'error' | 'skipped';

/**
 * Helpers for CustomerInfo, offerings, RevenueCat Paywalls, and Customer Center.
 */
export function usePurchases() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await configurePurchases();
      if (!isPurchasesConfigured()) {
        setLoading(false);
        return;
      }
      const [info, nextOfferings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setCustomerInfo(info);
      setOfferings(nextOfferings);
    } catch (err) {
      setError(purchasesErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    if (Platform.OS === 'web') return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        await configurePurchases();
        if (cancelled || !isPurchasesConfigured()) return;
        const listener = (info: CustomerInfo) => {
          setCustomerInfo(info);
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
      cancelled = true;
      remove?.();
    };
  }, [refresh]);

  const isRevenueCatPro = hasActiveProEntitlement(customerInfo);

  const presentPaywall = useCallback(async (): Promise<PresentPaywallOutcome> => {
    if (Platform.OS === 'web') {
      Alert.alert('Subscriptions', 'In-app purchases are available on iOS and Android.');
      return 'skipped';
    }
    try {
      await configurePurchases();
      if (!isPurchasesConfigured()) {
        Alert.alert('Subscriptions', 'Purchases are not configured yet.');
        return 'error';
      }

      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
      });

      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
          await refresh();
          return 'purchased';
        case PAYWALL_RESULT.RESTORED:
          await refresh();
          return 'restored';
        case PAYWALL_RESULT.NOT_PRESENTED:
          await refresh();
          return 'skipped';
        case PAYWALL_RESULT.CANCELLED:
          return 'cancelled';
        case PAYWALL_RESULT.ERROR:
        default:
          return 'error';
      }
    } catch (err) {
      Alert.alert('Purchase error', purchasesErrorMessage(err));
      return 'error';
    }
  }, [refresh]);

  const presentCustomerCenter = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Subscriptions', 'Manage subscriptions on iOS or Android.');
      return;
    }

    try {
      await configurePurchases();
      if (!isPurchasesConfigured()) {
        Alert.alert('Subscriptions', 'Purchases are not configured yet.');
        return;
      }

      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: () => {
            void refresh();
          },
          onRestoreFailed: ({ error: restoreError }) => {
            Alert.alert('Restore failed', purchasesErrorMessage(restoreError));
          },
        },
      });
      await refresh();
    } catch (err) {
      Alert.alert('Could not open subscription management', purchasesErrorMessage(err));
    }
  }, [refresh]);

  const restorePurchases = useCallback(async () => {
    try {
      await configurePurchases();
      if (!isPurchasesConfigured()) {
        Alert.alert('Subscriptions', 'Purchases are not configured yet.');
        return false;
      }
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      if (hasActiveProEntitlement(info)) {
        Alert.alert('Restored', 'Your HomeRecipe Pro access is active again.');
        return true;
      }
      Alert.alert('No purchases found', 'We could not find an active Pro subscription to restore.');
      return false;
    } catch (err) {
      Alert.alert('Restore failed', purchasesErrorMessage(err));
      return false;
    }
  }, []);

  return {
    customerInfo,
    offerings,
    currentOffering: offerings?.current ?? null,
    loading,
    error,
    isRevenueCatPro,
    refresh,
    presentPaywall,
    presentCustomerCenter,
    restorePurchases,
  };
}
