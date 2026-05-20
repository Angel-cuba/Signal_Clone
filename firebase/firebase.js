import { initializeApp, getApps, getApp } from 'firebase/app';
// getAuth is used in the Fast Refresh branch — do not remove.
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

// Firebase JS SDK v10 usa registro lazy de componentes.
// initializeAuth debe llamarse al menos una vez para registrar el proveedor
// de Auth en la app con persistencia explícita (no hay default en React Native).
// Sin esto, getAuth() lanza "Component auth has not been registered yet" en
// Hermes + New Architecture porque _getProvider('auth') no encuentra el proveedor.
//
// Expo Fast Refresh re-evalúa módulos JS sin reiniciar el runtime nativo.
// Si llamáramos initializeApp/initializeAuth en cada evaluación, lanzarían
// "already-initialized". Estrategia:
//   — Snapshot de getApps() ANTES de initializeApp.
//   — Primer arranque: lista vacía → llamar initializeApp + initializeAuth.
//   — Fast Refresh: lista no vacía → getApp() + getAuth() para recuperar instancias.
//   — try/catch como fallback por si el registro de app y auth se desincroniza.
const apps = getApps();
const app = apps.length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = apps.length === 0
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);
} catch (e) {
  // Solo capturamos auth/already-initialized (evaluación doble en Fast Refresh).
  // Cualquier otro error (AsyncStorage no disponible, config inválida) debe propagarse.
  if (e?.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw e;
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
