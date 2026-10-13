import React from 'react';
import { Alert, Text, TextInput } from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { markLocationPermissionPromptPending, register } from '@/services';
import { ApiRequestError } from '@/services/apiError.service';

import { SignUpScreen } from '@/screens/auth/SignUpScreen';

jest.mock('@/services', () => ({
  register: jest.fn(),
  markLocationPermissionPromptPending: jest.fn(),
}));

describe('회원가입 처리 흐름', () => {
  let renderer: ReactTestRenderer;
  const replace = jest.fn();

  beforeEach(async (): Promise<void> => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation((): void => {});
    jest.spyOn(console, 'error').mockImplementation((): void => {});
    jest.mocked(register).mockResolvedValue({ success: true, message: '가입되었습니다.' });
    jest.mocked(markLocationPermissionPromptPending).mockResolvedValue(undefined);
    await act(async (): Promise<void> => {
      renderer = create(<SignUpScreen navigation={{ replace } as never} route={{} as never} />);
    });
  });

  afterEach((): void => {
    act((): void => renderer.unmount());
    jest.restoreAllMocks();
  });

  const fillForm = (guardianPhone: string): void => {
    const inputs = renderer.root.findAllByType(TextInput);
    act((): void => {
      [' 사용자 ', ' user@example.com ', guardianPhone, ' password ', ' password '].forEach(
        (text: string, index: number): void => inputs[index].props.onChangeText(text),
      );
    });
  };

  const submitForm = async (): Promise<void> => {
    // Pressable은 memo로 감싸져 있어 findAllByType으로 찾을 수 없으므로 onPress와 문구로 찾습니다.
    const button = renderer.root
      .findAll(candidate => typeof candidate.props.onPress === 'function')
      .find(candidate =>
        candidate.findAllByType(Text).some(textNode => textNode.props.children === '회원가입'),
      );
    if (!button) throw new Error('회원가입 버튼을 찾을 수 없습니다.');
    await act(async (): Promise<void> => {
      await button.props.onPress();
    });
  };

  it('검증에 실패하면 가입과 권한 안내 예약을 실행하지 않는다', async (): Promise<void> => {
    await submitForm();
    expect(register).not.toHaveBeenCalled();
    expect(markLocationPermissionPromptPending).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByType(Text)
        .some(textNode => textNode.props.children === '이름을 입력해 주세요.'),
    ).toBe(true);
  });

  it.each(['', '01012345678'])(
    '가입 성공 후 보호자 번호에 따라 안내를 예약한다 (%s)',
    async (guardianPhone: string): Promise<void> => {
      fillForm(guardianPhone);
      await submitForm();
      expect(register).toHaveBeenCalledWith({
        name: '사용자',
        email: 'user@example.com',
        password: ' password ',
        ...(guardianPhone ? { guardian_phone: '010-1234-5678' } : {}),
      });
      if (guardianPhone) {
        expect(markLocationPermissionPromptPending).toHaveBeenCalledWith('user@example.com');
      } else {
        expect(markLocationPermissionPromptPending).not.toHaveBeenCalled();
      }
      expect(replace).not.toHaveBeenCalled();
      const successAlert = jest
        .mocked(Alert.alert)
        .mock.calls.find(call => call[0] === '회원가입 완료');
      expect(successAlert).toBeDefined();
      act((): void => successAlert?.[2]?.[0].onPress?.());
      expect(replace).toHaveBeenCalledWith('Login');
    },
  );

  it('가입 요청 실패 시 권한 안내를 예약하지 않고 기존 오류 문구를 표시한다', async (): Promise<void> => {
    jest
      .mocked(register)
      .mockRejectedValue(
        new ApiRequestError({ code: 'DUPLICATE_EMAIL', details: [], message: '내부 오류' }, 409),
      );
    fillForm('01012345678');
    await submitForm();
    expect(markLocationPermissionPromptPending).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('회원가입 실패', '이미 가입된 이메일입니다.');
    expect(replace).not.toHaveBeenCalled();
  });
});
