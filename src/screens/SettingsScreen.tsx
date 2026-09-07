import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { MainTabParamList } from '@/navigation/MainTabNavigator';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useSettingsProfile } from '@/hooks/useSettingsProfile';
import { useAuthStore } from '@/store';

import { SettingsActionRow, SettingsProfileCard, ProfileLoadError } from './settings/components';

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const styles = StyleSheet.create({
  actionCard: {
    elevation: 2,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  profileCard: {
    elevation: 3,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  scrollContent: {
    paddingBottom: 28,
  },
});

export const SettingsScreen = ({ navigation }: SettingsScreenProps): React.JSX.Element => {
  const signOut = useAuthStore(state => state.signOut);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const { form, loadError, onRetry } = useSettingsProfile(rootNavigation);
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
      await signOut();
      moveToLogin();
    } catch (error) {
      console.warn('[SettingsScreen] logout failed:', error);
      Alert.alert('로그아웃', '로그아웃되었습니다. 다시 이용하려면 로그인해주세요.');
      moveToLogin();
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, moveToLogin, signOut]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-10">
            <Text className="text-title font-suitBold text-black">마이페이지</Text>

            {loadError ? <ProfileLoadError message={loadError} onRetry={onRetry} /> : null}

            {!loadError ? <SettingsProfileCard form={form} style={styles.profileCard} /> : null}

            <View className="mt-4 overflow-hidden rounded-2xl bg-white" style={styles.actionCard}>
              <SettingsActionRow
                iconName="lock"
                label="비밀번호 재설정"
                onPress={handlePasswordResetPress}
                variant="default"
              />
            </View>

            <View className="mt-4 overflow-hidden rounded-2xl bg-white" style={styles.actionCard}>
              <SettingsActionRow
                iconName="logout"
                isLoading={isLoggingOut}
                label="로그아웃"
                onPress={handleLogout}
                variant="danger"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
