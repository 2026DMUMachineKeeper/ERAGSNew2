import React from 'react';
import { Alert } from 'react-native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { SettingsProfileState, ProfileValues } from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import {
  getMyPage,
  isAuthSessionExpiredError,
  updateMyPage,
  updateStoredAuthUser,
} from '@/services';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { useAuthStore } from '@/store';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';
import {
  INVALID_KOREAN_PHONE_NUMBER_MESSAGE,
  normalizeOptionalKoreanPhoneNumber,
  showLocationPermissionPrompt,
} from '@/utils';

const PROFILE_LOAD_ERROR_MESSAGE =
  '마이페이지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
const PROFILE_NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인한 후 다시 시도해 주세요.';
const PROFILE_SAVE_ERROR_MESSAGE = '개인 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const getProfileLoadError = (error: unknown): string => {
  if (error instanceof TypeError) {
    return PROFILE_NETWORK_ERROR_MESSAGE;
  }

  return getApiErrorUserMessage(error, {
    fallbackMessage: PROFILE_LOAD_ERROR_MESSAGE,
    statusMessages: {
      503: '마이페이지 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    },
  });
};

export const useSettingsProfile = (
  rootNavigation: NativeStackNavigationProp<RootStackParamList> | undefined,
): SettingsProfileState => {
  const authenticatedUser = useAuthStore(state => state.user);
  const setAuthenticatedUser = useAuthStore(state => state.setUser);
  // 취소 시 마지막 저장값으로 돌아갈 수 있도록 편집 중인 값과 따로 보관합니다.
  const [profile, setProfile] = React.useState<ProfileValues>({
    name: '',
    guardianPhone: '',
  });
  const [draftProfile, setDraftProfile] = React.useState<ProfileValues>({
    name: '',
    guardianPhone: '',
  });
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [guardianPhoneError, setGuardianPhoneError] = React.useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = React.useState(true);
  const [profileLoadError, setProfileLoadError] = React.useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileRequestVersion, setProfileRequestVersion] = React.useState(0);

  React.useEffect(() => {
    // 이전 조회가 늦게 끝나더라도 화면을 떠난 뒤에는 결과를 표시하지 않습니다.
    let isActive = true;

    const loadProfile = async (): Promise<void> => {
      setIsProfileLoading(true);
      setProfileLoadError(null);

      try {
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
        if (!isActive) {
          return;
        }

        if (isAuthSessionExpiredError(error)) {
          redirectToLoginForExpiredSession(rootNavigation);
          return;
        }

        const emptyProfile = { name: '', guardianPhone: '' };
        setProfile(emptyProfile);
        setDraftProfile(emptyProfile);
        setIsEditingProfile(false);
        setNameError(null);
        setGuardianPhoneError(null);
        setProfileLoadError(getProfileLoadError(error));
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
  }, [authenticatedUser, profileRequestVersion, rootNavigation]);

  const handleProfileRetry = React.useCallback((): void => {
    setProfileRequestVersion(currentVersion => currentVersion + 1);
  }, []);

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
    const nextGuardianPhone = normalizeOptionalKoreanPhoneNumber(draftProfile.guardianPhone);
    const nextNameError = nextName.length === 0 ? '이름을 입력해 주세요.' : null;
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
      // 재실행 시 읽는 저장소와 현재 화면이 구독하는 상태를 함께 갱신합니다.
      const updatedUser = await updateStoredAuthUser(updatedProfile);
      setAuthenticatedUser(updatedUser);
      const nextProfile = {
        name: updatedUser.name ?? '',
        guardianPhone: updatedUser.guardian_phone ?? '',
      };
      // 번호를 처음 등록한 시점에만 위치 권한을 안내해 편집할 때마다 반복하지 않습니다.
      const isGuardianPhoneFirstRegistered =
        profile.guardianPhone.length === 0 && nextProfile.guardianPhone.length > 0;

      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      setIsEditingProfile(false);
      Alert.alert('저장 완료', '개인 정보가 수정되었습니다.', [
        {
          text: '확인',
          onPress: isGuardianPhoneFirstRegistered ? showLocationPermissionPrompt : undefined,
        },
      ]);
    } catch (error: unknown) {
      if (isAuthSessionExpiredError(error)) {
        redirectToLoginForExpiredSession(rootNavigation);
        return;
      }

      console.warn('[useSettingsProfile] 프로필 저장 실패:', error);
      Alert.alert(
        '저장 실패',
        getApiErrorUserMessage(error, {
          codeMessages: {
            INVALID_REQUEST: '입력한 개인 정보를 다시 확인해 주세요.',
          },
          fallbackMessage: PROFILE_SAVE_ERROR_MESSAGE,
        }),
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleNameChange = React.useCallback((nextName: string): void => {
    setNameError(null);
    setDraftProfile(currentProfile => ({ ...currentProfile, name: nextName }));
  }, []);
  const handleGuardianPhoneChange = React.useCallback((nextPhone: string): void => {
    setGuardianPhoneError(null);
    setDraftProfile(currentProfile => ({ ...currentProfile, guardianPhone: nextPhone }));
  }, []);
  return {
    loadError: profileLoadError,
    onRetry: handleProfileRetry,
    form: {
      values: draftProfile,
      errors: { name: nameError, guardianPhone: guardianPhoneError },
      isLoading: isProfileLoading,
      isEditing: isEditingProfile,
      isSaving: isSavingProfile,
      onEdit: handleEditProfilePress,
      onCancel: handleCancelProfilePress,
      onSave: handleSaveProfilePress,
      onNameChange: handleNameChange,
      onGuardianPhoneChange: handleGuardianPhoneChange,
    },
  };
};
