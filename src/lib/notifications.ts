import * as ExpoNotifications from 'expo-notifications';

/**
 * Real expo-notifications binding used by the app (local/EMI reminders).
 * Re-exported as a single `Notifications` object to preserve existing imports.
 *
 * Note: push/remote notification features and some behaviors require a
 * development build or production build (Expo Go support is limited on Android).
 */
export const Notifications = ExpoNotifications;
export type * from 'expo-notifications';

