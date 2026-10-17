import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ApiRequestError } from '@/services/apiError.service';
import {
  completeCompoundGuideStep,
  readCompoundGuideSession,
  speakTts,
} from '@/services';
import { EmergencyGuideScreen } from '@/screens/EmergencyGuideScreen';
import { StepDetail } from '@/components/EmergencyGuide/StepDetail';
import { GuideNextButton } from '@/components/EmergencyGuide/GuideNextButton';
import * as compoundStatus from '@/screens/emergencyGuide/components/CompoundGuideStatus';
import { useEmergencyGuideStore } from '@/store';
import type { CompoundGuideSnapshot } from '@/types';
import {
  COMPOUND_CREATION,
  INITIAL_COMPOUND_SNAPSHOT,
  completedSnapshot,
  blockedSnapshot,
  PARTIAL_COMPOUND_SNAPSHOT,
  PARTIAL_FINISHED_SNAPSHOT,
} from '../../testSupport/compoundGuide';

jest.mock('@/assets', () => ({ BackIcon: () => null }));
jest.mock('@/services', () => ({
  ApiRequestError: jest.requireActual('@/services/apiError.service')
    .ApiRequestError,
  readCompoundGuideSession: jest.fn(),
  completeCompoundGuideStep: jest.fn(),
  getCompoundGuideErrorMessage: jest.fn(() => '요청을 확인하지 못했습니다.'),
  getEmergencyGuideImageUrl: jest.fn(() => ''),
  speakTts: jest.fn(async () => {}),
  stopTts: jest.fn(async () => {}),
}));

describe('복합 가이드 실행 화면', () => {
  let renderer: ReactTestRenderer;
  const navigation = {
    replace: jest.fn(),
    popTo: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
  };
  const mount = async (): Promise<void> => {
    await act(async () => {
      renderer = create(
        <EmergencyGuideScreen
          navigation={navigation as never}
          route={{} as never}
        />,
      );
    });
  };
  const press = async (label: string): Promise<void> => {
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find(item => item.props.accessibilityLabel === label);
    expect(button).toBeDefined();
    await act(async () => button!.props.onPress());
  };
  const confirm = async (): Promise<void> => {
    const button = jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find(item => item.text === '완료했어요');
    expect(button).toBeDefined();
    await act(async () => button!.onPress?.());
  };
  const text = (): string =>
    JSON.stringify(
      renderer.root.findAllByType(Text).map(item => item.props.children),
    );

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest
      .mocked(readCompoundGuideSession)
      .mockResolvedValue(INITIAL_COMPOUND_SNAPSHOT);
    useEmergencyGuideStore
      .getState()
      .startGuide({ guide: COMPOUND_CREATION, source: 'manual' });
    await mount();
  });
  afterEach(async () => {
    await act(async () => renderer.unmount());
    useEmergencyGuideStore.getState().resetGuide();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('빈 단일 steps 대신 서버 실행 순서를 표시하고 첫 손상 완료 후 다음 손상을 유지한다', async () => {
    expect(renderer.root.findAllByType(StepDetail)).toHaveLength(1);
    expect(speakTts).not.toHaveBeenCalled();
    expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
      INITIAL_COMPOUND_SNAPSHOT.compound.execution[0].instruction,
    );
    jest.mocked(completeCompoundGuideStep).mockResolvedValueOnce({
      outcome: 'COMPLETED',
      snapshot: completedSnapshot(1),
    });
    await press('현재 단계 처치 완료');
    expect(completeCompoundGuideStep).not.toHaveBeenCalled();
    await confirm();
    expect(
      useEmergencyGuideStore.getState().compoundSnapshot?.progress,
    ).toMatchObject({
      status: 'IN_PROGRESS',
      currentStepId:
        INITIAL_COMPOUND_SNAPSHOT.compound.execution[1].executionStepId,
    });
    expect(useEmergencyGuideStore.getState().completedStepIds).toEqual([]);
    expect(useEmergencyGuideStore.getState().handoverStatus).toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
    jest.mocked(completeCompoundGuideStep).mockResolvedValueOnce({
      outcome: 'COMPLETED',
      snapshot: completedSnapshot(2),
    });
    await press('현재 단계 처치 완료');
    await confirm();
    expect(text()).not.toContain('전체 처치 완료');
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith('QRCode');
    expect(useEmergencyGuideStore.getState().handoverStatus).toBe('COMPLETED');
    expect(
      useEmergencyGuideStore.getState().compoundSnapshot?.usedSupplies,
    ).toHaveLength(2);
    expect(renderer.root.findByType(GuideNextButton).props.isDisabled).toBe(
      true,
    );
  });
  it('응답 유실 뒤 화면 재진입에서도 같은 키·단계·revision으로 재시도한다', async () => {
    jest
      .mocked(completeCompoundGuideStep)
      .mockRejectedValueOnce(new TypeError('response lost'));
    await press('현재 단계 처치 완료');
    await confirm();
    const original = jest.mocked(completeCompoundGuideStep).mock.calls[0][1];
    expect(
      useEmergencyGuideStore.getState().compoundSnapshot?.progress?.revision,
    ).toBe(0);
    await act(async () => renderer.unmount());
    await mount();
    jest.mocked(completeCompoundGuideStep).mockResolvedValueOnce({
      outcome: 'DUPLICATE',
      snapshot: completedSnapshot(1),
    });
    await press('현재 단계 처치 완료');
    expect(jest.mocked(completeCompoundGuideStep).mock.calls[1][1]).toEqual(
      original,
    );
    expect(
      useEmergencyGuideStore.getState().compoundPendingCompletion,
    ).toBeNull();
  });
  it('중복 완료 입력은 하나의 서버 요청으로 처리한다', async () => {
    const statusSpy = jest.spyOn(compoundStatus, 'CompoundGuideStatus');
    let resolve!: (value: {
      outcome: 'COMPLETED';
      snapshot: CompoundGuideSnapshot;
    }) => void;
    jest.mocked(completeCompoundGuideStep).mockReturnValueOnce(
      new Promise(done => {
        resolve = done;
      }),
    );
    await press('현재 단계 처치 완료');
    const callback = jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find(item => item.text === '완료했어요')?.onPress;
    await act(async () => {
      callback?.();
      callback?.();
    });
    expect(completeCompoundGuideStep).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
      INITIAL_COMPOUND_SNAPSHOT.compound.execution[0].instruction,
    );
    expect(text()).not.toContain('처치 완료 여부를 확인하지 못했습니다.');
    expect(text()).not.toContain('완료 다시 확인');
    expect(text()).not.toContain('다시 확인');
    expect(renderer.root.findByType(GuideNextButton).props.isDisabled).toBe(
      true,
    );
    await act(async () =>
      resolve({ outcome: 'COMPLETED', snapshot: completedSnapshot(1) }),
    );
    expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
      INITIAL_COMPOUND_SNAPSHOT.compound.execution[1].instruction,
    );
    expect(statusSpy).not.toHaveBeenCalled();
  });
  it('저장 중에는 경고를 숨기고 실제 응답 유실 이후에만 완료 재확인을 표시한다', async () => {
    let reject!: (error: Error) => void;
    jest.mocked(completeCompoundGuideStep).mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    await press('현재 단계 처치 완료');
    const callback = jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find(item => item.text === '완료했어요')?.onPress;
    await act(async () => {
      callback?.();
    });
    expect(text()).not.toContain('처치 완료 여부를 확인하지 못했습니다.');
    await act(async () => reject(new TypeError('response lost')));
    expect(text()).toContain('처치 완료 여부를 확인하지 못했습니다.');
    expect(renderer.root.findByType(GuideNextButton).props.title).toBe(
      '완료 다시 확인',
    );
    expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
      INITIAL_COMPOUND_SNAPSHOT.compound.execution[0].instruction,
    );
  });
  it('최초 저장 상태를 기다리는 동안 결과 화면을 끼워 넣지 않는다', async () => {
    await act(async () => renderer.unmount());
    useEmergencyGuideStore
      .getState()
      .startGuide({ guide: COMPOUND_CREATION, source: 'manual' });
    const statusSpy = jest.spyOn(compoundStatus, 'CompoundGuideStatus');
    let resolve!: (snapshot: CompoundGuideSnapshot) => void;
    jest.mocked(readCompoundGuideSession).mockReturnValueOnce(
      new Promise(done => {
        resolve = done;
      }),
    );
    await mount();
    expect(statusSpy).not.toHaveBeenCalled();
    expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
      INITIAL_COMPOUND_SNAPSHOT.compound.execution[0].instruction,
    );
    expect(renderer.root.findByType(GuideNextButton).props.isDisabled).toBe(
      true,
    );
    await act(async () => resolve(INITIAL_COMPOUND_SNAPSHOT));
    expect(statusSpy).not.toHaveBeenCalled();
    expect(renderer.root.findByType(GuideNextButton).props.isDisabled).toBe(
      false,
    );
  });
  it('재고 부족은 이전 사용량을 유지하고 사용자의 새 시도에 새 키와 최신 revision을 보낸다', async () => {
    jest
      .mocked(readCompoundGuideSession)
      .mockResolvedValue(completedSnapshot(1));
    await act(async () => renderer.unmount());
    await mount();
    jest.mocked(completeCompoundGuideStep).mockResolvedValueOnce({
      outcome: 'BLOCKED',
      snapshot: blockedSnapshot(),
    });
    await press('현재 단계 처치 완료');
    await confirm();
    const original = jest.mocked(completeCompoundGuideStep).mock.calls[0][1];
    expect(text()).toContain('재고가 부족');
    expect(
      useEmergencyGuideStore.getState().compoundSnapshot?.usedSupplies,
    ).toHaveLength(1);
    jest.mocked(completeCompoundGuideStep).mockResolvedValueOnce({
      outcome: 'COMPLETED',
      snapshot: completedSnapshot(2),
    });
    await press('현재 단계 처치 완료');
    await confirm();
    const next = jest.mocked(completeCompoundGuideStep).mock.calls[1][1];
    expect(next.expectedRevision).toBe(2);
    expect(next.idempotencyKey).not.toBe(original.idempotencyKey);
  });
  it('409는 최신 상태 조회만 수행하며 다음 단계를 자동 완료하지 않는다', async () => {
    jest.mocked(completeCompoundGuideStep).mockRejectedValueOnce(
      new ApiRequestError(
        {
          code: 'REVISION_CONFLICT',
          message: 'conflict',
          details: [],
        },
        409,
      ),
    );
    jest
      .mocked(readCompoundGuideSession)
      .mockResolvedValueOnce(completedSnapshot(1));
    await press('현재 단계 처치 완료');
    await confirm();
    expect(completeCompoundGuideStep).toHaveBeenCalledTimes(1);
    expect(
      useEmergencyGuideStore.getState().compoundSnapshot?.progress?.revision,
    ).toBe(1);
    expect(text()).toContain('최신 진행 상태');
    expect(
      useEmergencyGuideStore.getState().compoundPendingCompletion,
    ).toBeNull();
  });
  it('409 이후 최신 조회도 실패하면 오래된 단계 완료 버튼을 막는다', async () => {
    jest
      .mocked(completeCompoundGuideStep)
      .mockRejectedValueOnce(
        new ApiRequestError(
          { code: 'REVISION_CONFLICT', message: 'conflict', details: [] },
          409,
        ),
      );
    jest
      .mocked(readCompoundGuideSession)
      .mockRejectedValueOnce(new TypeError('offline'));
    await press('현재 단계 처치 완료');
    await confirm();
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find(item => item.props.accessibilityLabel === '현재 단계 처치 완료');
    expect(button?.props.disabled).toBe(true);
  });
  it('최신 조회가 실패해도 생성 재전송에 포함된 완료 기록을 지우지 않는다', async () => {
    await act(async () => renderer.unmount());
    const saved = completedSnapshot(1);
    useEmergencyGuideStore.getState().startGuide({
      guide: {
        ...COMPOUND_CREATION,
        progress: saved.progress,
        usedSupplies: saved.usedSupplies,
      },
      source: 'manual',
    });
    jest
      .mocked(readCompoundGuideSession)
      .mockRejectedValueOnce(new TypeError('offline'));
    await mount();
    expect(
      useEmergencyGuideStore.getState().compoundSnapshot?.progress
        ?.completedStepIds,
    ).toEqual(saved.progress?.completedStepIds);
    expect(
      renderer.root
        .findAllByType(TouchableOpacity)
        .some(item => item.props.accessibilityLabel === '새 문진 시작'),
    ).toBe(false);
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find(item => item.props.accessibilityLabel === '현재 단계 처치 완료');
    expect(button?.props.disabled).toBe(true);
  });
  it('부분 계획의 실행이 끝나도 보류 손상이 남으면 전체 완료로 표시하지 않는다', async () => {
    jest
      .mocked(readCompoundGuideSession)
      .mockResolvedValueOnce(PARTIAL_COMPOUND_SNAPSHOT);
    await act(async () => renderer.unmount());
    await mount();
    jest.mocked(completeCompoundGuideStep).mockResolvedValueOnce({
      outcome: 'COMPLETED',
      snapshot: PARTIAL_FINISHED_SNAPSHOT,
    });
    await press('현재 단계 처치 완료');
    await confirm();
    expect(text()).toContain('보류된 손상이 남아');
    expect(text()).not.toContain('전체 처치 완료');
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(useEmergencyGuideStore.getState().handoverStatus).toBeNull();
  });
  it('이미 완료한 세션을 복원하면 서버 확인 후 한 번만 QR 화면으로 이동한다', async () => {
    expect(navigation.replace).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
    jest
      .mocked(readCompoundGuideSession)
      .mockResolvedValueOnce(completedSnapshot(2));
    await mount();
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith('QRCode');
    await act(async () => jest.advanceTimersByTime(1000));
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });
  it('완료된 로컬 기록이 있어도 서버 조회가 실패하면 자동 이동하지 않는다', async () => {
    await act(async () => renderer.unmount());
    useEmergencyGuideStore
      .getState()
      .applyCompoundSnapshot(completedSnapshot(2));
    jest
      .mocked(readCompoundGuideSession)
      .mockRejectedValueOnce(new TypeError('offline'));
    await mount();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
  it('마지막 단계의 중단 확인에서 완료를 선택해도 QR 이동과 뒤로 가기가 중복되지 않는다', async () => {
    const statusSpy = jest.spyOn(compoundStatus, 'CompoundGuideStatus');
    await act(async () => renderer.unmount());
    jest
      .mocked(readCompoundGuideSession)
      .mockResolvedValueOnce(completedSnapshot(1));
    await mount();
    jest.mocked(completeCompoundGuideStep).mockResolvedValueOnce({
      outcome: 'COMPLETED',
      snapshot: completedSnapshot(2),
    });
    await act(async () =>
      renderer.root.findByType(StepDetail).props.onStopPress(true),
    );
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(navigation.replace).toHaveBeenCalledWith('QRCode');
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(statusSpy).not.toHaveBeenCalled();
    expect(renderer.root.findByType(StepDetail).props.step.instruction).toBe(
      INITIAL_COMPOUND_SNAPSHOT.compound.execution[1].instruction,
    );
  });
  it('다른 세션으로 바뀐 후 도착한 완료 응답은 현재 세션을 덮어쓰지 않는다', async () => {
    let resolve!: (value: {
      outcome: 'COMPLETED';
      snapshot: CompoundGuideSnapshot;
    }) => void;
    jest.mocked(completeCompoundGuideStep).mockReturnValueOnce(
      new Promise(done => {
        resolve = done;
      }),
    );
    await press('현재 단계 처치 완료');
    const callback = jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find(item => item.text === '완료했어요')?.onPress;
    await act(async () => {
      callback?.();
    });
    await act(async () => renderer.unmount());
    useEmergencyGuideStore.getState().startGuide({
      guide: { ...COMPOUND_CREATION, sessionId: 'new-session' },
      source: 'manual',
    });
    await act(async () =>
      resolve({ outcome: 'COMPLETED', snapshot: completedSnapshot(1) }),
    );
    expect(useEmergencyGuideStore.getState().guide?.sessionId).toBe(
      'new-session',
    );
    expect(useEmergencyGuideStore.getState().compoundSnapshot).toBeNull();
  });
});
