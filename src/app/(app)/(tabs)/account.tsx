import { useAuth, useUser } from '@clerk/expo';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AccountIcon, ChevronRightIcon } from '@/components/icons';
import { AppText, Button, LoadingState, PageHeader, Screen, Surface } from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  IconSize,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useEntitlements } from '@/hooks/use-entitlements';
import { usePurchases } from '@/hooks/use-purchases';
import { useSupabase } from '@/hooks/use-supabase';
import {
  fetchMyProfile,
  lightPhoneLooksOk,
  normalizeBirthdayInput,
  normalizeDisplayNameInput,
  normalizePhoneInput,
  syncProfileToRevenueCat,
  updateMyProfile,
} from '@/lib/profile';

export default function AccountScreen() {
  const { signOut, userId } = useAuth();
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();
  const { isPro, loading, refresh: refreshEntitlements } = useEntitlements();
  const { isRevenueCatPro, presentPaywall, presentCustomerCenter, restorePurchases } =
    usePurchases();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const clerkName = user?.fullName || user?.firstName || '';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const usernameFallback =
    user?.username ?? (email ? email.split('@')[0] : null) ?? userId ?? 'cook';

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { profile, error } = await fetchMyProfile(supabase, userId);
      if (error) {
        setProfileError(error);
      }
      setDisplayName(profile?.display_name?.trim() || clerkName || '');
      setPhone(profile?.phone_number?.trim() || '');
      setBirthday(profile?.birthday?.trim() || '');
    } finally {
      setProfileLoading(false);
    }
  }, [clerkName, supabase, userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (!isLoaded || loading || profileLoading) return <LoadingState />;

  const name =
    displayName.trim() || user?.fullName || user?.firstName || 'HomeRecipe cook';
  const initials = (name[0] || 'H').toUpperCase();
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';

  const onUpgrade = async () => {
    const result = await presentPaywall();
    if (result === 'purchased' || result === 'restored' || result === 'skipped') {
      await refreshEntitlements();
    }
  };

  const onManageBilling = async () => {
    if (isRevenueCatPro) {
      await presentCustomerCenter();
      await refreshEntitlements();
      return;
    }
    Alert.alert(
      'Manage billing',
      isPro
        ? 'Your Pro plan is managed on the web (Stripe). Open HomeRecipe on the web to update payment or cancel.'
        : 'Upgrade to Pro in the app to manage your subscription here.'
    );
  };

  const onSaveProfile = async () => {
    if (!userId || !email) {
      Alert.alert('Profile', 'You need to be signed in to save your profile.');
      return;
    }

    const nextDisplayName = normalizeDisplayNameInput(displayName);
    const nextPhone = normalizePhoneInput(phone);
    const birthdayResult = normalizeBirthdayInput(birthday);

    if (birthdayResult.error) {
      Alert.alert('Birthday', birthdayResult.error);
      return;
    }
    if (!lightPhoneLooksOk(nextPhone)) {
      Alert.alert('Phone', 'Enter a valid phone number, or leave it blank.');
      return;
    }

    setSaving(true);
    setProfileError(null);
    try {
      const { profile, error } = await updateMyProfile(
        supabase,
        userId,
        {
          display_name: nextDisplayName,
          phone_number: nextPhone,
          birthday: birthdayResult.value,
        },
        { email, username: usernameFallback }
      );

      if (error || !profile) {
        Alert.alert('Could not save', error || 'Unknown error');
        return;
      }

      // Best-effort Clerk name update (does not fail the save).
      if (nextDisplayName && user) {
        try {
          const parts = nextDisplayName.split(/\s+/);
          const firstName = parts[0] || nextDisplayName;
          const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
          await user.update({ firstName, lastName });
        } catch {
          // ignore
        }
      }

      await syncProfileToRevenueCat({
        email,
        displayName: nextDisplayName || clerkName || null,
        phone: nextPhone,
        birthday: birthdayResult.value,
        clerkUserId: userId,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        username: user?.username ?? usernameFallback,
        accountCreatedAt: user?.createdAt
          ? new Date(user.createdAt).toISOString()
          : null,
      });

      setDisplayName(profile.display_name ?? '');
      setPhone(profile.phone_number ?? '');
      setBirthday(profile.birthday ?? '');
      Alert.alert('Saved', 'Your profile was updated.');
    } finally {
      setSaving(false);
    }
  };

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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
                <AppText variant="muted">{email || 'No email'}</AppText>
              </View>
            </View>
          </Surface>

          <Surface>
            <AppText variant="label" style={styles.groupLabel}>
              Profile
            </AppText>
            <AppText variant="muted" style={styles.hint}>
              Optional — saved to your HomeRecipe profile and used across the app.
            </AppText>

            <AppText variant="label" style={styles.fieldLabel}>
              Email
            </AppText>
            <TextInput
              editable={false}
              value={email || 'No email'}
              style={[styles.input, styles.inputReadonly]}
              placeholderTextColor={Colors.gray500}
            />

            <AppText variant="label" style={styles.fieldLabel}>
              Display name
            </AppText>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How should we greet you?"
              placeholderTextColor={Colors.gray500}
              autoCapitalize="words"
              style={styles.input}
            />

            <AppText variant="label" style={styles.fieldLabel}>
              Phone
            </AppText>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 555 5555"
              placeholderTextColor={Colors.gray500}
              keyboardType="phone-pad"
              autoComplete="tel"
              style={styles.input}
            />

            <AppText variant="label" style={styles.fieldLabel}>
              Birthday
            </AppText>
            <TextInput
              value={birthday}
              onChangeText={setBirthday}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.gray500}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            {profileError ? (
              <AppText variant="error" style={{ marginTop: Spacing[2] }}>
                {profileError}
              </AppText>
            ) : null}

            <View style={{ marginTop: Spacing[3] }}>
              <Button
                title={saving ? 'Saving…' : 'Save profile'}
                onPress={() => void onSaveProfile()}
                disabled={saving}
                loading={saving}
              />
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

            {!isPro ? (
              <View style={{ marginTop: Spacing[3], gap: Spacing[2] }}>
                <Button title="Upgrade to Pro" onPress={() => void onUpgrade()} />
                <Button
                  title="Restore purchases"
                  variant="secondary"
                  onPress={() => {
                    void (async () => {
                      const ok = await restorePurchases();
                      if (ok) await refreshEntitlements();
                    })();
                  }}
                />
              </View>
            ) : null}

            <Pressable
              onPress={() => void onManageBilling()}
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
              <AppText>
                {isRevenueCatPro ? 'Manage subscription' : 'Manage billing'}
              </AppText>
              <ChevronRightIcon size={20} color={Colors.gray500} />
            </Pressable>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing[4],
    gap: Spacing[4],
    paddingBottom: Spacing[8],
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
    marginBottom: Spacing[2],
  },
  hint: {
    marginBottom: Spacing[3],
    fontSize: FontSize.sm,
  },
  fieldLabel: {
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    minHeight: HitTarget.min,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.foreground,
    backgroundColor: Colors.white,
  },
  inputReadonly: {
    backgroundColor: Colors.gray100,
    color: Colors.foregroundMuted,
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
    marginTop: Spacing[2],
    marginBottom: Spacing[4],
  },
});
