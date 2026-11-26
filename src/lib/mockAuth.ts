export const MOCK_USER_ID = 'local-mock-user';

export function isMockUserId(userId: string | null | undefined) {
  return __DEV__ && userId === MOCK_USER_ID;
}
