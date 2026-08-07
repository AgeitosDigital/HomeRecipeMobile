import { Alert, Linking, ActionSheetIOS, Platform } from 'react-native';
import type * as ImagePickerType from 'expo-image-picker';

const MAX_BYTES = 8 * 1024 * 1024;

export type PickedRecipeImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

type ImagePickerModule = typeof ImagePickerType;

function loadImagePicker(): ImagePickerModule | null {
  try {
    // Lazy require so a stale native binary fails here with a clear message
    // instead of crashing the create screen on import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as ImagePickerModule;
  } catch {
    return null;
  }
}

function missingNativeModuleAlert() {
  Alert.alert(
    'App rebuild required',
    'Photo picking needs a fresh native build after adding camera support. Run npx expo run:ios (or rebuild your Dev Client), then try again.',
  );
}

async function ensureCameraPermission(
  ImagePicker: ImagePickerModule
): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    Alert.alert(
      'Camera access needed',
      'Enable camera access in Settings to photograph your dish.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]
    );
    return false;
  }
  const requested = await ImagePicker.requestCameraPermissionsAsync();
  if (!requested.granted) {
    Alert.alert('Camera permission denied', 'You can still choose a photo from your library.');
    return false;
  }
  return true;
}

function assetToPicked(
  asset: ImagePickerType.ImagePickerAsset
): PickedRecipeImage | null {
  if (!asset.uri) return null;
  if (asset.fileSize != null && asset.fileSize > MAX_BYTES) {
    Alert.alert('Image too large', 'Please choose an image under 8MB.');
    return null;
  }
  const mimeType = asset.mimeType ?? 'image/jpeg';
  const fileName =
    asset.fileName ??
    `recipe-${Date.now()}.${mimeType.includes('png') ? 'png' : 'jpg'}`;
  return { uri: asset.uri, mimeType, fileName };
}

async function launchCamera(
  ImagePicker: ImagePickerModule
): Promise<PickedRecipeImage | null> {
  const ok = await ensureCameraPermission(ImagePicker);
  if (!ok) return null;
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return null;
    return assetToPicked(result.assets[0]);
  } catch {
    missingNativeModuleAlert();
    return null;
  }
}

async function launchLibrary(
  ImagePicker: ImagePickerModule
): Promise<PickedRecipeImage | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return null;
    return assetToPicked(result.assets[0]);
  } catch {
    missingNativeModuleAlert();
    return null;
  }
}

/**
 * Present Take photo / Choose from library / Remove (optional) / Cancel.
 */
export function pickRecipeImage(options?: {
  hasExisting?: boolean;
}): Promise<PickedRecipeImage | null | 'removed'> {
  const ImagePicker = loadImagePicker();
  if (!ImagePicker) {
    missingNativeModuleAlert();
    return Promise.resolve(null);
  }

  // Native module present in JS package but missing from binary (stale dev client).
  try {
    // Touching a native-backed API confirms the module is linked.
    void ImagePicker.getCameraPermissionsAsync;
  } catch {
    missingNativeModuleAlert();
    return Promise.resolve(null);
  }

  const hasExisting = options?.hasExisting ?? false;

  return new Promise((resolve) => {
    const buttons = ['Take photo', 'Choose from library'];
    if (hasExisting) buttons.push('Remove photo');
    buttons.push('Cancel');
    const cancelButtonIndex = buttons.length - 1;
    const destructiveButtonIndex = hasExisting ? 2 : undefined;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: buttons,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        async (index) => {
          if (index === 0) resolve(await launchCamera(ImagePicker));
          else if (index === 1) resolve(await launchLibrary(ImagePicker));
          else if (hasExisting && index === 2) resolve('removed');
          else resolve(null);
        }
      );
      return;
    }

    Alert.alert('Recipe photo', undefined, [
      {
        text: 'Take photo',
        onPress: () => void launchCamera(ImagePicker).then(resolve),
      },
      {
        text: 'Choose from library',
        onPress: () => void launchLibrary(ImagePicker).then(resolve),
      },
      ...(hasExisting
        ? [
            {
              text: 'Remove photo',
              style: 'destructive' as const,
              onPress: () => resolve('removed'),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
