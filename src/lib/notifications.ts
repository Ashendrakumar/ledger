export const Notifications = {
  setNotificationHandler: () => {},
  requestPermissionsAsync: async () => ({ granted: false }),
  getPermissionsAsync: async () => ({ granted: false }),
  getExpoPushTokenAsync: async () => null,
  scheduleNotificationAsync: async () => null,
  cancelScheduledNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseListener: () => ({ remove: () => {} }),
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  SchedulableTriggerInputTypes: { DATE: 'date' },
} as any;
