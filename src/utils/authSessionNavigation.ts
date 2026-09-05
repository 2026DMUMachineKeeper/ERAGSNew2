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
    .catch((error: unknown): void => {
      console.warn('[authSessionNavigation] 인증 정보 정리 실패:', error);
    })
    .then((): void => {
      // 이전 세션 정리가 새 로그인 정보를 지우지 않도록 화면 이동 전에 완료합니다.
      navigation?.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });
};
