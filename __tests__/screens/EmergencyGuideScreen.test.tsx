import React from 'react';
import { Alert, AppState, Modal, Text, TouchableOpacity } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { CommonActions, StackActions, StackRouter } from '@react-navigation/routers';

import { GuideHeader } from '@/components/EmergencyGuide/GuideHeader';
import { GuideNextButton } from '@/components/EmergencyGuide/GuideNextButton';
import { StepDetail } from '@/components/EmergencyGuide/StepDetail';
import { useEmergencyGuideStore } from '@/store';
import { requestTtsVoiceDataInstallation, retryEmergencyGuide, speakTts } from '@/services';
import type { EmergencyGuideResponse } from '@/types';

import { EmergencyGuideScreen } from '@/screens/EmergencyGuideScreen';

jest.mock('@/assets', () => ({ BackIcon: (): null => null }));
jest.mock('@/services', () => ({
  getEmergencyGuideImageUrl: jest.fn(() => ''),
  speakTts: jest.fn(async () => {}),
  stopTts: jest.fn(async () => {}),
  requestTtsVoiceDataInstallation: jest.fn(async () => {}),
  retryEmergencyGuide: jest.fn(),
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
  const navigation = {
    replace: jest.fn(),
    popTo: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
  };

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

  it.each([true, false])('ASSESSMENT_ONLY의 요약·119 필요 여부(%s)를 표시한다', async isCall119Required => {
    await act(async () => {
      useEmergencyGuideStore.getState().setGuide({
        ...GUIDE,
        status: 'ASSESSMENT_ONLY',
        assessment: {
          assessmentId: 'assessment-1',
          categoryCode: 'ALLERGY_RASH',
          subtypeCode: 'UNKNOWN',
          severityCode: 'UNKNOWN',
          confidence: null,
          redFlags: [],
          call119Required: isCall119Required,
          summary: '발진 모양의 추가 확인이 필요합니다.',
          reasons: [],
          missingInputs: ['발진 모양', '증상 발생 시각'],
          decisionSource: 'ML_EVIDENCE',
          modelVersion: null,
        },
      });
    });
    const texts = renderer.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('발진 모양의 추가 확인이 필요합니다.');
    expect(texts).not.toContain('추가로 필요한 정보');
    expect(texts).not.toContain('발진 모양');
    expect(texts).not.toContain('증상 발생 시각');
    expect(texts).toContain(`119 신고 ${isCall119Required ? '필요' : '불필요'}`);
    expect(renderer.root.findByType(Modal).props).toMatchObject({
      visible: true,
      transparent: true,
    });
    expect(renderer.root.findAllByType(GuideHeader)).toHaveLength(0);
    expect(renderer.root.findAllByType(GuideNextButton)).toHaveLength(0);
    expect(renderer.root.findAllByType(StepDetail)).toHaveLength(0);
    const spokenCount = jest.mocked(speakTts).mock.calls.length;
    await pressButton('새 문진 시작');
    expect(navigation.popTo).toHaveBeenCalledWith('FirstAid');
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(useEmergencyGuideStore.getState().guide).toBeNull();
    expect(retryEmergencyGuide).not.toHaveBeenCalled();
    expect(speakTts).toHaveBeenCalledTimes(spokenCount);
  });

  it('평가 정보가 없으면 119 불필요로 표시하지 않는다', async () => {
    await act(async () => {
      useEmergencyGuideStore.getState().setGuide({ ...GUIDE, status: 'ASSESSMENT_ONLY' });
    });
    const texts = renderer.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('판단 요약이 없습니다.');
    expect(texts).toContain('119 신고 필요 여부를 확인할 수 없습니다.');
    expect(texts).not.toContain('119 신고 불필요');
  });

  it('한국어 데이터 누락 시 설치를 안내하고 복귀 시 현재 안내를 다시 재생한다', async () => {
    let handleAppStateChange: ((state: AppStateStatus) => void) | undefined;
    const removeListener = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      handleAppStateChange = listener;
      return { remove: removeListener };
    });
    await act(async () => {
      renderer.unmount();
      renderer = create(
        <EmergencyGuideScreen navigation={navigation as never} route={{} as never} />,
      );
    });
    jest.mocked(speakTts).mockRejectedValueOnce(
      Object.assign(new Error('Language data is missing'), { code: 'lang_missing_data' }),
    );
    await act(async () => useEmergencyGuideStore.getState().moveToNextStep(3));
    expect(Alert.alert).toHaveBeenLastCalledWith(
      '한국어 음성 데이터가 필요해요',
      expect.any(String),
      expect.any(Array),
    );
    await answerCompletion('음성 데이터 설치');
    expect(requestTtsVoiceDataInstallation).toHaveBeenCalledTimes(1);
    const spokenCount = jest.mocked(speakTts).mock.calls.length;
    await act(async () => handleAppStateChange?.('background'));
    expect(speakTts).toHaveBeenCalledTimes(spokenCount);
    await act(async () => handleAppStateChange?.('active'));
    expect(speakTts).toHaveBeenCalledTimes(spokenCount + 1);
    expect(speakTts).toHaveBeenLastCalledWith('테스트 처치 2', expect.anything());
    await act(async () => handleAppStateChange?.('active'));
    expect(speakTts).toHaveBeenCalledTimes(spokenCount + 1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('음성 재생에 실패하면 안내 창을 한 번만 띄우고 다음 단계부터 자동 재생하지 않는다', async () => {
    jest.mocked(speakTts).mockRejectedValueOnce(new Error('음성 합성 실패'));
    await act(async () => useEmergencyGuideStore.getState().moveToNextStep(3));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenLastCalledWith('음성 재생 실패', expect.any(String));
    const spokenCount = jest.mocked(speakTts).mock.calls.length;

    await act(async () => useEmergencyGuideStore.getState().moveToNextStep(3));

    expect(speakTts).toHaveBeenCalledTimes(spokenCount);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('화면을 떠나거나 단계를 바꾸면 이전 안내 재생을 취소한다', async () => {
    const signals = jest.mocked(speakTts).mock.calls.map(([, signal]) => signal);
    const currentSignal = signals.at(-1);
    expect(currentSignal?.aborted).toBe(false);

    await act(async () => useEmergencyGuideStore.getState().moveToNextStep(3));
    expect(currentSignal?.aborted).toBe(true);
    const nextSignal = jest.mocked(speakTts).mock.calls.at(-1)?.[1];
    expect(nextSignal?.aborted).toBe(false);

    await act(async () => renderer.unmount());
    expect(nextSignal?.aborted).toBe(true);
    await act(async () => {
      renderer = create(
        <EmergencyGuideScreen navigation={navigation as never} route={{} as never} />,
      );
    });
  });

  it('한국어 데이터 설치 화면을 열지 못하면 설정에서 설치하도록 안내한다', async () => {
    jest.mocked(speakTts).mockRejectedValueOnce(
      Object.assign(new Error('Language data is missing'), { code: 'lang_missing_data' }),
    );
    jest.mocked(requestTtsVoiceDataInstallation).mockRejectedValueOnce(new Error('설치 화면 없음'));
    await act(async () => useEmergencyGuideStore.getState().moveToNextStep(3));
    await answerCompletion('음성 데이터 설치');
    expect(Alert.alert).toHaveBeenLastCalledWith('음성 데이터 설치 안내', expect.any(String));
  });

  it.each([
    ['수동 문진', ['Home', 'FirstAid', 'EmergencyGuide']],
    ['사진·음성 입력', ['Home', 'EmergencyGuide']],
  ])('%s에서 새 문진 시작 후 뒤로가면 홈으로 돌아간다', async (_source, routeNames) => {
    const router = StackRouter({ initialRouteName: 'Home' });
    const options = {
      routeNames: ['Home', 'FirstAid', 'EmergencyGuide'],
      routeParamList: {},
      routeGetIdList: {},
    };
    let state = {
      ...router.getInitialState(options),
      routes: routeNames.map((name, index) => ({ key: `${name}-${index}`, name })),
      index: routeNames.length - 1,
    };
    navigation.popTo.mockImplementationOnce((name: string) => {
      const nextState = router.getStateForAction(state, StackActions.popTo(name), options);
      expect(nextState).not.toBeNull();
      if (nextState) {
        state = router.getRehydratedState(nextState, options);
      }
    });
    await act(async () => {
      useEmergencyGuideStore.getState().setGuide({ ...GUIDE, status: 'ASSESSMENT_ONLY' });
    });

    await pressButton('새 문진 시작');
    expect(state.routes.map(item => item.name)).toEqual(['Home', 'FirstAid']);
    expect(state.index).toBe(1);
    expect(useEmergencyGuideStore.getState().guide).toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();

    const previousState = router.getStateForAction(state, CommonActions.goBack(), options);
    expect(previousState?.routes.map(item => item.name)).toEqual(['Home']);
    expect(previousState?.index).toBe(0);
  });

  it('추가 정보 목록을 표시하지 않고 닫으면 이전 화면으로 돌아간다', async () => {
    await act(async () => {
      useEmergencyGuideStore.getState().setGuide({
        ...GUIDE,
        status: 'ASSESSMENT_ONLY',
        assessment: {
          assessmentId: 'assessment-1',
          categoryCode: 'UNKNOWN',
          subtypeCode: 'UNKNOWN',
          severityCode: 'UNKNOWN',
          confidence: null,
          redFlags: [],
          call119Required: false,
          summary: '입력 증거만으로 사고 유형을 확정하지 못했습니다.',
          reasons: [],
          missingInputs: ['category', '증상 발생 시각'],
          decisionSource: 'ML_EVIDENCE',
          modelVersion: null,
        },
      });
    });
    const texts = renderer.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).not.toContain('추가로 필요한 정보');
    expect(texts).not.toContain('증상 발생 시각');
    expect(texts).not.toContain('category');

    await pressButton('닫기');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    await act(async () => renderer.root.findByType(Modal).props.onRequestClose());
    expect(navigation.goBack).toHaveBeenCalledTimes(2);
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(useEmergencyGuideStore.getState().guide?.status).toBe('ASSESSMENT_ONLY');
    expect(retryEmergencyGuide).not.toHaveBeenCalled();
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
  ])(
    '중단 시 %s 선택에 따라 현재 처치 기록을 반영한다',
    async (label, completedStepIds): Promise<void> => {
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
    },
  );

  it('아무 처치 없이 중단하면 홈으로 이동한다', async (): Promise<void> => {
    await pressButton('응급처치 중단');
    await pressButton('아직 안 했어요 · 중단');

    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [],
      guide: null,
      handoverStatus: null,
    });
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Home' }],
    });
    expect(navigation.replace).not.toHaveBeenCalled();
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
    expect(renderer.root.findByType(StepDetail).props.isStepCompleted).toBe(
      true,
    );

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
