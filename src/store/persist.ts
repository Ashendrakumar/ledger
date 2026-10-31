import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** One place to swap storage later (MMKV, SQLite). */
export const storage = createJSONStorage(() => AsyncStorage);
