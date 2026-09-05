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
  getMyPage,
  isAuthSessionExpiredError,
  updateMyPage,
  updateStoredAuthUser,
} from '../services';
import { useAuthStore } from '../store';
import {
  INVALID_KOREAN_PHONE_NUMBER_MESSAGE,
  normalizeOptionalKoreanPhoneNumber,
  showLocationPermissionPrompt,
} from '../utils';
import tailwindConfig from '../../tailwind.config';

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { colors } = tailwindConfig;
const PROFILE_LOAD_ERROR_MESSAGE =
  '마이페이지 정보를 불러오지 못했습니다. 저장된 정보를 대신 표시합니다.';
const PROFILE_SAVE_ERROR_MESSAGE =
  '개인 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';

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
  const authenticatedUser = useAuthStore(state => state.user);
  const setAuthenticatedUser = useAuthStore(state => state.setUser);
  const signOut = useAuthStore(state => state.signOut);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [profile, setProfile] = React.useState({
    name: '',
    guardianPhone: '',
  });
  const [draftProfile, setDraftProfile] = React.useState({
    name: '',
    guardianPhone: '',
  });
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [guardianPhoneError, setGuardianPhoneError] = React.useState<
    string | null
  >(null);
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
        const storedProfile = {
          name: authenticatedUser?.name?.trim() ?? '',
          guardianPhone: authenticatedUser?.guardian_phone?.trim() ?? '',
        };

        if (isActive) {
          setProfile(storedProfile);
          setDraftProfile(storedProfile);
        }

        if (!authenticatedUser) {
          return;
        }

        const myPageProfile = await getMyPage(authenticatedUser.id);
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

        setProfileLoadError(PROFILE_LOAD_ERROR_MESSAGE);
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
  }, [authenticatedUser, moveToLogin]);

  const handleEditProfilePress = (): void => {
    setDraftProfile(profile);
    setNameError(null);
    setGuardianPhoneError(null);
    setIsEditingProfile(true);
  };

  const handleCancelProfilePress = (): void => {
    setDraftProfile(profile);
    setNameError(null);
    setGuardianPhoneError(null);
    setIsEditingProfile(false);
  };

  const handleSaveProfilePress = async (): Promise<void> => {
    const nextName = draftProfile.name.trim();
    const nextGuardianPhone = normalizeOptionalKoreanPhoneNumber(
      draftProfile.guardianPhone,
    );
    const nextNameError =
      nextName.length === 0 ? '이름을 입력해 주세요.' : null;
    const nextGuardianPhoneError =
      nextGuardianPhone === null ? INVALID_KOREAN_PHONE_NUMBER_MESSAGE : null;

    setNameError(nextNameError);
    setGuardianPhoneError(nextGuardianPhoneError);

    if (nextNameError || nextGuardianPhone === null) {
      return;
    }

    setIsSavingProfile(true);

    try {
      if (
        !authenticatedUser ||
        !Number.isInteger(authenticatedUser.id) ||
        authenticatedUser.id <= 0
      ) {
        throw new Error('로그인 사용자 정보를 확인할 수 없습니다.');
      }

      const updatedProfile = await updateMyPage(authenticatedUser.id, {
        name: nextName,
        guardian_phone: nextGuardianPhone,
      });
      const updatedUser = await updateStoredAuthUser(updatedProfile);
      setAuthenticatedUser(updatedUser);
      const nextProfile = {
        name: updatedUser.name ?? '',
        guardianPhone: updatedUser.guardian_phone ?? '',
      };
      const isGuardianPhoneFirstRegistered =
        profile.guardianPhone.length === 0 &&
        nextProfile.guardianPhone.length > 0;

      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      setIsEditingProfile(false);
      Alert.alert('저장 완료', '개인 정보가 수정되었습니다.', [
        {
          text: '확인',
          onPress: isGuardianPhoneFirstRegistered
            ? showLocationPermissionPrompt
            : undefined,
        },
      ]);
    } catch (error: unknown) {
      if (isAuthSessionExpiredError(error)) {
        moveToLogin();
        return;
      }

      console.warn('[SettingsScreen] profile update failed:', error);
      Alert.alert('저장 실패', PROFILE_SAVE_ERROR_MESSAGE);
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
      await signOut();
      moveToLogin();
    } catch (error) {
      console.warn('[SettingsScreen] logout failed:', error);
      Alert.alert(
        '로그아웃',
        '로그아웃되었습니다. 다시 이용하려면 로그인해주세요.',
      );
      moveToLogin();
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, moveToLogin, signOut]);

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
                errorMessage={nameError ?? undefined}
                onChangeText={value => {
                  setNameError(null);
                  setDraftProfile(currentProfile => ({
                    ...currentProfile,
                    name: value,
                  }));
                }}
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
                errorMessage={guardianPhoneError ?? undefined}
                onChangeText={value => {
                  setGuardianPhoneError(null);
                  setDraftProfile(currentProfile => ({
                    ...currentProfile,
                    guardianPhone: value,
                  }));
                }}
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
