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
import tailwindConfig from '../../../tailwind.config';
import AuthTextInput from './components/AuthTextInput';

type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const { colors } = tailwindConfig;

export const SignUpScreen = ({
  navigation,
}: SignUpScreenProps): React.JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const isSignUpDisabled =
    email.trim().length === 0 ||
    password.trim().length === 0 ||
    passwordConfirm.trim().length === 0;

  const handleSignUpPress = (): void => {
    if (isSignUpDisabled) {
      Alert.alert('입력 필요', '회원가입 정보를 모두 입력해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('비밀번호 확인', '비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    Alert.alert('회원가입 완료', '로그인 화면에서 다시 로그인해주세요.');
    navigation.replace('Login');
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
                    회원가입!
                  </Text>
                </Pressable>

                <View className="mt-12 items-center">
                  <Text className="text-xl font-suitMedium text-authText">
                    이미 계정이 있으신가요?
                  </Text>
                  <Pressable className="mt-6" onPress={handleLoginPress}>
                    <Text className="text-xl font-suitBold text-red">
                      로그인 〉
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
