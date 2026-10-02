import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { consumeLocationPermissionPrompt } from '@/services';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { useAuthStore } from '@/store';
import { showLocationPermissionPrompt } from '@/utils';
import tailwindConfig from '../../../tailwind.config';
import AuthTextInput from './components/AuthTextInput';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

const { colors } = tailwindConfig;
const LOGIN_ERROR_MESSAGE =
  '로그인에 실패했습니다. 이메일과 비밀번호를 확인한 후 다시 시도해 주세요.';
const INVALID_CREDENTIALS_MESSAGE =
  '이메일 또는 비밀번호가 일치하지 않습니다. 가입한 정보를 확인하거나 비밀번호를 재설정해 주세요.';
const LOGIN_ERROR_CODE_MESSAGES: Readonly<Record<string, string>> = {
  AUTHENTICATION_REQUIRED: INVALID_CREDENTIALS_MESSAGE,
  INVALID_CREDENTIALS: INVALID_CREDENTIALS_MESSAGE,
  INVALID_REQUEST: '이메일과 비밀번호 형식을 확인해 주세요.',
};
const LOGIN_ERROR_STATUS_MESSAGES: Readonly<Record<number, string>> = {
  429: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  500: '로그인 서버에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  502: '로그인 서버에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  503: '로그인 서버에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
};

export const LoginScreen = ({
  navigation,
}: LoginScreenProps): React.JSX.Element => {
  const signIn = useAuthStore(state => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoginDisabled =
    isSubmitting || email.trim().length === 0 || password.trim().length === 0;

  const handleLoginPress = async (): Promise<void> => {
    if (isLoginDisabled) {
      Alert.alert('입력 필요', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const authenticatedUser = await signIn({
        email: email.trim(),
        password,
      });
      const shouldShowLocationPermissionPrompt =
        await consumeLocationPermissionPrompt(authenticatedUser.email);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

      if (shouldShowLocationPermissionPrompt) {
        showLocationPermissionPrompt();
      }
    } catch (error: unknown) {
      console.error('[LoginScreen] 로그인 실패', error);
      Alert.alert(
        '로그인 실패',
        getApiErrorUserMessage(error, {
          codeMessages: LOGIN_ERROR_CODE_MESSAGES,
          fallbackMessage: LOGIN_ERROR_MESSAGE,
          statusMessages: LOGIN_ERROR_STATUS_MESSAGES,
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpPress = (): void => {
    navigation.navigate('SignUp');
  };

  const handlePasswordResetPress = (): void => {
    navigation.navigate('PasswordReset');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="min-h-full items-center justify-start px-8 pb-10 pt-20">
            <View className="w-full max-w-[430px]">
              <View className="items-center">
                <Text className="text-3xl font-suitBold text-black">
                  로그인
                </Text>
                <Text className="mt-5 text-center text-base font-suitMedium text-authText">
                  계정에 로그인하고 서비스를 이용하세요.
                </Text>
              </View>

              <View className="mt-12">
                <AuthTextInput
                  iconName="email"
                  inputProps={{
                    autoCapitalize: 'none',
                    autoCorrect: false,
                    keyboardType: 'email-address',
                    onChangeText: setEmail,
                    placeholder: '이메일을 입력하세요',
                    placeholderTextColor: colors.placeholder,
                    returnKeyType: 'next',
                    textContentType: 'emailAddress',
                    value: email,
                  }}
                />

                <View className="mt-5">
                  <AuthTextInput
                    iconName="lock"
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      onChangeText: setPassword,
                      placeholder: '비밀번호를 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'done',
                      textContentType: 'password',
                      value: password,
                    }}
                    isPassword
                  />
                </View>

                <Pressable
                  accessibilityLabel="로그인"
                  accessibilityRole="button"
                  className={`mt-7 h-16 items-center justify-center rounded-xl ${
                    isLoginDisabled ? 'bg-disabled' : 'bg-red'
                  }`}
                  disabled={isLoginDisabled}
                  onPress={handleLoginPress}
                >
                  <Text className="text-2xl font-suitBold text-white">
                    {isSubmitting ? '로그인 중...' : '로그인'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityLabel="비밀번호 재설정"
                  className="mt-5 self-end"
                  onPress={handlePasswordResetPress}
                >
                  <Text className="text-base font-suitBold text-red">
                    비밀번호를 잊으셨나요?
                  </Text>
                </Pressable>

                <View className="mt-10 flex-row items-center">
                  <View className="h-px flex-1 bg-authDivider" />
                  <Text className="mx-6 text-base font-suitMedium text-authMuted">
                    또는
                  </Text>
                  <View className="h-px flex-1 bg-authDivider" />
                </View>

                <View className="mt-14 items-center">
                  <Text className="text-xl font-suitMedium text-authText">
                    아직 회원이 아니신가요?
                  </Text>
                  <Pressable className="mt-6" onPress={handleSignUpPress}>
                    <Text className="text-xl font-suitBold text-red">
                      회원가입
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
