import { useAuth, useUser } from '@clerk/expo';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AccountIcon, ChevronRightIcon } from '@/components/icons';
import { AppText, Button, LoadingState, PageHeader, Screen, Surface } from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  IconSize,
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
        <PageHeader
          icon={<AccountIcon size={IconSize.lg} color={Colors.accent} />}
          title="Account"
          subtitle="Profile, plan, and session"
        />

        <Surface style={styles.profileCard} padded={false}>
          <View style={styles.profileInner}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>{initials}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="title">{name}</AppText>
              <AppText variant="muted">{email}</AppText>
            </View>
          </View>
        </Surface>

        <Surface>
          <AppText variant="label" style={styles.groupLabel}>
            Plan
          </AppText>
          <View style={styles.row}>
            <AppText style={{ fontFamily: FontFamily.bodyMedium }}>
              {isPro ? 'Pro' : 'Free'}
            </AppText>
            <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
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
            <View style={{ marginTop: Spacing[3] }}>
              <Button
                title="Upgrade to Pro"
                onPress={() => {
                  void Linking.openURL(billingUrl);
                }}
              />
            </View>
          ) : null}

          {billingUrl ? (
            <Pressable
              onPress={() => {
                void Linking.openURL(billingUrl);
              }}
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
              <AppText>Manage billing on web</AppText>
              <ChevronRightIcon size={20} color={Colors.gray500} />
            </Pressable>
          ) : null}
        </Surface>

        <Surface>
          <AppText variant="label" style={styles.groupLabel}>
            Session
          </AppText>
          <Button title="Sign out" variant="danger" onPress={onSignOut} />
        </Surface>

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
    gap: Spacing[4],
  },
  profileCard: {},
  profileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[4],
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
  groupLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: FontSize.xs,
    marginBottom: Spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HitTarget.min,
  },
  badge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: 50,
  },
  badgePro: {
    backgroundColor: 'rgba(149, 198, 35, 0.2)',
  },
  badgeFree: {
    backgroundColor: Colors.gray100,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HitTarget.min,
    marginTop: Spacing[2],
  },
  version: {
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: Spacing[4],
  },
});
