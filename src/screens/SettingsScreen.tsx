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

import {
  ProfileEditActions,
  ProfileField,
  SettingsActionRow,
  SettingsIcon,
} from '@/screens/settings/components';
import type { MainTabParamList } from '../navigation/MainTabNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  clearAuthSession,
  getMyPage,
  getStoredAuthUser,
  isAuthSessionExpiredError,
  logout,
  updateMyPage,
  updateStoredAuthUser,
} from '../services';
import tailwindConfig from '../../tailwind.config';

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { colors } = tailwindConfig;

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

export const SettingsScreen = ({
  navigation,
}: SettingsScreenProps): React.JSX.Element => {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [profile, setProfile] = React.useState({
    name: '',
    guardianPhone: '',
  });
  const [draftProfile, setDraftProfile] = React.useState({
    name: '',
    guardianPhone: '',
  });
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);
  const [profileLoadError, setProfileLoadError] = React.useState<string | null>(
    null,
  );
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

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

  React.useEffect(() => {
    let isActive = true;

    const loadProfile = async (): Promise<void> => {
      setProfileLoadError(null);

      try {
        const storedUser = await getStoredAuthUser();
        const storedProfile = {
          name: storedUser?.name?.trim() ?? '',
          guardianPhone: storedUser?.guardian_phone?.trim() ?? '',
        };

        if (isActive) {
          setProfile(storedProfile);
          setDraftProfile(storedProfile);
        }

        if (!storedUser) {
          return;
        }

        const myPageProfile = await getMyPage(storedUser.id);
        const nextProfile = {
          name: myPageProfile.name.trim(),
          guardianPhone: myPageProfile.guardian_phone.trim(),
        };

        await updateStoredAuthUser(myPageProfile);

        if (isActive) {
          setProfile(nextProfile);
          setDraftProfile(nextProfile);
        }
      } catch (error: unknown) {
        console.warn('[SettingsScreen] profile load failed:', error);

        if (!isActive) {
          return;
        }

        if (isAuthSessionExpiredError(error)) {
          moveToLogin();
          return;
        }

        const errorMessage =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : '마이페이지 정보를 불러오지 못했습니다.';

        setProfileLoadError(
          `${errorMessage} 저장된 정보를 대신 표시하고 있습니다.`,
        );
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [moveToLogin]);

  const handleEditProfilePress = (): void => {
    setDraftProfile(profile);
    setIsEditingProfile(true);
  };

  const handleCancelProfilePress = (): void => {
    setDraftProfile(profile);
    setIsEditingProfile(false);
  };

  const handleSaveProfilePress = async (): Promise<void> => {
    const nextName = draftProfile.name.trim();
    const nextGuardianPhone = draftProfile.guardianPhone.trim();

    if (nextName.length === 0) {
      Alert.alert('입력 필요', '이름을 입력해주세요.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const storedUser = await getStoredAuthUser();

      if (
        !storedUser ||
        !Number.isInteger(storedUser.id) ||
        storedUser.id <= 0
      ) {
        throw new Error('로그인 사용자 정보를 확인할 수 없습니다.');
      }

      const updatedProfile = await updateMyPage(storedUser.id, {
        name: nextName,
        guardian_phone: nextGuardianPhone,
      });
      const updatedUser = await updateStoredAuthUser(updatedProfile);
      const nextProfile = {
        name: updatedUser.name ?? '',
        guardianPhone: updatedUser.guardian_phone ?? '',
      };

      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      setIsEditingProfile(false);
      Alert.alert('저장 완료', '개인 정보가 수정되었습니다.');
    } catch (error: unknown) {
      if (isAuthSessionExpiredError(error)) {
        moveToLogin();
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : '개인 정보를 수정하지 못했습니다.';

      console.warn('[SettingsScreen] profile update failed:', error);
      Alert.alert('저장 실패', errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
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

  const namePlaceholder = isProfileLoading
    ? '불러오는 중...'
    : '이름이 등록되지 않았습니다';
  const guardianPhonePlaceholder = isProfileLoading
    ? '불러오는 중...'
    : '등록된 번호가 없습니다';
  const isProfileEditable =
    isEditingProfile && !isProfileLoading && !isSavingProfile;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pt-10">
            <Text className="text-title font-suitBold text-black">
              마이페이지
            </Text>

            {profileLoadError ? (
              <View className="mt-4 rounded-xl border border-red bg-camera_bg px-4 py-3">
                <Text className="text-coment font-suitBold text-red">
                  정보를 불러오지 못했습니다
                </Text>
                <Text className="mt-1 text-sm font-suitMedium leading-5 text-textDim">
                  {profileLoadError}
                </Text>
              </View>
            ) : null}

            <View
              className="mt-6 overflow-hidden rounded-2xl bg-white px-5 py-5"
              style={styles.profileCard}
            >
              <View className="min-h-[40px] flex-row items-center">
                <View className="flex-row items-center">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-camera_bg">
                    <SettingsIcon color={colors.red} name="user" size={20} />
                  </View>
                  <Text className="ml-3 text-body font-suitBold text-black">
                    개인 정보
                  </Text>
                </View>
              </View>

              <ProfileField
                config={{
                  iconName: 'user',
                  label: '이름',
                  placeholder: namePlaceholder,
                }}
                editable={isProfileEditable}
                onChangeText={value =>
                  setDraftProfile(currentProfile => ({
                    ...currentProfile,
                    name: value,
                  }))
                }
                value={draftProfile.name}
              />
              <ProfileField
                config={{
                  iconName: 'phone',
                  keyboardType: 'phone-pad',
                  label: '보호자 전화번호',
                  placeholder: guardianPhonePlaceholder,
                }}
                editable={isProfileEditable}
                onChangeText={value =>
                  setDraftProfile(currentProfile => ({
                    ...currentProfile,
                    guardianPhone: value,
                  }))
                }
                value={draftProfile.guardianPhone}
              />

              <ProfileEditActions
                handlers={{
                  onCancel: handleCancelProfilePress,
                  onEdit: handleEditProfilePress,
                  onSave: handleSaveProfilePress,
                }}
                isEditing={isEditingProfile}
                isLoading={isProfileLoading}
                isSaving={isSavingProfile}
              />
            </View>

            <View
              className="mt-4 overflow-hidden rounded-2xl bg-white"
              style={styles.actionCard}
            >
              <SettingsActionRow
                iconName="lock"
                label="비밀번호 재설정"
                onPress={handlePasswordResetPress}
                variant="default"
              />
            </View>

            <View
              className="mt-4 overflow-hidden rounded-2xl bg-white"
              style={styles.actionCard}
            >
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
