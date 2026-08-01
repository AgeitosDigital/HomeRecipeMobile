import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeartIcon } from '@/components/icons';
import { AppText } from '@/components/ui';
import { Colors, FontFamily, FontSize, HitTarget, Radius, Shadows, Spacing } from '@/constants/theme';
import type { RecipeListItem } from '@/lib/types';

const placeholder = require('../../assets/brand/recipe-placeholder.png');

export function RecipeCard({
  recipe,
  onPress,
  onToggleFavorite,
  favorited,
  compact,
}: {
  recipe: RecipeListItem;
  onPress: () => void;
  onToggleFavorite?: () => void;
  favorited?: boolean;
  /** Narrow card for horizontal carousels */
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        Shadows.card,
        pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}>
      <Image
        source={recipe.image_url ? { uri: recipe.image_url } : placeholder}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
        locations={[0.35, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <AppText numberOfLines={3} style={styles.title}>
          {recipe.recipe_label}
        </AppText>
        {recipe.time_in_minutes ? (
          <AppText style={styles.meta}>{recipe.time_in_minutes} min</AppText>
        ) : null}
      </View>
      {onToggleFavorite ? (
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite();
          }}
          style={styles.heart}>
          <HeartIcon
            size={22}
            color={favorited ? Colors.accent : Colors.white}
            filled={favorited}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 224,
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    marginBottom: Spacing[3],
    backgroundColor: Colors.gray200,
  },
  cardCompact: {
    width: 200,
    height: 180,
    marginBottom: 0,
    marginRight: Spacing[3],
  },
  content: {
    position: 'absolute',
    left: Spacing[3],
    right: Spacing[3],
    bottom: Spacing[3],
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
  },
  meta: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
  },
  heart: {
    position: 'absolute',
    top: Spacing[3],
    right: Spacing[3],
    width: HitTarget.min - 8,
    height: HitTarget.min - 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
