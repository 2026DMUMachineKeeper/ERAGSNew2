import React from 'react';
import { Alert, TextInput } from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ApiRequestError } from '@/services/apiError.service';

import { LoginScreen } from './LoginScreen';

const mockSignIn = jest.fn();

jest.mock('@/store', () => ({
  useAuthStore: (
    selector: (state: { signIn: typeof mockSignIn }) => unknown,
  ): unknown => selector({ signIn: mockSignIn }),
}));

jest.mock('@/services', () => ({
  consumeLocationPermissionPrompt: jest.fn(),
}));

jest.mock('@/utils', () => ({
  showLocationPermissionPrompt: jest.fn(),
}));

describe('LoginScreen 오류 메시지', () => {
  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('내부 오류 정보 대신 사용자용 메시지를 표시한다', async (): Promise<void> => {
    const internalMessage =
      'Server returned a non-JSON response. (502) https://internal.example 응답본문';
    mockSignIn.mockRejectedValue(
      new ApiRequestError(
        {
          code: 'INVALID_REQUEST',
          details: ['email'],
          message: internalMessage,
        },
        400,
      ),
    );
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((): void => {});
    jest.spyOn(console, 'error').mockImplementation((): void => {});
    let renderer!: ReactTestRenderer;
    await act(async (): Promise<void> => {
      renderer = create(
        <LoginScreen navigation={{} as never} route={{} as never} />,
      );
    });

    const inputs = renderer.root.findAllByType(TextInput);
    act((): void => {
      inputs[0].props.onChangeText('user@example.com');
      inputs[1].props.onChangeText('password');
    });
    const loginButton = renderer.root
      .findAll(node => node.props.accessibilityLabel === '로그인')
      .find(node => typeof node.props.onPress === 'function');
    if (!loginButton) {
      throw new Error('로그인 버튼을 찾을 수 없습니다.');
    }

    await act(async (): Promise<void> => loginButton.props.onPress());

    expect(alertSpy).toHaveBeenCalledWith(
      '로그인 실패',
      '이메일과 비밀번호 형식을 확인해 주세요.',
    );
    expect(JSON.stringify(alertSpy.mock.calls)).not.toContain(internalMessage);
    await act(async (): Promise<void> => renderer.unmount());
  });
});
