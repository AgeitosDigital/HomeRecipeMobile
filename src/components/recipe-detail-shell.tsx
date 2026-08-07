import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeartIcon } from '@/components/icons';
import { AppText, Button } from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  Radius,
  Spacing,
} from '@/constants/theme';

const placeholder = require('../../assets/brand/recipe-placeholder.png');

export function RecipeDetailShell({
  title,
  imageUrl,
  metaLine,
  favorited,
  canFavorite,
  onToggleFavorite,
  cookingMode,
  onToggleCookingMode,
  showSecondaryActions,
  onSaveToCookbook,
  cookbookBusy,
  onAddToGrocery,
  groceryBusy,
  onEdit,
  onDelete,
  onOpenSource,
  ingredients,
  steps,
  headerAccessory,
}: {
  title: string;
  imageUrl: string | null;
  metaLine: string | null;
  favorited: boolean;
  canFavorite: boolean;
  onToggleFavorite?: () => void;
  cookingMode: boolean;
  onToggleCookingMode: () => void;
  showSecondaryActions: boolean;
  onSaveToCookbook?: () => void;
  cookbookBusy?: boolean;
  onAddToGrocery?: () => void;
  groceryBusy?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenSource?: () => void;
  ingredients: string[];
  steps: string[];
  headerAccessory?: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.heroWrap, { marginTop: -insets.top }]}>
        <Image
          source={imageUrl ? { uri: imageUrl } : placeholder}
          style={[styles.hero, { paddingTop: insets.top }]}
          contentFit="cover"
        />
        {headerAccessory}
      </View>

      <View style={styles.body}>
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        {metaLine ? <AppText variant="muted">{metaLine}</AppText> : null}

        <View style={styles.actionRow}>
          {canFavorite && onToggleFavorite ? (
            <Pressable
              onPress={onToggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}>
              <HeartIcon
                size={22}
                color={favorited ? Colors.accent : Colors.foreground}
                filled={favorited}
              />
            </Pressable>
          ) : null}
          <Button
            title={cookingMode ? 'Exit cooking' : 'Cooking mode'}
            variant={cookingMode ? 'secondary' : 'primary'}
            compact
            onPress={onToggleCookingMode}
          />
          {showSecondaryActions && onSaveToCookbook ? (
            <Button
              title="Cookbook"
              variant="secondary"
              compact
              loading={cookbookBusy}
              onPress={onSaveToCookbook}
            />
          ) : null}
          {showSecondaryActions && onAddToGrocery ? (
            <Button
              title="Grocery"
              variant="secondary"
              compact
              loading={groceryBusy}
              onPress={onAddToGrocery}
            />
          ) : null}
          {showSecondaryActions && onEdit ? (
            <Button title="Edit" variant="soft" compact onPress={onEdit} />
          ) : null}
          {showSecondaryActions && onOpenSource ? (
            <Button title="Source" variant="ghost" compact onPress={onOpenSource} />
          ) : null}
          {showSecondaryActions && onDelete ? (
            <Button title="Delete" variant="ghost" compact onPress={onDelete} />
          ) : null}
        </View>

        {ingredients.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="title">Ingredients</AppText>
            {ingredients.map((line, index) => (
              <View key={`${index}-${line}`} style={styles.ingredientRow}>
                <View style={styles.bullet} />
                <AppText
                  style={[styles.line, cookingMode && styles.lineLarge, { flex: 1 }]}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {steps.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="title">Steps</AppText>
            {steps.map((line, index) => (
              <View key={`${index}-${line}`} style={styles.stepCard}>
                <View style={styles.stepNum}>
                  <AppText style={styles.stepNumText}>{index + 1}</AppText>
                </View>
                <AppText
                  style={[styles.line, cookingMode && styles.lineLarge, { flex: 1 }]}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 0 },
  heroWrap: {
    width: '100%',
    backgroundColor: Colors.gray100,
  },
  hero: {
    width: '100%',
    height: 280,
    backgroundColor: Colors.gray100,
  },
  body: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[12],
  },
  title: {
    fontSize: FontSize['2xl'],
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    alignItems: 'center',
  },
  iconBtn: {
    width: HitTarget.min,
    height: HitTarget.min,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentMutedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: Spacing[2],
    gap: Spacing[3],
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    marginTop: 7,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    backgroundColor: Colors.backgroundPanel,
    borderRadius: Radius.lg,
    padding: Spacing[3],
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: Colors.white,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.sm,
  },
  line: {
    color: Colors.foreground,
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  lineLarge: { fontSize: 18, lineHeight: 28 },
});
