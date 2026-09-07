import React from 'react';
import { Alert } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { markLocationPermissionPromptPending, register } from '@/services';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import type { SignUpErrors, SignUpFormState, SignUpValues } from '@/types';
import { validateSignUp } from '@/utils/auth';

const INITIAL_VALUES: SignUpValues = {
  name: '',
  email: '',
  guardianPhoneNumber: '',
  password: '',
  passwordConfirm: '',
};
const INITIAL_ERRORS: SignUpErrors = { name: null, email: null, guardianPhoneNumber: null };
const SIGN_UP_ERROR_MESSAGE =
  '회원가입을 완료하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.';
const SIGN_UP_ERROR_CODE_MESSAGES: Readonly<Record<string, string>> = {
  DUPLICATE_EMAIL: '이미 가입된 이메일입니다.',
  EMAIL_ALREADY_EXISTS: '이미 가입된 이메일입니다.',
  INVALID_REQUEST: '입력한 회원가입 정보를 다시 확인해 주세요.',
};

export const useSignUp = (
  navigation: NativeStackScreenProps<RootStackParamList, 'SignUp'>['navigation'],
): SignUpFormState => {
  const [values, setValues] = React.useState(INITIAL_VALUES);
  const [errors, setErrors] = React.useState(INITIAL_ERRORS);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChange = React.useCallback((field: keyof SignUpValues, nextText: string): void => {
    setValues(currentValues => ({ ...currentValues, [field]: nextText }));
    if (field !== 'password' && field !== 'passwordConfirm') {
      setErrors(currentErrors => ({ ...currentErrors, [field]: null }));
    }
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) return;

    const validation = validateSignUp(values);
    setErrors(currentErrors => ({ ...currentErrors, ...validation.errors }));
    if (validation.alert) {
      Alert.alert(validation.alert.title, validation.alert.message);
    }
    if (!validation.request) return;

    const request = validation.request;
    setIsSubmitting(true);
    try {
      const response = await register(request);
      // 가입 성공 후에만 안내를 예약하고, 실제 위치 권한 안내는 로그인 완료 시 표시합니다.
      if (request.guardian_phone) {
        await markLocationPermissionPromptPending(request.email);
      }
      Alert.alert('회원가입 완료', response.message, [
        { text: '확인', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error: unknown) {
      console.error('[useSignUp] 회원가입 실패:', error);
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

  return { values, errors, isSubmitting, handleChange, handleSubmit };
};
