import React from 'react';
import { Modal, Text, TouchableOpacity } from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import EmergencyInputWaitingModal from '@/screens/home/components/EmergencyInputWaitingModal';
import PhotoSymptomInputModal from '@/screens/home/components/PhotoSymptomInputModal';

describe('응급 증상 입력 화면 이동 잠금', () => {
  it('사진 촬영 직후 한 모달에서 모든 추가 입력 방식을 선택할 수 있다', async (): Promise<void> => {
    const handleRemovePhoto = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(
        <PhotoSymptomInputModal
          additionalText=""
          isUploading={false}
          isVoiceRecording={false}
          isVoiceStarting={false}
          photoCount={1}
          photoUris={['file:///injury.jpg']}
          step="options"
          onAddPhoto={jest.fn()}
          onBack={jest.fn()}
          onCancel={jest.fn()}
          onChangeAdditionalText={jest.fn()}
          onRemovePhoto={handleRemovePhoto}
          onSelectText={jest.fn()}
          onSelectVoice={jest.fn()}
          onStartVoice={jest.fn()}
          onSendPhotosOnly={jest.fn()}
          onSubmitText={jest.fn()}
          onSubmitVoice={jest.fn()}
        />,
      );
    });

    const displayedText = renderer.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter((value): value is string => typeof value === 'string');

    expect(displayedText).toEqual(
      expect.arrayContaining([
        '사진 추가 촬영',
        '텍스트로 추가 입력',
        '음성으로 추가 입력',
        '추가 입력 없이 전송',
      ]),
    );
    const removeButton = renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === '1번째 사진 삭제');
    expect(removeButton).toBeDefined();
    act((): void => removeButton?.props.onPress());
    expect(handleRemovePhoto).toHaveBeenCalledWith(0);
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('텍스트 입력 화면에서는 취소 대신 뒤로 가기를 제공한다', async (): Promise<void> => {
    const handleBack = jest.fn();
    const handleCancel = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(
        <PhotoSymptomInputModal
          additionalText="통증이 있습니다."
          isUploading={false}
          isVoiceRecording={false}
          isVoiceStarting={false}
          photoCount={1}
          photoUris={['file:///injury.jpg']}
          step="text"
          onAddPhoto={jest.fn()}
          onBack={handleBack}
          onCancel={handleCancel}
          onChangeAdditionalText={jest.fn()}
          onRemovePhoto={jest.fn()}
          onSelectText={jest.fn()}
          onSelectVoice={jest.fn()}
          onStartVoice={jest.fn()}
          onSendPhotosOnly={jest.fn()}
          onSubmitText={jest.fn()}
          onSubmitVoice={jest.fn()}
        />,
      );
    });

    const backButton = renderer.root
      .findAllByType(TouchableOpacity)
      .find(button =>
        button
          .findAllByType(Text)
          .some(textNode => textNode.props.children === '뒤로 가기'),
      );
    expect(backButton).toBeDefined();
    act((): void => backButton?.props.onPress());
    expect(handleBack).toHaveBeenCalledTimes(1);
    expect(handleCancel).not.toHaveBeenCalled();
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('음성 처리 중 시스템 뒤로가기를 무시한다', async (): Promise<void> => {
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(
        <EmergencyInputWaitingModal
          isVisible
          message="음성 입력을 분석하고 있습니다."
        />,
      );
    });

    const modal = renderer.root.findByType(Modal);
    expect(modal.props.visible).toBe(true);
    expect(() => modal.props.onRequestClose()).not.toThrow();
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('음성 추가 화면에서는 버튼을 눌러야 녹음을 시작한다', async (): Promise<void> => {
    const handleStartVoice = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(
        <PhotoSymptomInputModal
          additionalText=""
          isUploading={false}
          isVoiceRecording={false}
          isVoiceStarting={false}
          photoCount={1}
          photoUris={['file:///injury.jpg']}
          step="voice"
          onAddPhoto={jest.fn()}
          onBack={jest.fn()}
          onCancel={jest.fn()}
          onChangeAdditionalText={jest.fn()}
          onRemovePhoto={jest.fn()}
          onSelectText={jest.fn()}
          onSelectVoice={jest.fn()}
          onStartVoice={handleStartVoice}
          onSendPhotosOnly={jest.fn()}
          onSubmitText={jest.fn()}
          onSubmitVoice={jest.fn()}
        />,
      );
    });

    const startButton = renderer.root
      .findAllByType(TouchableOpacity)
      .find(button =>
        button
          .findAllByType(Text)
          .some(textNode => textNode.props.children === '녹음 시작'),
      );
    expect(startButton).toBeDefined();
    act((): void => startButton?.props.onPress());
    expect(handleStartVoice).toHaveBeenCalledTimes(1);
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('사진 전송 중에는 시스템 뒤로가기로 입력 화면을 닫지 않는다', async (): Promise<void> => {
    const handleCancel = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(
        <PhotoSymptomInputModal
          additionalText=""
          isUploading
          isVoiceRecording={false}
          isVoiceStarting={false}
          photoCount={2}
          photoUris={['file:///injury-1.jpg', 'file:///injury-2.jpg']}
          step="options"
          onAddPhoto={jest.fn()}
          onBack={jest.fn()}
          onCancel={handleCancel}
          onChangeAdditionalText={jest.fn()}
          onRemovePhoto={jest.fn()}
          onSelectText={jest.fn()}
          onSelectVoice={jest.fn()}
          onStartVoice={jest.fn()}
          onSendPhotosOnly={jest.fn()}
          onSubmitText={jest.fn()}
          onSubmitVoice={jest.fn()}
        />,
      );
    });

    const modal = renderer.root.findByType(Modal);
    act((): void => modal.props.onRequestClose());
    expect(handleCancel).not.toHaveBeenCalled();
    await act(async (): Promise<void> => renderer.unmount());
  });
});
