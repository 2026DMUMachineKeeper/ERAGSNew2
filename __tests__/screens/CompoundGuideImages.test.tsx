import React from 'react';
import { Alert, Image, Text, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StepDetail } from '@/components/EmergencyGuide/StepDetail';
import { GuideHeader } from '@/components/EmergencyGuide/GuideHeader';
import { GuideNextButton } from '@/components/EmergencyGuide/GuideNextButton';
import { EmergencyGuideScreen } from '@/screens/EmergencyGuideScreen';
import { CompoundGuideStep } from '@/screens/emergencyGuide/components/CompoundGuideStep';
import {
  completeCompoundGuideStep,
  readCompoundGuideSession,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';
import { getCompoundStepPresentation } from '@/utils/compoundGuidePresentation';
import type { CompoundGuideSnapshot, EmergencyGuideResponse } from '@/types';
import { QA19_CASES } from '../../testSupport/qa19';

jest.mock('@/assets', () => ({ BackIcon: () => null }));
jest.mock('@/services', () => ({
  ApiRequestError: jest.requireActual('@/services/apiError.service')
    .ApiRequestError,
  readCompoundGuideSession: jest.fn(),
  completeCompoundGuideStep: jest.fn(),
  getCompoundGuideErrorMessage: jest.fn(() => '서버 확인 실패'),
  getEmergencyGuideImageUrl: jest.requireActual(
    '@/services/emergencyGuide.service',
  ).getEmergencyGuideImageUrl,
  speakTts: jest.fn(async () => {}),
  stopTts: jest.fn(async () => {}),
}));
const guide = QA19_CASES[0].response.data as unknown as EmergencyGuideResponse;
const initial = parseCompoundGuideSnapshot({
  ...guide,
  planId: guide.compound?.planId,
});
const navigation = {
  replace: jest.fn(),
  popTo: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
};
let renderer: ReactTestRenderer;
const text = (): string =>
  JSON.stringify(
    renderer.root.findAllByType(Text).map(item => item.props.children),
  );
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useEmergencyGuideStore.getState().resetGuide();
  jest.mocked(readCompoundGuideSession).mockResolvedValue(initial);
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  useEmergencyGuideStore.getState().resetGuide();
  jest.restoreAllMocks();
});
const mount = async (value = guide): Promise<void> => {
  useEmergencyGuideStore.getState().startGuide({
    guide: value,
    mainLabel: '출혈 · 골절/타박상',
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
};
it('결과 요약보다 먼저 서버 현재 단계와 그 손상의 이미지를 표시한다', async () => {
  await mount();
  expect(renderer.root.findAllByType(StepDetail)).toHaveLength(1);
  expect(renderer.root.findByType(GuideHeader).props.centerLabel).toBe(
    '응급처치 종류',
  );
  expect(renderer.root.findByType(GuideNextButton).props.title).toBe(
    '다음 단계',
  );
  expect(text()).not.toContain('평가 결과');
  expect(text()).not.toContain('실제 사용 기록');
  const step = renderer.root.findByType(CompoundGuideStep);
  expect(step.props.step.instruction).toBe(
    initial.compound.execution[0].instruction,
  );
  expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
    initial.compound.execution[0].instruction,
  );
  const image = renderer.root.findByType(Image);
  expect(image.props.source.uri).toBe(
    'test-api-base-url/images/frac_mild_rest.png',
  );
  expect(image.props.accessibilityLabel).toContain('손상 2');
});
it('완료 확인 전에는 그대로 있고 서버가 다음 단계를 반환하면 이미지도 함께 바뀐다', async () => {
  await mount();
  const next: CompoundGuideSnapshot = {
    ...initial,
    progress: {
      ...initial.progress!,
      revision: 1,
      currentStepId: initial.compound.execution[1].executionStepId,
      completedStepIds: [initial.compound.execution[0].executionStepId],
    },
  };
  jest
    .mocked(completeCompoundGuideStep)
    .mockResolvedValueOnce({ outcome: 'COMPLETED', snapshot: next });
  const button = renderer.root
    .findAllByType(TouchableOpacity)
    .find(item => item.props.accessibilityLabel === '현재 단계 처치 완료')!;
  await act(async () => button.props.onPress());
  expect(completeCompoundGuideStep).not.toHaveBeenCalled();
  expect(renderer.root.findByType(Image).props.source.uri).toContain(
    'frac_mild_rest.png',
  );
  const confirm = jest
    .mocked(Alert.alert)
    .mock.calls.at(-1)?.[2]
    ?.find(item => item.text === '완료했어요');
  await act(async () => confirm?.onPress?.());
  expect(
    renderer.root.findByType(CompoundGuideStep).props.step.executionStepId,
  ).toBe(next.progress!.currentStepId);
  expect(renderer.root.findByType(Image).props.source.uri).toBe(
    'test-api-base-url/images/bleed_mild_clean.png',
  );
  expect(renderer.root.findByType(Image).props.accessibilityLabel).toContain(
    '손상 1',
  );
});
it('이미지 로딩 실패는 안내 문구를 남기고 다음 단계의 이미지를 막지 않는다', async () => {
  await mount();
  await act(async () =>
    renderer.root
      .findByType(Image)
      .props.onError({ nativeEvent: { error: 'offline' } }),
  );
  expect(text()).toContain('이미지를 불러오지 못했습니다.');
  expect(text()).toContain(initial.compound.execution[0].instruction);
  const next = {
    ...initial,
    progress: {
      ...initial.progress!,
      currentStepId: initial.compound.execution[1].executionStepId,
    },
  };
  jest.mocked(readCompoundGuideSession).mockResolvedValueOnce(next);
  await act(async () => renderer.unmount());
  await mount();
  expect(renderer.root.findByType(Image).props.source.uri).toContain(
    'bleed_mild_clean.png',
  );
});
it('부분 안내도 실행 단계·이미지와 보류 손상을 함께 표시한다', async () => {
  const partial = QA19_CASES[2].response
    .data as unknown as EmergencyGuideResponse;
  const snapshot = parseCompoundGuideSnapshot({
    ...partial,
    planId: partial.compound?.planId,
  });
  jest.mocked(readCompoundGuideSession).mockResolvedValueOnce(snapshot);
  await mount(partial);
  expect(
    renderer.root.findByType(CompoundGuideStep).props.step.executionStepId,
  ).toBe(snapshot.progress!.currentStepId);
  expect(renderer.root.findByType(Image).props.source.uri).toContain(
    'bleed_mild_clean.png',
  );
  expect(text()).toContain('손상 안내 보류');
  expect(text()).not.toContain('전체 처치 완료');
});
it('원본 이미지가 없는 단계에 다른 단계의 이미지를 끼워 넣지 않는다', async () => {
  const plan = {
    ...initial.compound,
    injuries: initial.compound.injuries.map(injury => ({
      ...injury,
      guide: injury.guide
        ? {
            ...injury.guide,
            steps: injury.guide.steps.map(step => ({
              ...step,
              imageUrl: null,
              imageResource: null,
            })),
          }
        : null,
    })),
  };
  await act(async () => {
    renderer = create(
      <CompoundGuideStep plan={plan} step={plan.execution[0]} stepIndex={0} />,
    );
  });
  expect(renderer.root.findAllByType(Image)).toHaveLength(0);
  expect(text()).toContain('제공된 이미지가 없습니다.');
});
it('여러 출처가 있는 실행은 지시를 바꾸지 않고 각 손상의 표시 자료를 연결한다', () => {
  const execution = {
    ...initial.compound.execution[0],
    sources: [
      initial.compound.execution[0].sources[0],
      initial.compound.execution[1].sources[0],
    ],
  };
  const presentation = getCompoundStepPresentation(initial.compound, execution);
  expect(presentation.sources.map(source => source.step.imageResource)).toEqual(
    ['frac_mild_rest.png', 'bleed_mild_clean.png'],
  );
  expect(presentation.checkpoints).toEqual(['처치를 완료하셨나요?']);
  expect(execution.instruction).toBe(initial.compound.execution[0].instruction);
});

it('이전 단계는 같은 화면으로 다시 볼 수 있으며 다음을 눌러도 완료를 중복 전송하지 않는다', async () => {
  const restored = {
    ...initial,
    progress: {
      ...initial.progress!,
      revision: 1,
      currentStepId: initial.compound.execution[1].executionStepId,
      completedStepIds: [initial.compound.execution[0].executionStepId],
    },
  };
  jest.mocked(readCompoundGuideSession).mockResolvedValueOnce(restored);
  await mount();
  await act(async () =>
    renderer.root.findByType(GuideHeader).props.onBackPress(),
  );
  expect(renderer.root.findByType(StepDetail).props.isStepCompleted).toBe(true);
  expect(renderer.root.findByType(Image).props.source.uri).toContain(
    'frac_mild_rest.png',
  );
  await act(async () =>
    renderer.root.findByType(GuideNextButton).props.onPress(),
  );
  expect(renderer.root.findByType(Image).props.source.uri).toContain(
    'bleed_mild_clean.png',
  );
  expect(completeCompoundGuideStep).not.toHaveBeenCalled();
});
it('중단 때 아직 하지 않은 처치는 기록하지 않고 화면을 닫는다', async () => {
  navigation.goBack.mockClear();
  await mount();
  await act(async () =>
    renderer.root.findByType(StepDetail).props.onStopPress(false),
  );
  expect(completeCompoundGuideStep).not.toHaveBeenCalled();
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});
it('중단 전 완료 응답이 유실되면 화면을 닫지 않고 같은 완료 요청을 보존한다', async () => {
  navigation.goBack.mockClear();
  jest
    .mocked(completeCompoundGuideStep)
    .mockRejectedValueOnce(new TypeError('offline'));
  await mount();
  await act(async () =>
    renderer.root.findByType(StepDetail).props.onStopPress(true),
  );
  expect(navigation.goBack).not.toHaveBeenCalled();
  expect(
    useEmergencyGuideStore.getState().compoundPendingCompletion,
  ).not.toBeNull();
  expect(renderer.root.findByType(GuideNextButton).props.title).toBe(
    '완료 다시 확인',
  );
});

it('중단 전 처치 완료는 서버 기록을 확인한 뒤에만 화면을 닫는다', async () => {
  navigation.goBack.mockClear();
  const next: CompoundGuideSnapshot = {
    ...initial,
    progress: {
      ...initial.progress!,
      revision: 1,
      currentStepId: initial.compound.execution[1].executionStepId,
      completedStepIds: [initial.compound.execution[0].executionStepId],
    },
  };
  jest
    .mocked(completeCompoundGuideStep)
    .mockResolvedValueOnce({ outcome: 'COMPLETED', snapshot: next });
  await mount();
  await act(async () =>
    renderer.root.findByType(StepDetail).props.onStopPress(true),
  );
  expect(completeCompoundGuideStep).toHaveBeenCalledTimes(1);
  expect(
    useEmergencyGuideStore.getState().compoundSnapshot?.progress
      ?.completedStepIds,
  ).toContain(initial.compound.execution[0].executionStepId);
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});

it('하나의 실행 단계가 두 손상을 가리키면 같은 공용 안내에 두 이미지를 표시한다', async () => {
  const step = {
    ...initial.compound.execution[0],
    sources: [
      initial.compound.execution[0].sources[0],
      initial.compound.execution[1].sources[0],
    ],
  };
  await act(async () => {
    renderer = create(
      <CompoundGuideStep plan={initial.compound} step={step} stepIndex={0} />,
    );
  });
  expect(renderer.root.findAllByType(StepDetail)).toHaveLength(1);
  expect(
    renderer.root.findAllByType(Image).map(image => image.props.source.uri),
  ).toEqual([
    'test-api-base-url/images/frac_mild_rest.png',
    'test-api-base-url/images/bleed_mild_clean.png',
  ]);
  expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
    step.instruction,
  );
});
