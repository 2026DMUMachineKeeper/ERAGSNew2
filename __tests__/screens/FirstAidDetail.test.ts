import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import type { EmergencyGuideResponse } from '@/types';
import { createEmergencyGuide, retryEmergencyGuide } from '@/services';
import { useEmergencyGuideStore } from '@/store';
import { toEmergencyGuideQuestionnaire } from '@/utils/emergencyQuestionnaire';

import { FirstAidDetail } from '@/screens/FirstAidDetail';

jest.mock('@/assets', () => ({
  BackIcon: (): null => null,
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('@/services', () => ({
  createEmergencyGuide: jest.fn(),
  getEmergencyGuideErrorMessage: jest.fn(),
  retryEmergencyGuide: jest.fn(),
}));

describe('toEmergencyGuideQuestionnaire', () => {
  it('출혈 유형을 Q2 답변으로 자동 추가한다', (): void => {
    expect(
      toEmergencyGuideQuestionnaire({
        immediateDanger: ['NONE'],
        visibleSymptoms: ['BLEEDING'],
        bleedingPattern: ['BLEEDING_CONTINUOUS'],
        woundRisk: ['NONE'],
        ageGroup: ['ADULT'],
      }),
    ).toEqual([
      { questionId: 'Q1_IMMEDIATE_DANGER', answerIds: ['NONE'] },
      { questionId: 'Q2_VISIBLE_SYMPTOMS', answerIds: ['BLEEDING'] },
      {
        questionId: 'B1_BLEEDING_PATTERN',
        answerIds: ['BLEEDING_CONTINUOUS'],
      },
      { questionId: 'B2_BLEEDING_RISKS', answerIds: ['NONE'] },
      { questionId: 'C1_AGE_GROUP', answerIds: ['ADULT'] },
    ]);
  });

  it('화상 유형을 Q2 답변으로 자동 추가한다', (): void => {
    expect(
      toEmergencyGuideQuestionnaire({
        immediateDanger: ['NONE'],
        visibleSymptoms: ['BURN'],
        burnCause: ['BURN_SMALL_AREA'],
        burnSkinState: ['RED_PAINFUL'],
        ageGroup: ['ADULT'],
      }),
    ).toEqual([
      { questionId: 'Q1_IMMEDIATE_DANGER', answerIds: ['NONE'] },
      { questionId: 'Q2_VISIBLE_SYMPTOMS', answerIds: ['BURN'] },
      {
        questionId: 'U1_BURN_LOCATION_CAUSE',
        answerIds: ['BURN_SMALL_AREA'],
      },
      { questionId: 'U2_BURN_SKIN_STATE', answerIds: ['RED_PAINFUL'] },
      { questionId: 'C1_AGE_GROUP', answerIds: ['ADULT'] },
    ]);
  });
});

const PENDING_GUIDE: EmergencyGuideResponse = {
  sessionId: 'session-pending',
  requestId: 'request-pending',
  generatedAt: '2026-09-06T00:00:00.000Z',
  status: 'GUIDE_PENDING',
  patientContext: null,
  evidence: null,
  assessment: {
    assessmentId: 'assessment-1',
    categoryCode: 'BLEEDING',
    subtypeCode: 'BLEEDING_MODERATE',
    severityCode: 'MEDIUM',
    confidence: 0.8,
    redFlags: [],
    call119Required: false,
    summary: '중간 정도의 출혈',
    reasons: ['지속 출혈'],
    missingInputs: [],
    decisionSource: 'ML_EVIDENCE',
    modelVersion: 'test-model',
  },
  treatment: {
    routeCode: null,
    modelVersion: null,
    steps: [],
  },
  error: {
    code: 'GUIDE_PENDING',
    message: '처치 안내를 준비하고 있습니다.',
    details: [],
  },
};

interface NavigationMock {
  addListener: jest.Mock;
  goBack: jest.Mock;
  replace: jest.Mock;
  triggerBeforeRemove: () => void;
}

interface DeferredGuideRequest {
  promise: Promise<EmergencyGuideResponse>;
  reject: (error: Error) => void;
  resolve: (guide: EmergencyGuideResponse) => void;
}

const createNavigation = (): NavigationMock => {
  let handleBeforeRemove: (() => void) | undefined;

  return {
    addListener: jest.fn((_eventName: string, listener: () => void): jest.Mock => {
      handleBeforeRemove = listener;
      return jest.fn();
    }),
    goBack: jest.fn(),
    replace: jest.fn(),
    triggerBeforeRemove: (): void => handleBeforeRemove?.(),
  };
};

const createDeferredGuideRequest = (): DeferredGuideRequest => {
  let resolve!: (guide: EmergencyGuideResponse) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<EmergencyGuideResponse>((resolvePromise, rejectPromise): void => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

const findAction = (
  renderer: ReactTestRenderer,
  label: string,
): ReactTestInstance => {
  const action = renderer.root
    .findAll(node => node.props.accessibilityLabel === label)
    .find(node => typeof node.props.onPress === 'function');

  if (!action) {
    throw new Error(`${label} 버튼을 찾을 수 없습니다.`);
  }

  return action;
};

const prepareLastQuestion = async (renderer: ReactTestRenderer): Promise<void> => {
  const pressOption = async (): Promise<void> => {
    const option = renderer.root
      .findAllByType(TouchableOpacity)
      .find(button => ['checkbox', 'radio'].includes(button.props.accessibilityRole));

    if (!option) {
      throw new Error('문진 답변을 찾을 수 없습니다.');
    }

    await act(async (): Promise<void> => option.props.onPress());
  };
  const pressAction = async (label: string): Promise<void> => {
    const action = findAction(renderer, label);
    await act(async (): Promise<void> => action.props.onPress());
  };

  await pressOption();
  await pressAction('다음 질문');
  await pressAction('다음 질문');
  await pressOption();
  await pressAction('다음 질문');
  await pressOption();
  await pressAction('다음 질문');
  await pressOption();
};

const renderFirstAidDetail = async (
  navigation: NavigationMock,
): Promise<ReactTestRenderer> => {
  let renderer!: ReactTestRenderer;

  await act(async (): Promise<void> => {
    renderer = create(
      React.createElement(FirstAidDetail, {
        navigation: navigation as never,
        route: { params: { mainId: 'bleeding' } } as never,
      }),
    );
  });

  await prepareLastQuestion(renderer);
  return renderer;
};

const startSubmission = (renderer: ReactTestRenderer): Promise<void> => {
  let submission!: Promise<void>;

  act((): void => {
    submission = findAction(renderer, '응급처치 가이드 시작').props.onPress();
  });

  return submission;
};

describe('FirstAidDetail 응급 평가 보존', () => {
  beforeEach((): void => {
    jest.mocked(useIsFocused).mockReturnValue(true);
  });

  afterEach((): void => {
    useEmergencyGuideStore.getState().resetGuide();
    jest.clearAllMocks();
  });

  it('가이드 단계가 없어도 최초 평가를 저장하고 결과 화면으로 이동한다', async (): Promise<void> => {
    jest.mocked(createEmergencyGuide).mockResolvedValue(PENDING_GUIDE);
    const navigation = createNavigation();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(
        React.createElement(FirstAidDetail, {
          navigation: navigation as never,
          route: { params: { mainId: 'bleeding' } } as never,
        }),
      );
    });

    await prepareLastQuestion(renderer);
    await act(async (): Promise<void> => findAction(renderer, '응급처치 가이드 시작').props.onPress());

    const submittedFormData = jest.mocked(createEmergencyGuide).mock.calls[0][0];
    const fields = submittedFormData as unknown as {
      entries: () => Iterable<readonly [string, unknown]>;
    };
    const questionnaire = Array.from(fields.entries()).find(
      ([fieldName]) => fieldName === 'questionnaire',
    )?.[1];
    expect(typeof questionnaire).toBe('string');
    const payload: unknown = JSON.parse(questionnaire as string);
    expect(payload).toEqual([
        { questionId: 'Q1_IMMEDIATE_DANGER', answerIds: ['UNCONSCIOUS'] },
        { questionId: 'Q2_VISIBLE_SYMPTOMS', answerIds: ['BLEEDING'] },
        { questionId: 'B1_BLEEDING_PATTERN', answerIds: ['BLEEDING_OOZING'] },
        { questionId: 'B2_BLEEDING_RISKS', answerIds: ['WOUND_DEEP'] },
        { questionId: 'C1_AGE_GROUP', answerIds: ['CHILD'] },
    ]);

    expect(useEmergencyGuideStore.getState().guide).toBe(PENDING_GUIDE);
    expect(retryEmergencyGuide).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('EmergencyGuide');

    await act(async (): Promise<void> => renderer.unmount());
  });

  it('뒤로 이동한 뒤 늦게 성공한 이전 요청은 취소하고 가이드를 시작하지 않는다', async (): Promise<void> => {
    const request = createDeferredGuideRequest();
    jest.mocked(createEmergencyGuide).mockReturnValue(request.promise);
    const navigation = createNavigation();
    const renderer = await renderFirstAidDetail(navigation);

    const submission = startSubmission(renderer);
    const signal = jest.mocked(createEmergencyGuide).mock.calls[0]?.[1];
    navigation.triggerBeforeRemove();
    expect(signal?.aborted).toBe(true);

    await act(async (): Promise<void> => request.resolve(PENDING_GUIDE));
    await submission;

    expect(useEmergencyGuideStore.getState().guide).toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('포커스를 잃은 뒤 늦게 실패한 이전 요청은 오류를 알리지 않는다', async (): Promise<void> => {
    const request = createDeferredGuideRequest();
    jest.mocked(createEmergencyGuide).mockReturnValue(request.promise);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((): void => {});
    const navigation = createNavigation();
    const renderer = await renderFirstAidDetail(navigation);

    const submission = startSubmission(renderer);
    jest.mocked(useIsFocused).mockReturnValue(false);
    await act(async (): Promise<void> => {
      renderer.update(
        React.createElement(FirstAidDetail, {
          navigation: navigation as never,
          route: { params: { mainId: 'bleeding' } } as never,
        }),
      );
    });
    expect(jest.mocked(createEmergencyGuide).mock.calls[0]?.[1]?.aborted).toBe(true);

    await act(async (): Promise<void> => request.reject(new Error('network failure')));
    await submission;

    expect(alertSpy).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('언마운트 시 진행 중인 요청을 취소한다', async (): Promise<void> => {
    const request = createDeferredGuideRequest();
    jest.mocked(createEmergencyGuide).mockReturnValue(request.promise);
    const navigation = createNavigation();
    const renderer = await renderFirstAidDetail(navigation);

    const submission = startSubmission(renderer);
    const signal = jest.mocked(createEmergencyGuide).mock.calls[0]?.[1];
    await act(async (): Promise<void> => renderer.unmount());
    expect(signal?.aborted).toBe(true);

    request.resolve(PENDING_GUIDE);
    await submission;
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('빠른 연속 제출은 하나의 요청만 전송한다', async (): Promise<void> => {
    const request = createDeferredGuideRequest();
    jest.mocked(createEmergencyGuide).mockReturnValue(request.promise);
    const navigation = createNavigation();
    const renderer = await renderFirstAidDetail(navigation);

    const firstSubmission = startSubmission(renderer);
    const secondSubmission = findAction(renderer, '응급처치 가이드 시작').props.onPress();
    expect(createEmergencyGuide).toHaveBeenCalledTimes(1);

    await act(async (): Promise<void> => request.resolve(PENDING_GUIDE));
    await Promise.all([firstSubmission, secondSubmission]);
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('이전 요청 종료는 새 요청의 로딩 상태를 해제하지 않는다', async (): Promise<void> => {
    const firstRequest = createDeferredGuideRequest();
    const secondRequest = createDeferredGuideRequest();
    jest
      .mocked(createEmergencyGuide)
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const navigation = createNavigation();
    const renderer = await renderFirstAidDetail(navigation);

    const firstSubmission = startSubmission(renderer);
    jest.mocked(useIsFocused).mockReturnValue(false);
    await act(async (): Promise<void> => {
      renderer.update(
        React.createElement(FirstAidDetail, {
          navigation: navigation as never,
          route: { params: { mainId: 'bleeding' } } as never,
        }),
      );
    });
    jest.mocked(useIsFocused).mockReturnValue(true);
    await act(async (): Promise<void> => {
      renderer.update(
        React.createElement(FirstAidDetail, {
          navigation: navigation as never,
          route: { params: { mainId: 'bleeding' } } as never,
        }),
      );
    });

    const secondSubmission = startSubmission(renderer);
    await act(async (): Promise<void> => firstRequest.resolve(PENDING_GUIDE));
    await firstSubmission;
    expect(findAction(renderer, '응급처치 가이드 시작').props.disabled).toBe(true);

    await act(async (): Promise<void> => secondRequest.resolve(PENDING_GUIDE));
    await secondSubmission;
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    await act(async (): Promise<void> => renderer.unmount());
  });
});
