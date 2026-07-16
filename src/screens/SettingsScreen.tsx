import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { clearAuthSession, logout } from '../services';
import type { MainTabParamList } from '../navigation/MainTabNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SettingsScreen({
  navigation,
}: SettingsScreenProps): React.JSX.Element {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const moveToLogin = React.useCallback(() => {
    const rootNavigation =
      navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

    rootNavigation?.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [navigation]);

  const handleLogout = React.useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
      moveToLogin();
    } catch (error) {
      console.warn('[SettingsScreen] logout failed:', error);

      try {
        await clearAuthSession();
      } finally {
        Alert.alert(
          '로그아웃',
          '로그아웃되었습니다. 다시 이용하려면 로그인해주세요.',
        );
        moveToLogin();
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, moveToLogin]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-1 px-5 pt-12">
        <Text className="text-title text-black font-suitBold">설정</Text>
        <Text className="mt-2 text-body text-textDim">
          앱 사용에 필요한 기본 설정을 관리합니다.
        </Text>

        <View className="mt-8 rounded-2xl bg-white px-4 py-2">
          <TouchableOpacity
            className="min-h-[56px] flex-row items-center justify-between border-b border-memoLine"
            onPress={() => Linking.openSettings()}
          >
            <View className="flex-1 pr-4">
              <Text className="text-body text-black font-suitBold">
                앱 권한 설정
              </Text>
              <Text className="mt-1 text-coment text-textDim">
                카메라, 마이크 등 기기 권한을 확인합니다.
              </Text>
            </View>
            <Text className="text-title2 text-textDim">›</Text>
          </TouchableOpacity>

          <View className="min-h-[56px] justify-center">
            <Text className="text-body text-black font-suitBold">
              자동 로그인
            </Text>
            <Text className="mt-1 text-coment text-textDim">
              저장된 로그인 정보가 있으면 홈으로 바로 이동합니다.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          className="mt-6 h-14 items-center justify-center rounded-2xl bg-red"
          disabled={isLoggingOut}
          onPress={handleLogout}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-body text-white font-suitBold">
              로그아웃
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
