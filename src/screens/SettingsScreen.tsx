import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { MainTabParamList } from '../navigation/MainTabNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { clearAuthSession, logout } from '../services';

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const SettingsScreen = ({
  navigation,
}: SettingsScreenProps): React.JSX.Element => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const moveToLogin = React.useCallback((): void => {
    rootNavigation?.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [rootNavigation]);

  const handlePasswordResetPress = (): void => {
    rootNavigation?.navigate('PasswordReset');
  };

  const handleLogout = React.useCallback(async (): Promise<void> => {
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
        <Text className="text-title font-suitBold text-black">설정</Text>

        <View className="mt-8 rounded-2xl bg-white px-4 py-2">
          <TouchableOpacity
            className="min-h-[64px] flex-row items-center justify-between py-3"
            onPress={handlePasswordResetPress}
          >
            <View className="flex-1 pr-4">
              <Text className="text-body font-suitBold text-black">
                비밀번호 재설정
              </Text>
            </View>
            <Text className="text-title2 text-textDim">›</Text>
          </TouchableOpacity>
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
            <Text className="text-body font-suitBold text-white">
              로그아웃
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
