import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  Radius,
  Spacing,
} from '@/constants/theme';

export function Screen({
  children,
  style,
  edges = ['top', 'left', 'right'],
}: ViewProps & { edges?: ('top' | 'right' | 'bottom' | 'left')[] }) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

type AppTextProps = TextProps & {
  variant?: 'body' | 'muted' | 'title' | 'heading' | 'brand' | 'label' | 'error';
};

export function AppText({ variant = 'body', style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles.text, textVariants[variant], style]} />;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        buttonVariants[variant],
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && { opacity: 0.75 },
      ]}>
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'secondary' || variant === 'ghost' ? Colors.accent : Colors.white
          }
        />
      ) : (
        <AppText
          style={[
            styles.buttonText,
            variant === 'secondary' || variant === 'ghost'
              ? { color: Colors.foreground }
              : { color: Colors.white },
            variant === 'ghost' && { color: Colors.accent },
          ]}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

export function IconButton({
  onPress,
  children,
  accessibilityLabel,
  style,
}: {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  style?: ViewProps['style'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { opacity: 0.7 },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="muted" style={{ marginTop: 4 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function Checkbox({
  checked,
  onPress,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkboxRow}
      hitSlop={4}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <AppText style={styles.checkboxMark}>✓</AppText> : null}
      </View>
      <AppText
        style={[
          styles.checkboxLabel,
          checked && { textDecorationLine: 'line-through', color: Colors.gray500 },
        ]}
        numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Skeleton({
  height = 16,
  width = '100%',
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: ViewProps['style'];
}) {
  return <View style={[styles.skeleton, { height, width }, style]} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <AppText variant="muted" style={{ marginTop: Spacing[3] }}>
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  illustration,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  message?: string;
  illustration?: ReactNode;
  primaryAction?: { title: string; onPress: () => void };
  secondaryAction?: { title: string; onPress: () => void };
}) {
  return (
    <View style={styles.emptyState}>
      {illustration ? <View style={{ marginBottom: Spacing[4] }}>{illustration}</View> : null}
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="muted" style={{ textAlign: 'center', marginTop: Spacing[2] }}>
          {message}
        </AppText>
      ) : null}
      {primaryAction ? (
        <View style={{ marginTop: Spacing[5], alignSelf: 'stretch' }}>
          <Button title={primaryAction.title} onPress={primaryAction.onPress} />
        </View>
      ) : null}
      {secondaryAction ? (
        <View style={{ marginTop: Spacing[2], alignSelf: 'stretch' }}>
          <Button
            title={secondaryAction.title}
            variant="secondary"
            onPress={secondaryAction.onPress}
          />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.centered}>
      <AppText variant="error" style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      {onRetry ? (
        <View style={{ marginTop: Spacing[4] }}>
          <Button title="Retry" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function ProLockState({
  feature,
  onUpgrade,
  illustration,
}: {
  feature: string;
  onUpgrade?: () => void;
  illustration?: ReactNode;
}) {
  return (
    <View style={styles.centered}>
      {illustration ? <View style={{ marginBottom: Spacing[4] }}>{illustration}</View> : null}
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        Pro feature
      </AppText>
      <AppText variant="muted" style={{ textAlign: 'center', marginTop: Spacing[2] }}>
        Upgrade to Pro to unlock {feature}.
      </AppText>
      {onUpgrade ? (
        <View style={{ marginTop: Spacing[4], alignSelf: 'stretch' }}>
          <Button title="View upgrade options" onPress={onUpgrade} />
        </View>
      ) : null}
    </View>
  );
}

const textVariants = StyleSheet.create({
  body: {
    color: Colors.foreground,
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
  },
  muted: {
    color: Colors.foregroundMuted,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
  label: {
    color: Colors.gray700,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
  title: {
    color: Colors.foreground,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
  },
  heading: {
    color: Colors.foreground,
    fontFamily: FontFamily.display,
    fontSize: FontSize['3xl'],
  },
  brand: {
    color: Colors.foreground,
    fontFamily: FontFamily.display,
    fontSize: FontSize['3xl'],
  },
  error: {
    color: Colors.errorFg,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
  },
});

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: Colors.accent },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.errorFg },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.backgroundPanel,
  },
  text: {},
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing[3] + 2,
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: HitTarget.min,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.base,
  },
  iconButton: {
    width: HitTarget.min,
    height: HitTarget.min,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: HitTarget.min,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkboxMark: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    lineHeight: 16,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
  skeleton: {
    backgroundColor: Colors.gray200,
    borderRadius: Radius.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[8],
    paddingHorizontal: Spacing[4],
    minHeight: 220,
  },
});
