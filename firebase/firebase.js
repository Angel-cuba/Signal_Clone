import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Capturamos getApps() ANTES de initializeApp para detectar correctamente
// los Fast Refresh de Expo: en el primer arranque la lista está vacía y
// llamamos initializeAuth; en recargas posteriores la app ya existe y
// sólo recuperamos la instancia con getAuth para evitar "already-initialized".
// initializeAuth registra el componente de Auth en Hermes + New Architecture,
// evitando "Component auth has not been registered yet".
// getReactNativePersistence garantiza que la sesión sobreviva reinicios.
const apps = getApps();
const app = apps.length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = apps.length === 0
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
