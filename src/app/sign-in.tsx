import { isClerkAPIResponseError, useAuth, useSSO } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { Image } from 'expo-image';
import { Redirect, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText, Button, LoadingState, Screen } from '@/components/ui';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const logo = require('../../assets/brand/homerecipelogo1-removebg.png');

export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<
    'oauth_google' | 'oauth_apple' | 'email' | 'verify' | null
  >(null);
  const busy = busyAction !== null;

  if (!isLoaded) return <LoadingState />;
  if (isSignedIn) return <Redirect href={'/(app)' as Href} />;

  const startOAuth = async (strategy: 'oauth_google' | 'oauth_apple') => {
    setBusyAction(strategy);
    setError(null);
    try {
      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
        strategy,
      });

      // User closed the browser without finishing — not an error.
      if (authSessionResult?.type !== 'success') return;

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        return;
      }

      setError('Sign-in incomplete. Try again or use email.');
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  };

  const startEmailFlow = async () => {
    if (!signInLoaded || !signUpLoaded || !signIn || !signUp) return;
    const identifier = email.trim().toLowerCase();
    if (!identifier) {
      setError('Enter your email');
      return;
    }
    setBusyAction('email');
    setError(null);
    try {
      try {
        const result = await signIn.create({ identifier });
        const emailFactor = result.supportedFirstFactors?.find(
          (factor) => factor.strategy === 'email_code'
        );
        if (!emailFactor || emailFactor.strategy !== 'email_code') {
          throw new Error('Email code sign-in is not enabled');
        }
        await signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
        setMode('signIn');
        setPendingVerification(true);
      } catch (err) {
        const shouldSignUp =
          isClerkAPIResponseError(err) &&
          err.errors.some((e) =>
            ['form_identifier_not_found', 'invitation_account_not_exists'].includes(e.code)
          );
        if (!shouldSignUp) throw err;
        await signUp.create({ emailAddress: identifier });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setMode('signUp');
        setPendingVerification(true);
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  };

  const verifyCode = async () => {
    if (!signIn || !signUp || !setActiveSignIn || !setActiveSignUp) return;
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter the verification code');
      return;
    }
    setBusyAction('verify');
    setError(null);
    try {
      if (mode === 'signIn') {
        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: trimmed,
        });
        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId });
          return;
        }
        setError(`Sign-in incomplete (${result.status})`);
      } else {
        const result = await signUp.attemptEmailAddressVerification({ code: trimmed });
        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId });
          return;
        }
        setError(`Sign-up incomplete (${result.status})`);
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Image source={logo} style={styles.logo} contentFit="contain" />
        <AppText variant="brand" style={styles.brand}>
          HomeRecipe
        </AppText>
        <AppText variant="muted" style={styles.subtitle}>
          {pendingVerification
            ? 'Enter the code we emailed you'
            : 'Sign in and let’s start cooking!'}
        </AppText>

        {!pendingVerification ? (
          <>
            <Button
              title={busyAction === 'oauth_google' ? 'Opening Google…' : 'Continue with Google'}
              variant="secondary"
              disabled={busy}
              onPress={() => startOAuth('oauth_google')}
            />
            <Button
              title={busyAction === 'oauth_apple' ? 'Opening Apple…' : 'Continue with Apple'}
              variant="secondary"
              disabled={busy}
              onPress={() => startOAuth('oauth_apple')}
            />

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <AppText variant="muted" style={styles.orText}>
                or
              </AppText>
              <View style={styles.orLine} />
            </View>

            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={Colors.gray500}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
            <Button
              title={busyAction === 'email' ? 'Sending code…' : 'Continue with email'}
              onPress={startEmailFlow}
              disabled={busy}
            />
          </>
        ) : (
          <>
            <TextInput
              autoCapitalize="none"
              keyboardType="number-pad"
              placeholder="Verification code"
              placeholderTextColor={Colors.gray500}
              style={styles.input}
              value={code}
              onChangeText={setCode}
            />
            <Button
              title={busyAction === 'verify' ? 'Verifying…' : 'Verify code'}
              onPress={verifyCode}
              disabled={busy}
            />
            <Button
              title="Use a different email"
              variant="ghost"
              onPress={() => {
                setPendingVerification(false);
                setCode('');
                setError(null);
              }}
            />
          </>
        )}

        {error ? <AppText variant="error">{error}</AppText> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function clerkErrorMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    return err.errors[0]?.longMessage || err.errors[0]?.message || 'Auth failed';
  }
  if (err instanceof Error) return err.message;
  return 'Auth failed';
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.backgroundMuted },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing[6],
    gap: Spacing[3],
  },
  logo: { width: 72, height: 72, alignSelf: 'center' },
  brand: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: Spacing[2] },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginVertical: Spacing[1],
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  orText: { fontSize: FontSize.sm },
  input: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius['2xl'],
    color: Colors.foreground,
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3] + 2,
  },
});
