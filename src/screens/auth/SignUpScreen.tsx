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
import { register } from '@/services';
import tailwindConfig from '../../../tailwind.config';
import AuthTextInput from './components/AuthTextInput';

type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const { colors } = tailwindConfig;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SignUpScreen = ({
  navigation,
}: SignUpScreenProps): React.JSX.Element => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUpDisabled = isSubmitting;

  const clearErrorMessage = (): void => {
    setErrorMessage('');
  };

  const handleNameChange = (value: string): void => {
    setName(value);
    clearErrorMessage();
  };

  const handleEmailChange = (value: string): void => {
    setEmail(value);
    clearErrorMessage();
  };

  const handlePasswordChange = (value: string): void => {
    setPassword(value);
    clearErrorMessage();
  };

  const handlePasswordConfirmChange = (value: string): void => {
    setPasswordConfirm(value);
    clearErrorMessage();
  };

  const handleSignUpPress = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length === 0) {
      setErrorMessage('이름을 입력해주세요.');
      return;
    }

    if (trimmedEmail.length === 0) {
      setErrorMessage('이메일을 입력해주세요.');
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setErrorMessage('올바른 이메일 형식으로 입력해주세요.');
      return;
    }

    if (password.trim().length === 0) {
      setErrorMessage('비밀번호를 입력해주세요.');
      return;
    }

    if (passwordConfirm.trim().length === 0) {
      setErrorMessage('비밀번호를 다시 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const registerResponse = await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      Alert.alert('회원가입 완료', registerResponse.message, [
        {
          text: '확인',
          onPress: () => navigation.replace('Login'),
        },
      ]);
    } catch (error: unknown) {
      const caughtErrorMessage =
        error instanceof Error ? error.message : '회원가입에 실패했습니다.';

      console.error('[SignUpScreen] 회원가입 실패', error);
      setErrorMessage(caughtErrorMessage);
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
                    iconName="lock"
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      onChangeText: handlePasswordChange,
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
                      onChangeText: handlePasswordConfirmChange,
                      placeholder: '비밀번호를 다시 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'done',
                      textContentType: 'newPassword',
                      value: passwordConfirm,
                    }}
                    isPassword
                  />
                </View>

                {errorMessage ? (
                  <Text className="mt-4 text-sm font-suitMedium text-red">
                    {errorMessage}
                  </Text>
                ) : null}

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
