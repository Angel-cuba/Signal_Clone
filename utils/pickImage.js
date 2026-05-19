import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

// expo-image-picker 16+ uses string literal 'images' instead of deprecated MediaTypeOptions enum
const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

// SDK 16+ always returns { canceled, assets } shape
const getPickedUri = (result) =>
  result.canceled ? null : result.assets?.[0]?.uri ?? null;

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
