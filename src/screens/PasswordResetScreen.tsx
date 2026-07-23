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

import { BackIcon } from '../assets';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { resetPassword } from '@/services';
import tailwindConfig from '../../tailwind.config';
import AuthTextInput from './auth/components/AuthTextInput';

type PasswordResetScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'PasswordReset'
>;

const { colors } = tailwindConfig;

export const PasswordResetScreen = ({
  navigation,
}: PasswordResetScreenProps): React.JSX.Element => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasEmptyRequiredField =
    name.trim().length === 0 ||
    email.trim().length === 0 ||
    newPassword.trim().length === 0;

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  const handleResetPasswordPress = async (): Promise<void> => {
    if (hasEmptyRequiredField) {
      Alert.alert('입력 필요', '이름, 이메일, 새 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const resetPasswordResponse = await resetPassword({
        name: name.trim(),
        email: email.trim(),
        newPassword,
      });

      Alert.alert(
        '비밀번호 재설정 완료',
        resetPasswordResponse?.message || '비밀번호가 재설정되었습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '비밀번호 재설정에 실패했습니다.';

      Alert.alert('비밀번호 재설정 실패', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
          <View className="min-h-full px-8 pb-10 pt-8">
            <View className="w-full max-w-[430px] self-center">
              <Pressable
                className="h-11 w-11 items-center justify-center"
                onPress={handleBackPress}
              >
                <BackIcon width={24} height={24} />
              </Pressable>

              <View className="mt-9">
                <Text className="text-3xl font-suitBold text-black">
                  비밀번호 재설정
                </Text>
                <Text className="mt-4 text-base font-suitMedium text-authText">
                  가입한 이름과 이메일을 입력하고 새 비밀번호를 설정하세요.
                </Text>
              </View>

              <View className="mt-12">
                <AuthTextInput
                  iconName="user"
                  inputProps={{
                    autoCapitalize: 'words',
                    autoCorrect: false,
                    onChangeText: setName,
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
                      onChangeText: setEmail,
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
                      onChangeText: setNewPassword,
                      placeholder: '새 비밀번호를 입력하세요',
                      placeholderTextColor: colors.placeholder,
                      returnKeyType: 'done',
                      textContentType: 'newPassword',
                      value: newPassword,
                    }}
                    isPassword
                  />
                </View>

                <Pressable
                  className={`mt-7 h-16 items-center justify-center rounded-xl ${
                    isSubmitting ? 'bg-disabled' : 'bg-red'
                  }`}
                  disabled={isSubmitting}
                  onPress={handleResetPasswordPress}
                >
                  <Text className="text-2xl font-suitBold text-white">
                    {isSubmitting ? '재설정 중...' : '재설정하기'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PasswordResetScreen;
