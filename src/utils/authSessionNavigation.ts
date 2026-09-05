import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useAuthStore } from '@/store';

type RootLoginNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList>,
  'reset'
>;

export const redirectToLoginForExpiredSession = (
  navigation: RootLoginNavigation | undefined,
): void => {
  useAuthStore
    .getState()
    .clearSession()
    .catch(error => {
      console.warn('[authSessionNavigation] clear auth session failed:', error);
    });

  navigation?.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });
};
