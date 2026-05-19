import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebase';

/**
 * Sube una imagen local (URI) a Firebase Storage y devuelve la URL pública.
 * @param {string} localUri  - URI local devuelta por expo-image-picker
 * @param {string} folder    - Carpeta destino en Storage (ej: "avatars", "chats")
 * @returns {Promise<string>} URL remota de la imagen
 */
export const uploadImageToStorage = async (localUri, folder = 'images') => {
  if (!localUri) throw new Error('No image URI provided');

  // Convertir la URI local a Blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  // Nombre único basado en timestamp
  const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);

  return getDownloadURL(storageRef);
};
