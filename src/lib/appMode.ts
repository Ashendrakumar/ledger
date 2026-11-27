// Set to 'mock' to use the local demo account in development.
function configuredMode(): 'api' | 'mock' {
  return 'api';
}

export const APP_MODE = configuredMode();

export const MOCK_USER_ID = 'local-mock-user';

export const isMockMode = __DEV__ && APP_MODE === 'mock';

export function isMockUserId(userId: string | null | undefined) {
  return isMockMode && userId === MOCK_USER_ID;
}
