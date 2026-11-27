import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { GoogleOneTapSignIn } from 'react-native-nitro-google-signin';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import type { Entry, User } from '@/types';
import { auth } from '@/lib/firebase';
import { loadSetupComplete, markSetupComplete } from '@/lib/firebaseData';
import { storage } from './persist';
import { isMockMode, MOCK_USER_ID } from '@/lib/appMode';

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setupComplete: boolean;
  sessionChecked: boolean;
  completeSetup: (entries: Entry[]) => Promise<void>;
  signInWithMockUser: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

let sessionRestore: Promise<void> | null = null;

function mapUser(user: FirebaseUser): User {
  return {
    id: user.uid,
    email: user.email ?? '',
    ...(user.displayName ? { name: user.displayName } : {}),
  };
}

async function storeFirebaseUser(user: FirebaseUser) {
  const previous = useAuth.getState();
  if (previous.user?.id !== MOCK_USER_ID && previous.user?.email?.toLowerCase() === user.email?.toLowerCase() && previous.user.id !== user.uid) {
    await AsyncStorage.setItem('ledger.firestore-claim-local-once', user.uid);
  }
  const sameLegacyAccount = previous.user?.email?.toLowerCase() === user.email?.toLowerCase();
  let setupComplete = (previous.user?.id === user.uid || sameLegacyAccount) && previous.setupComplete;
  try {
    setupComplete = await loadSetupComplete(user, setupComplete);
  } catch {
    // Auth remains available if the profile write is offline or rules have not
    // been deployed yet. The locally persisted onboarding state is retained.
  }
  useAuth.setState({ user: mapUser(user), setupComplete, sessionChecked: true });
}

async function afterSignIn(user: FirebaseUser) {
  await storeFirebaseUser(user);
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      setupComplete: false,
      sessionChecked: false,
      completeSetup: async () => {
        set({ setupComplete: true });
        const current = auth.currentUser;
        if (current) await markSetupComplete(current.uid, current.displayName);
      },
      signInWithMockUser: async (email) => {
        if (!__DEV__ || !isMockMode) throw new Error('Mock sign-in is not enabled.');
        set({
          user: { id: MOCK_USER_ID, email: email.trim().toLowerCase(), name: 'Demo User' },
          setupComplete: false,
          sessionChecked: true,
        });
      },
      signIn: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await afterSignIn(credential.user);
      },
      createAccount: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
        await afterSignIn(credential.user);
      },
      signInWithGoogleToken: async (idToken) => {
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        await afterSignIn(result.user);
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      },
      restoreSession: async () => {
        if (!get().hydrated || get().sessionChecked) return;
        if (sessionRestore) return sessionRestore;
        sessionRestore = new Promise<void>((resolve) => {
          let unsubscribe = () => {};
          unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            unsubscribe();
            if (!firebaseUser) {
              set({ user: null, setupComplete: false, sessionChecked: true });
              resolve();
              return;
            }
            void storeFirebaseUser(firebaseUser).finally(resolve);
          }, () => {
            unsubscribe();
            set({ sessionChecked: true });
            resolve();
          });
        });
        try {
          await sessionRestore;
        } finally {
          sessionRestore = null;
        }
      },
      signOut: async () => {
        await firebaseSignOut(auth);
        if (Platform.OS !== 'web') await GoogleOneTapSignIn.signOut().catch(() => {});
        set({ user: null, setupComplete: false, sessionChecked: true });
      },
    }),
    {
      name: 'ledger.auth',
      storage,
      // Keep the prior version so an existing custom-backend session can be
      // read once and its local records can be claimed by a matching Firebase account.
      version: 1,
      partialize: (state) => ({ user: state.user, setupComplete: state.setupComplete }),
      onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }),
    },
  ),
);

import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin: any = null;
if (!isExpoGo) {
  try {
    GoogleSignin = require('react-native-nitro-google-signin');
  } catch (e) {
    console.warn('Google Sign-In native module unavailable', e);
  }
}
