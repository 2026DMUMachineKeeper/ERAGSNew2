import React from 'react';
import { Alert, Modal, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { GuideHeader } from '@/components/EmergencyGuide/GuideHeader';
import { GuideNextButton } from '@/components/EmergencyGuide/GuideNextButton';
import { StepDetail } from '@/components/EmergencyGuide/StepDetail';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideResponse } from '@/types';

import { EmergencyGuideScreen } from '@/screens/EmergencyGuideScreen';

jest.mock('@/assets', () => ({ BackIcon: (): null => null }));
jest.mock('@/services', () => ({
  getEmergencyGuideImageUrl: jest.fn(() => ''),
  speakTts: jest.fn(async () => {}),
  stopTts: jest.fn(async () => {}),
}));

const GUIDE: EmergencyGuideResponse = {
  sessionId: 'session-1',
  requestId: 'request-1',
  generatedAt: '2026-09-11T00:00:00.000Z',
  status: 'COMPLETE',
  patientContext: null,
  evidence: null,
  assessment: null,
  treatment: {
    routeCode: 'A',
    modelVersion: null,
    steps: [7, 19, 35].map((stepId, index) => ({
      stepId,
      stepNo: index + 1,
      instruction: `테스트 처치 ${index + 1}`,
      checkpointQuestion: '상태를 확인하세요.',
      requiredItemId: null,
      requiredItemName: null,
      requiredQuantity: 0,
      requiredSlotId: null,
      imageResource: null,
      imageUrl: null,
    })),
  },
  error: null,
};

describe('EmergencyGuideScreen 처치 완료 확인', () => {
  let renderer: ReactTestRenderer;
  const navigation = { replace: jest.fn(), goBack: jest.fn() };

  const pressNext = async (): Promise<void> => {
    await act(async () => {
      renderer.root.findByType(GuideNextButton).props.onPress();
    });
  };

  const answerCompletion = async (label: string): Promise<void> => {
    const calls = jest.mocked(Alert.alert).mock.calls;
    const button = calls[calls.length - 1]?.[2]?.find(
      item => item.text === label,
    );
    expect(button).toBeDefined();
    await act(async () => button?.onPress?.());
  };

  const pressButton = async (label: string): Promise<void> => {
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find(item => item.props.accessibilityLabel === label);
    expect(button).toBeDefined();
    await act(async () => button?.props.onPress());
  };

  beforeEach(async (): Promise<void> => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useEmergencyGuideStore.getState().startGuide({
      guide: GUIDE,
      source: 'manual',
    });
    await act(async () => {
      renderer = create(
        <EmergencyGuideScreen
          navigation={navigation as never}
          route={{} as never}
        />,
      );
    });
  });

  afterEach(async (): Promise<void> => {
    await act(async () => renderer.unmount());
    useEmergencyGuideStore.getState().resetGuide();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('완료를 확인해야 현재 단계를 기록하고 다음 단계로 이동한다', async (): Promise<void> => {
    await pressNext();

    expect(Alert.alert).toHaveBeenLastCalledWith(
      '처치 완료 확인',
      '1단계: 테스트 처치 1\n\n이 단계의 처치를 완료했나요?',
      expect.any(Array),
      { cancelable: true },
    );
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [],
      currentStepIndex: 0,
      handoverStatus: null,
    });

    await answerCompletion('아직 안 했어요');
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [],
      currentStepIndex: 0,
    });

    await pressNext();
    await answerCompletion('완료했어요');
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [7],
      currentStepIndex: 1,
    });
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it.each([
    ['완료했어요 · 중단', [7, 19]],
    ['아직 안 했어요 · 중단', [7]],
  ])('중단 시 %s 선택에 따라 현재 처치 기록을 반영한다', async (label, completedStepIds): Promise<void> => {
    await pressNext();
    await answerCompletion('완료했어요');
    await pressButton('응급처치 중단');
    expect(navigation.replace).not.toHaveBeenCalled();

    await pressButton(label);
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds,
      currentStepIndex: 1,
      handoverStatus: 'IN_PROGRESS',
    });
    expect(navigation.replace).toHaveBeenCalledWith('QRCode');
  });

  it('중단 취소와 모달 닫기는 처치 기록과 현재 단계를 변경하지 않는다', async (): Promise<void> => {
    await pressButton('응급처치 중단');
    await pressButton('취소');
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);

    await pressButton('응급처치 중단');
    await act(async () => {
      renderer.root.findByType(Modal).props.onRequestClose();
    });
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [],
      currentStepIndex: 0,
      handoverStatus: null,
    });
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('이전 단계로 돌아가도 이미 확인한 완료 기록을 유지한다', async (): Promise<void> => {
    await pressNext();
    await answerCompletion('완료했어요');
    await act(async () => {
      renderer.root.findByType(GuideHeader).props.onBackPress();
    });
    expect(renderer.root.findByType(StepDetail).props.isStepCompleted).toBe(true);

    await pressNext();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [7],
      currentStepIndex: 1,
    });

    await act(async () => {
      renderer.root.findByType(GuideHeader).props.onBackPress();
    });
    await pressButton('응급처치 중단');
    await pressButton('중단');
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [7],
      handoverStatus: 'IN_PROGRESS',
    });
  });

  it('마지막 단계도 완료 확인 후에만 전체 완료로 인계한다', async (): Promise<void> => {
    for (let index = 0; index < 2; index += 1) {
      await pressNext();
      await answerCompletion('완료했어요');
    }

    await pressNext();
    await answerCompletion('아직 안 했어요');
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [7, 19],
      currentStepIndex: 2,
      handoverStatus: null,
    });
    expect(navigation.replace).not.toHaveBeenCalled();

    await pressNext();
    await answerCompletion('완료했어요');
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [7, 19, 35],
      handoverStatus: 'COMPLETED',
    });
    expect(navigation.replace).toHaveBeenCalledWith('QRCode');
  });
});
