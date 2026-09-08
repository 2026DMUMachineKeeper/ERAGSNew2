import type { SignUpValidationResult, SignUpValues } from '@/types';
import {
  INVALID_KOREAN_PHONE_NUMBER_MESSAGE,
  normalizeOptionalKoreanPhoneNumber,
} from '@/utils/phoneNumber';

const REQUIRED_PASSWORD_ALERT = {
  title: '입력 필요',
  message: '회원가입 정보를 모두 입력해 주세요.',
};
const PASSWORD_MISMATCH_ALERT = {
  title: '비밀번호 확인',
  message: '비밀번호가 서로 일치하지 않습니다.',
};

export const validateSignUp = (values: SignUpValues): SignUpValidationResult => {
  const name = values.name.trim();
  const email = values.email.trim();
  const errors = {
    name: name ? null : '이름을 입력해 주세요.',
    email: email ? null : '이메일을 입력해 주세요.',
  };

  // 기존 안내 순서대로 검사해 필수 입력을 채우기 전에 뒤 항목의 오류를 표시하지 않습니다.
  if (errors.name || errors.email) {
    return { request: null, errors };
  }
  if (!values.password.trim() || !values.passwordConfirm.trim()) {
    return { request: null, errors, alert: REQUIRED_PASSWORD_ALERT };
  }
  if (values.password !== values.passwordConfirm) {
    return { request: null, errors, alert: PASSWORD_MISMATCH_ALERT };
  }

  const guardianPhone = normalizeOptionalKoreanPhoneNumber(values.guardianPhoneNumber);
  if (guardianPhone === null) {
    return {
      request: null,
      errors: { ...errors, guardianPhoneNumber: INVALID_KOREAN_PHONE_NUMBER_MESSAGE },
    };
  }

  return {
    errors: { ...errors, guardianPhoneNumber: null },
    request: {
      name,
      email,
      // 비밀번호의 공백도 실제 비밀번호에 포함되므로 전송할 때는 원문을 유지합니다.
      password: values.password,
      ...(guardianPhone ? { guardian_phone: guardianPhone } : {}),
    },
  };
};
