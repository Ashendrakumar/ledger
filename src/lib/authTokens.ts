import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'ledger.refresh-token';
let webRefreshToken: string | null = null;

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return webRefreshToken;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    webRefreshToken = token;
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') {
    webRefreshToken = null;
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
