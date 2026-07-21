import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type KeyboardTypeOptions,
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
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { MainTabParamList } from '../navigation/MainTabNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  clearAuthSession,
  getStoredAuthUser,
  logout,
  updateStoredAuthUser,
} from '../services';
import tailwindConfig from '../../tailwind.config';

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

type ProfileFieldProps = {
  editable: boolean;
  iconName: 'phone' | 'user';
  keyboardType?: KeyboardTypeOptions;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

type IconProps = {
  color: string;
  size?: number;
};

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

const UserIcon = ({ color, size = 22 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={2} />
    <Path
      d="M5 20C5.7 16.6 8.2 14.6 12 14.6C15.8 14.6 18.3 16.6 19 20"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={2}
    />
  </Svg>
);

const PhoneIcon = ({ color, size = 22 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.4 4.6L9.5 9.3L7.8 10.7C8.9 13 10.9 15 13.3 16.2L14.7 14.5L19.4 16.6C19.8 16.8 20 17.2 19.9 17.6C19.7 18.8 19.1 19.7 18.3 20.4C17.8 20.8 17.2 21 16.6 21C9.1 21 3 14.9 3 7.4C3 6.8 3.2 6.2 3.6 5.7C4.3 4.9 5.2 4.3 6.4 4.1C6.8 4 7.2 4.2 7.4 4.6Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </Svg>
);

const EditIcon = ({ color, size = 18 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 18.8L5.8 15.2L15.9 5.1C17 4 18.7 4 19.8 5.1C20.9 6.2 20.9 7.9 19.8 9L9.7 19.1L6.1 19.9C5.4 20 4.9 19.5 5 18.8Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
    <Path
      d="M14.4 6.6L18.3 10.5"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={2}
    />
  </Svg>
);

const CheckIcon = ({ color, size = 18 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12.5L9.3 17L19 7"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.4}
    />
  </Svg>
);

const CloseIcon = ({ color, size = 18 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 7L17 17M17 7L7 17"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={2.2}
    />
  </Svg>
);

const LockIcon = ({ color, size = 22 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      height={10}
      rx={2.2}
      stroke={color}
      strokeWidth={2}
      width={14}
      x={5}
      y={10}
    />
    <Path
      d="M8.4 10V8.1C8.4 6 10 4.4 12 4.4C14 4.4 15.6 6 15.6 8.1V10"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={2}
    />
  </Svg>
);

const LogoutIcon = ({ color, size = 22 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10 5H6.8C5.8 5 5 5.8 5 6.8V17.2C5 18.2 5.8 19 6.8 19H10"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={2}
    />
    <Path
      d="M14 8L18 12L14 16M18 12H9"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </Svg>
);

const ChevronIcon = ({ color, size = 18 }: IconProps): React.JSX.Element => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6L15 12L9 18"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
    />
  </Svg>
);

const renderProfileFieldIcon = (
  iconName: ProfileFieldProps['iconName'],
): React.JSX.Element => {
  if (iconName === 'phone') {
    return <PhoneIcon color={colors.red} size={20} />;
  }

  return <UserIcon color={colors.red} size={20} />;
};

const ProfileField = ({
  editable,
  iconName,
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  value,
}: ProfileFieldProps): React.JSX.Element => {
  const containerClassName = editable
    ? 'mt-3 min-h-[68px] flex-row items-center rounded-xl border border-red bg-white px-4'
    : 'mt-3 min-h-[68px] flex-row items-center rounded-xl border border-memoLine bg-white px-4';

  return (
    <View className={containerClassName}>
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-camera_bg">
        {renderProfileFieldIcon(iconName)}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-coment font-suitBold text-textDim">{label}</Text>
        <TextInput
          className="mt-1 h-8 p-0 text-body font-suitBold text-black"
          editable={editable}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          selectTextOnFocus={editable}
          value={value}
        />
      </View>
    </View>
  );
};

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
      try {
        const storedUser = await getStoredAuthUser();

        if (isActive) {
          const nextProfile = {
            name: storedUser?.name?.trim() ?? '',
            guardianPhone: storedUser?.guardian_phone?.trim() ?? '',
          };

          setProfile(nextProfile);
          setDraftProfile(nextProfile);
        }
      } catch (error) {
        console.warn('[SettingsScreen] profile load failed:', error);
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
  }, []);

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
      const updatedUser = await updateStoredAuthUser({
        name: nextName,
        guardian_phone: nextGuardianPhone,
      });
      const nextProfile = {
        name: updatedUser.name ?? '',
        guardianPhone: updatedUser.guardian_phone ?? '',
      };

      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      setIsEditingProfile(false);
      Alert.alert('저장 완료', '개인 정보가 수정되었습니다.');
    } catch (error) {
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
    : '보호자 전화번호가 등록되지 않았습니다';
  const isProfileEditable =
    isEditingProfile && !isProfileLoading && !isSavingProfile;
  const editButtonClassName = isProfileLoading
    ? 'h-12 flex-1 flex-row items-center justify-center rounded-xl bg-disabled'
    : 'h-12 flex-1 flex-row items-center justify-center rounded-xl bg-red';

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

            <View
              className="mt-6 overflow-hidden rounded-2xl bg-white px-5 py-5"
              style={styles.profileCard}
            >
              <View className="min-h-[40px] flex-row items-center">
                <View className="flex-row items-center">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-camera_bg">
                    <UserIcon color={colors.red} size={20} />
                  </View>
                  <Text className="ml-3 text-body font-suitBold text-black">
                    개인 정보
                  </Text>
                </View>
              </View>

              <ProfileField
                editable={isProfileEditable}
                iconName="user"
                label="이름"
                onChangeText={value =>
                  setDraftProfile(currentProfile => ({
                    ...currentProfile,
                    name: value,
                  }))
                }
                placeholder={namePlaceholder}
                value={draftProfile.name}
              />
              <ProfileField
                editable={isProfileEditable}
                iconName="phone"
                keyboardType="phone-pad"
                label="보호자 전화번호"
                onChangeText={value =>
                  setDraftProfile(currentProfile => ({
                    ...currentProfile,
                    guardianPhone: value,
                  }))
                }
                placeholder={guardianPhonePlaceholder}
                value={draftProfile.guardianPhone}
              />

              <View className="mt-5 flex-row">
                {isEditingProfile ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      className="mr-3 h-12 flex-1 flex-row items-center justify-center rounded-xl border border-authInputBorder bg-white"
                      disabled={isSavingProfile}
                      onPress={handleCancelProfilePress}
                    >
                      <CloseIcon color={colors.textDim} />
                      <Text className="ml-2 text-body font-suitBold text-textDim">
                        취소
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-red"
                      disabled={isSavingProfile}
                      onPress={handleSaveProfilePress}
                    >
                      {isSavingProfile ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <CheckIcon color={colors.white} />
                          <Text className="ml-2 text-body font-suitBold text-white">
                            저장
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    accessibilityLabel="개인 정보 수정"
                    activeOpacity={0.85}
                    className={editButtonClassName}
                    disabled={isProfileLoading}
                    onPress={handleEditProfilePress}
                  >
                    <EditIcon color={colors.white} />
                    <Text className="ml-2 text-body font-suitBold text-white">
                      수정
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View
              className="mt-4 overflow-hidden rounded-2xl bg-white"
              style={styles.actionCard}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                className="min-h-[64px] flex-row items-center px-4 py-3"
                onPress={handlePasswordResetPress}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-background">
                  <LockIcon color={colors.gray} />
                </View>
                <Text className="ml-3 flex-1 text-body font-suitBold text-black">
                  비밀번호 재설정
                </Text>
                <ChevronIcon color={colors.textDim} />
              </TouchableOpacity>
            </View>

            <View
              className="mt-4 overflow-hidden rounded-2xl bg-white"
              style={styles.actionCard}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                className="min-h-[64px] flex-row items-center px-4 py-3"
                disabled={isLoggingOut}
                onPress={handleLogout}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-camera_bg">
                  <LogoutIcon color={colors.red} />
                </View>
                <Text className="ml-3 flex-1 text-body font-suitBold text-red">
                  로그아웃
                </Text>
                {isLoggingOut ? (
                  <ActivityIndicator color={colors.red} size="small" />
                ) : (
                  <ChevronIcon color={colors.red} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
