import { useAuth, useUser } from '@clerk/expo';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, LoadingState, Screen } from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  Radius,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { useWebApi } from '@/lib/web-api';

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const { isPro, loading } = useEntitlements();
  const { billingUrl } = useWebApi();

  if (!isLoaded || loading) return <LoadingState />;

  const name = user?.fullName || user?.firstName || 'HomeRecipe cook';
  const email = user?.primaryEmailAddress?.emailAddress ?? 'No email';
  const initials = (user?.firstName?.[0] || user?.fullName?.[0] || 'H').toUpperCase();
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <AppText variant="heading">Account</AppText>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initials}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title">{name}</AppText>
            <AppText variant="muted">{email}</AppText>
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="label" style={styles.groupLabel}>
            Plan
          </AppText>
          <View style={styles.row}>
            <AppText style={{ fontFamily: FontFamily.bodyMedium }}>
              {isPro ? 'Pro' : 'Free'}
            </AppText>
            <View
              style={[
                styles.badge,
                isPro ? styles.badgePro : styles.badgeFree,
              ]}>
              <AppText
                style={{
                  color: isPro ? Colors.brandLimeFg : Colors.foregroundMuted,
                  fontSize: FontSize.xs,
                  fontFamily: FontFamily.bodyBold,
                }}>
                {isPro ? 'PRO' : 'FREE'}
              </AppText>
            </View>
          </View>

          {!isPro && billingUrl ? (
            <Pressable
              onPress={() => {
                void Linking.openURL(billingUrl);
              }}
              style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}>
              <AppText style={styles.upgradeText}>Upgrade to Pro</AppText>
            </Pressable>
          ) : null}

          {billingUrl ? (
            <Pressable
              onPress={() => {
                void Linking.openURL(billingUrl);
              }}
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
              <AppText>Manage billing on web</AppText>
              <AppText variant="muted">→</AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.group}>
          <AppText variant="label" style={styles.groupLabel}>
            Session
          </AppText>
          <Button title="Sign out" variant="danger" onPress={onSignOut} />
        </View>

        <AppText variant="muted" style={styles.version}>
          HomeRecipe · v{version}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing[4],
    gap: Spacing[5],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius['2xl'],
    padding: Spacing[4],
    backgroundColor: Colors.white,
    ...Shadows.soft,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentMutedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.accent,
  },
  group: {
    gap: Spacing[3],
  },
  groupLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: FontSize.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HitTarget.min,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
  },
  badge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
  },
  badgePro: {
    backgroundColor: 'rgba(149, 198, 35, 0.2)',
  },
  badgeFree: {
    backgroundColor: Colors.gray100,
  },
  upgradeBtn: {
    minHeight: HitTarget.min,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HitTarget.min,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
  },
  version: {
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: Spacing[4],
  },
});
