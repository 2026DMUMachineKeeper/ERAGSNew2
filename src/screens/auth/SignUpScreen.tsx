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
import { markLocationPermissionPromptPending, register } from '@/services';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import {
  INVALID_KOREAN_PHONE_NUMBER_MESSAGE,
  normalizeOptionalKoreanPhoneNumber,
} from '@/utils';
import tailwindConfig from '../../../tailwind.config';
import AuthTextInput from './components/AuthTextInput';

type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const { colors } = tailwindConfig;
const SIGN_UP_ERROR_MESSAGE =
  '회원가입을 완료하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.';
const SIGN_UP_ERROR_CODE_MESSAGES: Readonly<Record<string, string>> = {
  DUPLICATE_EMAIL: '이미 가입된 이메일입니다.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  INVALID_REQUEST: '입력한 회원가입 정보를 다시 확인해 주세요.',
};

export const SignUpScreen = ({
  navigation,
}: SignUpScreenProps): React.JSX.Element => {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [guardianPhoneNumber, setGuardianPhoneNumber] = useState('');
  const [guardianPhoneError, setGuardianPhoneError] = useState<string | null>(
    null,
  );
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUpDisabled = isSubmitting;

  const handleNameChange = (nextName: string): void => {
    setNameError(null);
    setName(nextName);
  };

  const handleEmailChange = (nextEmail: string): void => {
    setEmailError(null);
    setEmail(nextEmail);
  };

  const handleGuardianPhoneChange = (phoneNumber: string): void => {
    setGuardianPhoneError(null);
    setGuardianPhoneNumber(phoneNumber);
  };

  const handleSignUpPress = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }

    const nextNameError =
      name.trim().length === 0 ? '이름을 입력해 주세요.' : null;
    const nextEmailError =
      email.trim().length === 0 ? '이메일을 입력해 주세요.' : null;

    setNameError(nextNameError);
    setEmailError(nextEmailError);

    if (nextNameError || nextEmailError) {
      return;
    }

    if (password.trim().length === 0 || passwordConfirm.trim().length === 0) {
      Alert.alert('입력 필요', '회원가입 정보를 모두 입력해 주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 확인', '비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    const normalizedGuardianPhoneNumber =
      normalizeOptionalKoreanPhoneNumber(guardianPhoneNumber);

    if (normalizedGuardianPhoneNumber === null) {
      setGuardianPhoneError(INVALID_KOREAN_PHONE_NUMBER_MESSAGE);
      return;
    }

    setGuardianPhoneError(null);
    setIsSubmitting(true);

    try {
      const registerResponse = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(normalizedGuardianPhoneNumber.length > 0
          ? { guardian_phone: normalizedGuardianPhoneNumber }
          : {}),
      });

      if (normalizedGuardianPhoneNumber.length > 0) {
        await markLocationPermissionPromptPending(email.trim());
      }

      Alert.alert('회원가입 완료', registerResponse.message, [
        {
          text: '확인',
          onPress: () => navigation.replace('Login'),
        },
      ]);
    } catch (error: unknown) {
      console.error('[SignUpScreen] 회원가입 실패', error);
      Alert.alert(
        '회원가입 실패',
        getApiErrorUserMessage(error, {
          codeMessages: SIGN_UP_ERROR_CODE_MESSAGES,
          fallbackMessage: SIGN_UP_ERROR_MESSAGE,
          statusMessages: { 409: '이미 가입된 이메일입니다.' },
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginPress = (): void => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
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
                  회원가입
                </Text>
                <Text className="mt-5 text-center text-base font-suitMedium text-authText">
                  안전한 응급처치를 위한 계정을 생성하세요.
                </Text>
              </View>

              <View className="mt-12">
                <AuthTextInput
                  errorMessage={nameError ?? undefined}
                  iconName="user"
                  inputProps={{
                    autoCapitalize: 'words',
                    autoCorrect: false,
                    onChangeText: handleNameChange,
                    placeholder: '이름을 입력하세요',
                    placeholderTextColor: colors.placeholder,
                    returnKeyType: 'next',
                    textContentType: 'name',
                    value: name,
                  }}
                />

                <View className="mt-5">
                  <AuthTextInput
                    errorMessage={emailError ?? undefined}
                    iconName="email"
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      keyboardType: 'email-address',
                      onChangeText: handleEmailChange,
                      placeholder: '이메일을 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'next',
                      textContentType: 'emailAddress',
                      value: email,
                    }}
                  />
                </View>

                <View className="mt-5">
                  <AuthTextInput
                    errorMessage={guardianPhoneError ?? undefined}
                    iconName="phone"
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      keyboardType: 'phone-pad',
                      onChangeText: handleGuardianPhoneChange,
                      placeholder: '보호자 전화번호를 입력하세요 (선택)',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'next',
                      textContentType: 'telephoneNumber',
                      value: guardianPhoneNumber,
                    }}
                  />
                </View>

                <View className="mt-5">
                  <AuthTextInput
                    iconName="lock"
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      onChangeText: setPassword,
                      placeholder: '비밀번호를 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'next',
                      textContentType: 'newPassword',
                      value: password,
                    }}
                    isPassword
                  />
                </View>

                <View className="mt-5">
                  <AuthTextInput
                    iconName="lock"
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      onChangeText: setPasswordConfirm,
                      placeholder: '비밀번호를 다시 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'done',
                      textContentType: 'newPassword',
                      value: passwordConfirm,
                    }}
                    isPassword
                  />
                </View>

                <Pressable
                  className={`mt-7 h-16 items-center justify-center rounded-xl ${
                    isSignUpDisabled ? 'bg-disabled' : 'bg-red'
                  }`}
                  disabled={isSignUpDisabled}
                  onPress={handleSignUpPress}
                >
                  <Text className="text-2xl font-suitBold text-white">
                    {isSubmitting ? '가입 중...' : '회원가입'}
                  </Text>
                </Pressable>

                <View className="mt-12 items-center">
                  <Text className="text-xl font-suitMedium text-authText">
                    이미 계정이 있으신가요?
                  </Text>
                  <Pressable className="mt-6" onPress={handleLoginPress}>
                    <Text className="text-xl font-suitBold text-red">
                      로그인
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

export default SignUpScreen;
