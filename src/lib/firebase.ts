import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

type GoogleServicesFile = {
  project_info: { project_id: string; project_number: string; storage_bucket?: string };
  client: Array<{
    client_info: { mobilesdk_app_id: string };
    api_key: Array<{ current_key: string }>;
  }>;
};

// Firebase's Android config contains the public project identifiers needed by
// the JS SDK. Google OAuth client IDs are configured separately in .env.
const googleServices = require('../../google-services.json') as GoogleServicesFile;
const androidClient = googleServices.client[0];
const projectInfo = googleServices.project_info;

const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || androidClient.api_key[0].current_key,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || androidClient.client_info.mobilesdk_app_id,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || projectInfo.project_id,
      messagingSenderId: projectInfo.project_number,
      storageBucket: projectInfo.storage_bucket,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectInfo.project_id}.firebaseapp.com`,
    });

function initializeFirebaseAuth() {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast refresh can evaluate this module again after Auth has initialized.
    return getAuth(app);
  }
}

export const auth = initializeFirebaseAuth();
export const db = getFirestore(app);
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
