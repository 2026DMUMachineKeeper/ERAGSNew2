import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { clearAuthSession } from '@/services/auth.service';

type RootLoginNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList>,
  'reset'
>;

export const redirectToLoginForExpiredSession = (
  navigation: RootLoginNavigation | undefined,
): void => {
  clearAuthSession().catch(error => {
    console.warn('[authSessionNavigation] clear auth session failed:', error);
  });

  navigation?.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });
};
