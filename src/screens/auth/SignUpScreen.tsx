import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, type TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useSignUp } from '@/hooks/useSignUp';

import tailwindConfig from '../../../tailwind.config';
import AuthTextInput from './components/AuthTextInput';

type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const { colors } = tailwindConfig;
export const SignUpScreen = ({ navigation }: SignUpScreenProps): React.JSX.Element => {
  const { values, errors, isSubmitting, handleChange, handleSubmit } = useSignUp(navigation);
  const emailInputRef = React.useRef<TextInput>(null);
  const guardianPhoneInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  const passwordConfirmInputRef = React.useRef<TextInput>(null);

  const handleNameSubmit = (): void => {
    emailInputRef.current?.focus();
  };
  const handleEmailSubmit = (): void => {
    guardianPhoneInputRef.current?.focus();
  };
  const handleGuardianPhoneSubmit = (): void => {
    passwordInputRef.current?.focus();
  };
  const handlePasswordSubmit = (): void => {
    passwordConfirmInputRef.current?.focus();
  };

  const handleLoginPress = (): void => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="min-h-full items-center justify-start px-8 pb-10 pt-20">
            <View className="w-full max-w-[430px]">
              <View className="items-center">
                <Text className="text-3xl font-suitBold text-black">회원가입</Text>
                <Text className="mt-5 text-center text-base font-suitMedium text-authText">
                  안전한 응급처치를 위한 계정을 생성하세요.
                </Text>
              </View>

              <View className="mt-12">
                <AuthTextInput
                  errorMessage={errors.name ?? undefined}
                  iconName="user"
                  inputProps={{
                    autoCapitalize: 'words',
                    autoCorrect: false,
                    onChangeText: (nextText: string): void => handleChange('name', nextText),
                    onSubmitEditing: handleNameSubmit,
                    submitBehavior: 'submit',
                    placeholder: '이름을 입력하세요',
                    placeholderTextColor: colors.placeholder,
                    returnKeyType: 'next',
                    textContentType: 'name',
                    value: values.name,
                  }}
                />

                <View className="mt-5">
                  <AuthTextInput
                    errorMessage={errors.email ?? undefined}
                    iconName="email"
                    inputRef={emailInputRef}
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      keyboardType: 'email-address',
                      onChangeText: (nextText: string): void => handleChange('email', nextText),
                      onSubmitEditing: handleEmailSubmit,
                      submitBehavior: 'submit',
                      placeholder: '이메일을 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'next',
                      textContentType: 'emailAddress',
                      value: values.email,
                    }}
                  />
                </View>

                <View className="mt-5">
                  <AuthTextInput
                    errorMessage={errors.guardianPhoneNumber ?? undefined}
                    iconName="phone"
                    inputRef={guardianPhoneInputRef}
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      keyboardType: 'phone-pad',
                      onSubmitEditing: handleGuardianPhoneSubmit,
                      submitBehavior: 'submit',
                      onChangeText: (nextText: string): void =>
                        handleChange('guardianPhoneNumber', nextText),
                      placeholder: '보호자 전화번호를 입력하세요 (선택)',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'next',
                      textContentType: 'telephoneNumber',
                      value: values.guardianPhoneNumber,
                    }}
                  />
                </View>

                <View className="mt-5">
                  <AuthTextInput
                    iconName="lock"
                    inputRef={passwordInputRef}
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      onChangeText: (nextText: string): void => handleChange('password', nextText),
                      onSubmitEditing: handlePasswordSubmit,
                      submitBehavior: 'submit',
                      placeholder: '비밀번호를 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'next',
                      textContentType: 'newPassword',
                      value: values.password,
                    }}
                    isPassword
                  />
                </View>

                <View className="mt-5">
                  <AuthTextInput
                    iconName="lock"
                    inputRef={passwordConfirmInputRef}
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      onChangeText: (nextText: string): void =>
                        handleChange('passwordConfirm', nextText),
                      placeholder: '비밀번호를 다시 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'done',
                      textContentType: 'newPassword',
                      value: values.passwordConfirm,
                    }}
                    isPassword
                  />
                </View>

                <Pressable
                  className={`mt-7 h-16 items-center justify-center rounded-xl ${
                    isSubmitting ? 'bg-disabled' : 'bg-red'
                  }`}
                  disabled={isSubmitting}
                  onPress={handleSubmit}>
                  <Text className="text-2xl font-suitBold text-white">
                    {isSubmitting ? '가입 중...' : '회원가입'}
                  </Text>
                </Pressable>

                <View className="mt-12 items-center">
                  <Text className="text-xl font-suitMedium text-authText">
                    이미 계정이 있으신가요?
                  </Text>
                  <Pressable className="mt-6" onPress={handleLoginPress}>
                    <Text className="text-xl font-suitBold text-red">로그인</Text>
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
