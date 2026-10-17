import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StepDetail } from '@/components/EmergencyGuide/StepDetail';
import { GuideHeader } from '@/components/EmergencyGuide/GuideHeader';
import { EmergencyGuideScreen } from '@/screens/EmergencyGuideScreen';
import {
  completeCompoundGuideStep,
  readCompoundGuideSession,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';
import type { EmergencyGuideResponse } from '@/types';
import { QA19_CASES } from '../../testSupport/qa19';
jest.mock('@/assets', () => ({ BackIcon: () => null }));
jest.mock('@/services', () => ({
  ApiRequestError: jest.requireActual('@/services/apiError.service')
    .ApiRequestError,
  readCompoundGuideSession: jest.fn(),
  completeCompoundGuideStep: jest.fn(),
  getCompoundGuideErrorMessage: jest.fn(() => '응답 확인 필요'),
  getEmergencyGuideImageUrl: jest.fn(() => ''),
  speakTts: jest.fn(async () => {}),
  stopTts: jest.fn(async () => {}),
}));
const navigation = {
  replace: jest.fn(),
  popTo: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useEmergencyGuideStore.getState().resetGuide();
});
it.each(QA19_CASES)(
  'QA $request.requestId: 단일과 같은 화면에 $count단계 중 현재 단계만 표시한다',
  async sample => {
    const guide = sample.response.data as unknown as EmergencyGuideResponse;
    const snapshot = parseCompoundGuideSnapshot({
      ...guide,
      planId: guide.compound?.planId,
    });
    jest.mocked(readCompoundGuideSession).mockResolvedValue(snapshot);
    jest
      .mocked(completeCompoundGuideStep)
      .mockRejectedValue(new TypeError('network'));
    useEmergencyGuideStore
      .getState()
      .startGuide({ guide, mainLabel: 'QA 복합', source: 'manual' });
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {
        renderer = create(
          <EmergencyGuideScreen
            navigation={navigation as never}
            route={{} as never}
          />,
        );
      });
      const text = JSON.stringify(
        renderer.root.findAllByType(Text).map(item => item.props.children),
      );
      expect(renderer.root.findAllByType(StepDetail)).toHaveLength(1);
      expect(renderer.root.findByType(GuideHeader).props.progress).toBe(
        1 / sample.count,
      );
      expect(text).not.toContain('평가 결과');
      expect(text).not.toContain('전체 처치 완료');
      expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
        snapshot.compound.execution[0].instruction,
      );
      if (sample.count === 2) {
        expect(text).toContain('손상 안내 보류');
      }
      const complete = renderer.root
        .findAllByType(TouchableOpacity)
        .find(
          button => button.props.accessibilityLabel === '현재 단계 처치 완료',
        )!;
      expect(complete.props.disabled).toBe(false);
      await act(async () => complete.props.onPress());
      const confirm = jest
        .mocked(Alert.alert)
        .mock.calls.at(-1)?.[2]
        ?.find(button => button.text === '완료했어요');
      await act(async () => confirm?.onPress?.());
      expect(completeCompoundGuideStep).toHaveBeenCalledWith(
        snapshot.sessionId,
        {
          planId: snapshot.planId,
          executionStepId: snapshot.progress!.currentStepId,
          expectedRevision: snapshot.progress!.revision,
          idempotencyKey: expect.any(String),
        },
        expect.any(AbortSignal),
      );
      expect(
        useEmergencyGuideStore.getState().compoundSnapshot?.usedSupplies,
      ).toEqual([]);
    } finally {
      await act(async () => renderer?.unmount());
      useEmergencyGuideStore.getState().resetGuide();
    }
  },
);
