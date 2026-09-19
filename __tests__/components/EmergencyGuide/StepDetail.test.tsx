import React from 'react';
import { Image, Text } from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { StepDetail } from '@/components/EmergencyGuide/StepDetail';

describe('StepDetail 이미지 오류', () => {
  it('이미지 로딩 실패 시 텍스트 안내를 표시한다', async (): Promise<void> => {
    jest.spyOn(console, 'error').mockImplementation((): void => {});
    let renderer!: ReactTestRenderer;
    await act(async (): Promise<void> => {
      renderer = create(
        <StepDetail
          step={{
            stepNo: 1,
            instruction: '상처를 압박하세요.',
            imageResource: 'https://example.com/guide.png',
          }}
        />,
      );
    });

    act((): void => {
      renderer.root.findByType(Image).props.onError({
        nativeEvent: { error: '불러오기 실패' },
      });
    });

    const messages = renderer.root
      .findAllByType(Text)
      .map(textNode => textNode.props.children)
      .filter((message): message is string => typeof message === 'string');
    expect(messages).toContain(
      '이미지를 불러오지 못했습니다. 텍스트 안내에 따라 진행해 주세요.',
    );
    await act(async (): Promise<void> => renderer.unmount());
  });
});
