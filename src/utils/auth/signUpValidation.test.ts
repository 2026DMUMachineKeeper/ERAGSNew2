import type { SignUpValues } from '@/types';

import { validateSignUp } from './signUpValidation';

const VALID_VALUES: SignUpValues = {
  name: ' 사용자 ',
  email: ' user@example.com ',
  guardianPhoneNumber: '',
  password: ' password ',
  passwordConfirm: ' password ',
};

describe('회원가입 검증', () => {
  it('이름과 이메일을 먼저 검사하고 비밀번호 안내는 뒤로 미룬다', (): void => {
    const result = validateSignUp({ ...VALID_VALUES, name: '', email: ' ', password: '' });
    expect(result).toEqual({
      request: null,
      errors: { name: '이름을 입력해 주세요.', email: '이메일을 입력해 주세요.' },
    });
  });

  it.each([
    ['', ' password ', '입력 필요'],
    [' password ', '', '입력 필요'],
    ['password', ' password ', '비밀번호 확인'],
  ])(
    '비밀번호 입력을 검사한다 (%s, %s)',
    (password: string, passwordConfirm: string, title: string): void => {
      const result = validateSignUp({ ...VALID_VALUES, password, passwordConfirm });
      expect(result.request).toBeNull();
      expect(result.alert?.title).toBe(title);
    },
  );

  it('이름과 이메일만 정리하고 비밀번호 원문과 선택 항목 생략을 유지한다', (): void => {
    expect(validateSignUp(VALID_VALUES).request).toEqual({
      name: '사용자',
      email: 'user@example.com',
      password: ' password ',
    });
  });

  it('보호자 번호를 정규화하고 잘못된 번호는 필드 오류로 반환한다', (): void => {
    expect(
      validateSignUp({ ...VALID_VALUES, guardianPhoneNumber: '01012345678' }).request,
    ).toHaveProperty('guardian_phone', '010-1234-5678');
    const invalidResult = validateSignUp({ ...VALID_VALUES, guardianPhoneNumber: '123' });
    expect(invalidResult.request).toBeNull();
    expect(invalidResult.errors.guardianPhoneNumber).toBeTruthy();
    expect(invalidResult.alert).toBeUndefined();
  });
});
