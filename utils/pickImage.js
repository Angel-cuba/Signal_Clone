import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

const PICKER_OPTIONS = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

/**
 * Abstrae el resultado de expo-image-picker para compatibilidad entre SDK versions.
 * SDK 42:  result.cancelled / result.uri
 * SDK 44+: result.canceled  / result.assets[0].uri
 */
const getPickedUri = (result) => {
  // SDK 44+ shape
  if ('canceled' in result) {
    return result.canceled ? null : result.assets?.[0]?.uri ?? null;
  }
  // SDK 42 shape (expo-image-picker <13)
  return result.cancelled ? null : result.uri ?? null;
};

/**
 * Abre la cámara y devuelve la URI local de la imagen, o null si se cancela/deniega.
 * @param {string} permissionMessage Texto del Alert de permiso denegado
 */
export const pickImageFromCamera = async (permissionMessage = 'Camera access is needed.') => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', permissionMessage);
      return null;
    }
  }
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  return getPickedUri(result);
};

/**
 * Abre la galería y devuelve la URI local de la imagen, o null si se cancela/deniega.
 * @param {string} permissionMessage Texto del Alert de permiso denegado
 */
export const pickImageFromGallery = async (permissionMessage = 'Gallery access is needed.') => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', permissionMessage);
      return null;
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return getPickedUri(result);
};
