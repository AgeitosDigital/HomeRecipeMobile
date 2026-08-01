import { isClerkAPIResponseError, useAuth } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { Image } from 'expo-image';
import { Redirect, type Href } from 'expo-router';
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

const REDIRECT_URL = 'homerecipemobile://oauth-native-callback';
const logo = require('../../assets/brand/homerecipelogo1-removebg.png');

export default function SignInScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const { startHostedAuth } = useHostedAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isLoaded) return <LoadingState />;
  if (isSignedIn) return <Redirect href={'/(app)' as Href} />;

  const startEmailFlow = async () => {
    if (!signInLoaded || !signUpLoaded || !signIn || !signUp) return;
    const identifier = email.trim().toLowerCase();
    if (!identifier) {
      setError('Enter your email');
      return;
    }
    setBusy(true);
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
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!signIn || !signUp || !setActiveSignIn || !setActiveSignUp) return;
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Enter the verification code');
      return;
    }
    setBusy(true);
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
      setBusy(false);
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
              title={busy ? 'Sending code…' : 'Continue with email'}
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
              title={busy ? 'Verifying…' : 'Verify code'}
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

        <View style={styles.divider} />
        <Button
          title="Open Clerk sign-in in browser"
          variant="secondary"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await startHostedAuth({ mode: 'sign-in', redirectUrl: REDIRECT_URL });
            } catch (err) {
              setError(clerkErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        />
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[2],
  },
});
