import React from 'react';
import {
  Alert,
  Linking,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';

import type {
  EmergencyGuideResponse,
  EmergencyGuideInput,
  QuestionnaireState,
  QuestionnaireStep,
} from '@/types';
import {
  createCompoundGuide,
  createEmergencyGuide,
  retryEmergencyGuide,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import {
  SERVER_SYMPTOM_ID_BY_CATEGORY,
  toEmergencyGuideQuestionnaire,
} from '@/utils/emergencyQuestionnaire';
import { EmergencyQuestionOption } from '@/components/EmergencyGuide';

import { FirstAidDetail } from '@/screens/FirstAidDetail';
import { FIRST_AID_CATEGORIES, getEmergencyQuestions } from '@/constants';
import { getInjuryDetailSteps } from '@/utils/compoundQuestionnaire';
import { relevantQaFacts } from '@/utils/compoundQuestionFacts';
import { CompoundInjuryPanel } from '@/screens/firstAidDetail/components/CompoundInjuryPanel';
import { EmergencyQuestionHeader } from '@/screens/firstAidDetail/components';

jest.mock('@/assets', () => ({
  BackIcon: (): null => null,
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('@/services', () => ({
  createCompoundGuide: jest.fn(),
  createEmergencyGuide: jest.fn(),
  getEmergencyGuideErrorMessage: jest.fn(),
  retryEmergencyGuide: jest.fn(),
}));

describe('toEmergencyGuideQuestionnaire', () => {
  it('발진 모양을 R2로 변환하고 연령 질문 앞에 전송한다', () => {
    expect(
      toEmergencyGuideQuestionnaire({
        allergyRisk: ['LOCAL_RASH'],
        rashAppearance: ['RASH_FLAT_SPOTS', 'RASH_BLISTERS'],
        ageGroup: ['ADULT'],
      }),
    ).toEqual([
      { questionId: 'R1_ALLERGY_RISK', answerIds: ['LOCAL_RASH'] },
      {
        questionId: 'R2_RASH_APPEARANCE',
        answerIds: ['RASH_FLAT_SPOTS', 'RASH_BLISTERS'],
      },
      { questionId: 'C1_AGE_GROUP', answerIds: ['ADULT'] },
    ]);
  });

  it.each([
    'TEMP_UNDER_38',
    'TEMP_38_TO_38_9',
    'TEMP_39_OR_HIGHER',
    'TEMP_UNKNOWN',
  ])('발열 답변 %s를 변경 없이 전송한다', answerId => {
    expect(
      toEmergencyGuideQuestionnaire({ feverSymptoms: [answerId, 'SEIZURE'] }),
    ).toEqual([
      { questionId: 'T1_FEVER_NEUROLOGIC', answerIds: [answerId, 'SEIZURE'] },
    ]);
  });
  it('직접 선택한 출혈 답변을 Q2로 변환한다', (): void => {
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

  it('직접 선택한 화상 답변을 Q2로 변환한다', (): void => {
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
  popTo: jest.Mock;
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
    addListener: jest.fn(
      (_eventName: string, listener: () => void): jest.Mock => {
        handleBeforeRemove = listener;
        return jest.fn();
      },
    ),
    goBack: jest.fn(),
    popTo: jest.fn(),
    replace: jest.fn(),
    triggerBeforeRemove: (): void => handleBeforeRemove?.(),
  };
};

const createDeferredGuideRequest = (): DeferredGuideRequest => {
  let resolve!: (guide: EmergencyGuideResponse) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<EmergencyGuideResponse>(
    (resolvePromise, rejectPromise): void => {
      resolve = resolvePromise;
      reject = rejectPromise;
    },
  );

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

const prepareLastQuestion = async (
  renderer: ReactTestRenderer,
): Promise<void> => {
  const pressOption = async (): Promise<void> => {
    const option = renderer.root
      .findAllByType(TouchableOpacity)
      .find(button =>
        ['checkbox', 'radio'].includes(button.props.accessibilityRole),
      );

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
  await confirmUrgentNotice();
  await pressOption();
  await pressAction('다음 질문');
  await pressOption();
  await pressAction('다음 질문');
  await pressOption();
  await pressAction('다음 질문');
  await pressOption();
};

const renderFirstAidDetail = async (
  navigation: NavigationMock,
  continuation?: EmergencyGuideInput,
): Promise<ReactTestRenderer> => {
  let renderer!: ReactTestRenderer;

  await act(async (): Promise<void> => {
    renderer = create(
      React.createElement(FirstAidDetail, {
        navigation: navigation as never,
        route: { params: { mainId: 'bleeding', continuation } } as never,
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

const confirmUrgentNotice = async (): Promise<void> => {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  const continueButton = buttons?.find(button => button.text === '문진 계속');
  expect(continueButton).toBeDefined();
  await act(async () => continueButton?.onPress?.());
};

const getCurrentStep = (renderer: ReactTestRenderer): QuestionnaireStep => {
  const header = renderer.root.findByType(EmergencyQuestionHeader);
  return header.props.questions[header.props.currentQuestionIndex];
};
const selectCurrentAnswer = async (
  renderer: ReactTestRenderer,
  answerId: string,
): Promise<void> => {
  const step = getCurrentStep(renderer);
  const option = renderer.root
    .findAllByType(EmergencyQuestionOption)
    .find(
      item =>
        item.props.label ===
        step.options.find(answer => answer.id === answerId)?.label,
    );
  expect(option).toBeDefined();
  await act(async () => option?.props.onPress());
};
const answerMissingQa = async (renderer: ReactTestRenderer): Promise<void> => {
  const panel = renderer.root.findByType(CompoundInjuryPanel);
  const state = panel.props.state as QuestionnaireState;
  const injury = state.compoundDraft.injuries.find(
    item => item.injuryId === panel.props.injuryId,
  )!;
  if (injury.categoryCode === 'BURN') {
    const toggle = renderer.root.findByProps({ testID: 'burn-additional-toggle' });
    if (!toggle.props.accessibilityState.expanded) {
      await act(async () => toggle.props.onPress());
    }
  }
  if (injury.categoryCode === 'FRACTURE_BRUISE' && !injury.fractureSkinAnswer) {
    await act(async () =>
      renderer.root.findByProps({ testID: 'skin-UNKNOWN' }).props.onPress(),
    );
  }
  for (const question of relevantQaFacts(state.compoundDraft, injury)) {
    if (injury.qaFacts?.[question.id] !== undefined) continue;
    await act(async () =>
      renderer.root
        .findByProps({ testID: `fact-${question.id}-UNKNOWN` })
        .props.onPress(),
    );
  }
};
const finishAdditionalQuestions = async (
  renderer: ReactTestRenderer,
): Promise<void> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const missing = renderer.root.findAllByType(TouchableOpacity).find(node =>
      /^손상 \d+ 추가 질문 확인$/.test(node.props.accessibilityLabel ?? ''),
    );
    if (!missing) return;
    await act(async () => missing.props.onPress());
    while (getCurrentStep(renderer).kind === 'injury') {
      await answerMissingQa(renderer);
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(false);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
    }
  }
  throw new Error('추가 질문에 답한 후에도 누락 안내가 남아 있습니다.');
};
const fillCompoundToAge = async (
  renderer: ReactTestRenderer,
  shouldFinishAdditional = true,
  shouldAnswerBurnAdditional = true,
): Promise<void> => {
  const answers: Record<string, string> = {
    bleedingPattern: 'BLEEDING_OOZING',
    woundRisk: 'NONE',
    burnCause: 'BURN_SMALL_AREA',
    burnSkinState: 'BLISTER',
    injuryState: 'MINOR_BRUISE',
    distalCondition: 'NORMAL_DISTAL',
  };
  for (let count = 0; count < 100; count += 1) {
    const step = getCurrentStep(renderer);
    if (step.id === 'ageGroup') {
      await selectCurrentAnswer(renderer, 'ADULT');
      await act(async () =>
        renderer.root
          .findByProps({ testID: 'consciousness-CONSCIOUS' })
          .props.onPress(),
      );
      if (shouldFinishAdditional) await finishAdditionalQuestions(renderer);
      return;
    }
    if (step.kind === 'scope') {
      await selectCurrentAnswer(renderer, 'LOCALIZED');
      await act(async () =>
        renderer.root
          .findByType(TextInput)
          .props.onChangeText(
            step.injuryId === 'injury-0' ? '왼손 손바닥' : '오른쪽 정강이',
          ),
      );
    } else if (step.kind === 'description') {
      await act(async () =>
        renderer.root
          .findByType(TextInput)
          .props.onChangeText(
            step.injuryId === 'injury-0' ? '왼손 손바닥' : '오른쪽 정강이',
          ),
      );
    } else if (step.kind === 'relation') {
      await selectCurrentAnswer(renderer, 'DIFFERENT');
    } else if (step.kind === 'injury') {
      const panel = renderer.root.findByType(CompoundInjuryPanel);
      for (const detail of getInjuryDetailSteps(
        panel.props.state.compoundDraft,
        step.injuryId,
      )) {
        if (detail.kind !== 'detail') {
          continue;
        }
        const label = detail.options.find(
          o => o.id === answers[detail.answerQuestionId],
        )?.label;
        await act(async () =>
          renderer.root
            .findAllByType(EmergencyQuestionOption)
            .find(o => o.props.label === label)
            ?.props.onPress(),
        );
      }
      const isBurn = (panel.props.state as QuestionnaireState).compoundDraft.injuries
        .find(injury => injury.injuryId === step.injuryId)?.categoryCode === 'BURN';
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(!isBurn);
      if (!isBurn) {
        await act(async () => findAction(renderer, '다음 질문').props.onPress());
        expect(getCurrentStep(renderer).id).toBe(step.id);
      }
      if (!isBurn || shouldAnswerBurnAdditional) await answerMissingQa(renderer);
    }
    expect(findAction(renderer, '다음 질문').props.disabled).toBe(false);
    await act(async () => findAction(renderer, '다음 질문').props.onPress());
  }
  throw new Error('문진이 연령 질문까지 진행되지 않았습니다.');
};

describe('FirstAidDetail 응급 평가 보존', () => {
  it('화상은 기본 두 문항만으로 진행하고 접힌 선택 질문을 비워 제출할 수 있다', async () => {
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation());
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () => findAction(renderer, '이전 질문').props.onPress());
      }
      await selectCurrentAnswer(renderer, 'BURN');
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await fillCompoundToAge(renderer, false, false);
      await act(async () => findAction(renderer, '손상 1 추가 질문 확인').props.onPress());
      await answerMissingQa(renderer);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(getInjuryDetailSteps(
        (renderer.root.findByType(CompoundInjuryPanel).props.state as QuestionnaireState).compoundDraft,
        'injury-1',
      )).toHaveLength(2);
      const toggle = renderer.root.findByProps({ testID: 'burn-additional-toggle' });
      expect(toggle.props.accessibilityState.expanded).toBe(false);
      expect(JSON.stringify(renderer.toJSON())).toContain('추가 확인 16개 보기');
      expect(renderer.root.findAllByProps({ testID: 'fact-BURN_SKIN_INTACT-YES' })).toHaveLength(0);
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(false);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(findAction(renderer, '응급처치 가이드 시작').props.disabled).toBe(false);
      await act(async () => findAction(renderer, '응급처치 가이드 시작').props.onPress());
      const burn = jest.mocked(createCompoundGuide).mock.calls[0][0].injuries[1];
      expect(burn.questionnaire.find(q => q.questionId === 'U2_BURN_SKIN_STATE')?.answerIds).toEqual(['BLISTER']);
      expect(burn.observations).toEqual(['QA_FACT_V1:HELPER_AVAILABLE=UNKNOWN']);
    } finally {
      await act(async () => renderer.unmount());
    }
  });
  const originalMedia = {
    images: [
      { uri: 'file:///original-left.jpg', name: 'left.jpg', type: 'image/jpeg' },
      { uri: 'file:///original-right.jpg', name: 'right.jpg', type: 'image/jpeg' },
    ],
    audio: { uri: 'file:///original.m4a', name: 'original.m4a', type: 'audio/mp4' },
    text: '처음 입력한 왼팔 관찰 내용',
  };

  it('단일 추가 답변 뒤 복합 확인이 필요해져도 원본을 유지하고 두 손상을 선택할 수 있다', async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(React.createElement(FirstAidDetail, {
        navigation: createNavigation() as never,
        route: { params: {
          isCompoundIntake: true,
          continuation: { media: originalMedia, questionnaire: {
            questionAnswers: { immediateDanger: ['NONE'], visibleSymptoms: ['BLEEDING'] },
            compoundDraft: { injuries: [], relation: null },
          } },
        } } as never,
      }));
    });
    try {
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(getCurrentStep(renderer).id).toBe('visibleSymptoms');
      expect(renderer.root.findByProps({ testID: 'injury-count-2' }).props.isSelected).toBe(true);
      expect(renderer.root.findByProps({ testID: 'previous-image-0-injury-0' })).toBeDefined();
      expect(renderer.root.findByProps({ testID: 'category-1-BURN' })).toBeDefined();
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it('단일 추가 문진은 원본 사진·음성·설명과 새 답변을 함께 보내고 보관한다', async () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    jest.mocked(createEmergencyGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation(), { media: originalMedia });
    try {
      await act(async () => findAction(renderer, '응급처치 가이드 시작').props.onPress());
      expect(append.mock.calls.filter(([name]) => name === 'images').map(([, file]) => file))
        .toEqual(originalMedia.images);
      expect(append.mock.calls.filter(([name]) => name === 'audio').map(([, file]) => file))
        .toEqual([originalMedia.audio]);
      expect(append).toHaveBeenCalledWith('text', originalMedia.text);
      expect(append).toHaveBeenCalledWith('questionnaire', expect.stringContaining('B1_BLEEDING_PATTERN'));
      expect(useEmergencyGuideStore.getState().input?.media).toEqual(originalMedia);
      expect(useEmergencyGuideStore.getState().input?.questionnaire?.questionAnswers.ageGroup).toEqual(['CHILD']);
    } finally {
      append.mockRestore();
      await act(async () => renderer.unmount());
    }
  });

  it('복합 추가 문진은 원본의 손상 연결을 요구하고 사진·음성을 중복 없이 보낸다', async () => {
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation(), { media: originalMedia });
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () => findAction(renderer, '이전 질문').props.onPress());
      }
      await selectCurrentAnswer(renderer, 'BURN');
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(getCurrentStep(renderer).id).toBe('visibleSymptoms');
      for (const id of [
        'previous-image-0-injury-0', 'previous-image-1-injury-1',
        'previous-audio-injury-0', 'previous-text-injury-0',
      ]) {
        await act(async () => renderer.root.findByProps({ testID: id }).props.onPress());
      }
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(false);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await fillCompoundToAge(renderer);
      await act(async () => findAction(renderer, '응급처치 가이드 시작').props.onPress());
      const [request, , media] = jest.mocked(createCompoundGuide).mock.calls[0];
      expect(media).toEqual({ images: originalMedia.images, audio: originalMedia.audio });
      expect(request.evidenceBindings).toEqual({
        images: [
          { imageIndex: 0, injuryId: 'injury-0' },
          { imageIndex: 1, injuryId: 'injury-1' },
        ],
        audio: 'injury-0',
      });
      expect(request.injuries[0].observations).toContain(originalMedia.text);
      expect(request.injuries[1].observations).not.toContain(originalMedia.text);
      const saved = useEmergencyGuideStore.getState().input;
      expect(saved?.questionnaire?.compoundDraft.injuries[0].audio).toEqual(originalMedia.audio);
      expect(saved?.questionnaire?.compoundDraft.injuries[1].images).toEqual([originalMedia.images[1]]);
    } finally {
      await act(async () => renderer.unmount());
    }
  });
  it('복합 확인으로 진입하면 두 손상을 직접 확인한 뒤 원래 음성 없이 V2 요청을 보낸다', async () => {
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const navigation = createNavigation();
    let renderer!: ReactTestRenderer;
    try {
      await act(async () => {
        renderer = create(
          React.createElement(FirstAidDetail, {
            navigation: navigation as never,
            route: {
              params: { isCompoundIntake: true },
            } as never,
          }),
        );
      });
      await selectCurrentAnswer(renderer, 'NONE');
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(getCurrentStep(renderer).id).toBe('visibleSymptoms');
      expect(
        renderer.root.findAllByProps({ testID: 'injury-count-1' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findByProps({ testID: 'injury-count-2' }).props.isSelected,
      ).toBe(true);
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
      for (const index of [0, 1]) {
        expect(
          renderer.root.findByProps({ testID: `category-${index}-BLEEDING` })
            .props.isSelected,
        ).toBe(false);
        expect(
          renderer.root.findAllByProps({ testID: `confirm-injury-${index}` }),
        ).toHaveLength(0);
      }
      await act(async () =>
        renderer.root
          .findByProps({ testID: 'category-0-BLEEDING' })
          .props.onPress(),
      );
      await act(async () =>
        renderer.root.findByProps({ testID: 'category-1-BURN' }).props.onPress(),
      );
      for (const index of [0, 1]) {
        await act(async () =>
          renderer.root
            .findByProps({ testID: `confirm-injury-${index}` })
            .props.onPress(),
        );
      }
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await fillCompoundToAge(renderer);
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      expect(createEmergencyGuide).not.toHaveBeenCalled();
      const [request, , media] = jest.mocked(createCompoundGuide).mock.calls[0];
      expect(request.schemaVersion).toBe('2');
      expect(request.injuries.map((injury) => injury.categoryCode)).toEqual([
        'BLEEDING',
        'BURN',
      ]);
      expect(
        request.injuries.map((injury) => injury.location.description),
      ).toEqual(['왼손 손바닥', '오른쪽 정강이']);
      expect(
        request.injuries.every(
          (injury) => injury.confirmed && injury.observations.length > 0,
        ),
      ).toBe(true);
      expect(request.relations[0]).toMatchObject({
        relation: 'DIFFERENT',
        confirmed: true,
      });
      expect(
        request.injuries[0].questionnaire.some(
          (q) => q.questionId === 'B1_BLEEDING_PATTERN',
        ),
      ).toBe(true);
      expect(
        request.injuries[1].questionnaire.some(
          (q) => q.questionId === 'U2_BURN_SKIN_STATE',
        ),
      ).toBe(true);
      expect(request.evidenceBindings).toBeUndefined();
      expect(media).toEqual({ images: [], audio: undefined });
      expect(navigation.replace).toHaveBeenCalledWith('EmergencyGuide');
    } finally {
      await act(async () => renderer?.unmount());
    }
  });

  it('같은 출혈 두 개도 직접 확인 후 독립 문진을 보내고 QA 공통 답변만 공유한다', async () => {
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation());
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () =>
          findAction(renderer, '이전 질문').props.onPress(),
        );
      }
      await act(async () =>
        renderer.root.findByProps({ testID: 'injury-count-2' }).props.onPress(),
      );
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
      for (const index of [0, 1]) {
        await act(async () =>
          renderer.root
            .findByProps({ testID: `confirm-injury-${index}` })
            .props.onPress(),
        );
      }
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await fillCompoundToAge(renderer);
      await act(async () => findAction(renderer, '이전 질문').props.onPress());
      await act(async () => findAction(renderer, '이전 질문').props.onPress());
      await act(async () =>
        renderer.root
          .findByProps({ testID: 'fact-PRESSURE_REQUIRED-NO' })
          .props.onPress(),
      );
      await act(async () =>
        renderer.root
          .findByProps({ testID: 'fact-HELPER_AVAILABLE-YES' })
          .props.onPress(),
      );
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(
        renderer.root.findAllByProps({ testID: 'fact-HELPER_AVAILABLE-YES' }),
      ).toHaveLength(0);
      expect(renderer.root.findByProps({ testID: 'fact-PRESSURE_REQUIRED-UNKNOWN' }).props.isSelected).toBe(true);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      const request = jest.mocked(createCompoundGuide).mock.calls[0][0];
      expect(request.injuries.map(i => i.categoryCode)).toEqual([
        'BLEEDING',
        'BLEEDING',
      ]);
      expect(request.injuries[0].observations).toEqual(expect.arrayContaining([
        'QA_FACT_V1:PRESSURE_REQUIRED=NO',
        'QA_FACT_V1:HELPER_AVAILABLE=YES',
      ]));
      expect(request.injuries[1].observations).toEqual(expect.arrayContaining([
        'QA_FACT_V1:PRESSURE_REQUIRED=UNKNOWN',
        'QA_FACT_V1:HELPER_AVAILABLE=YES',
      ]));
      expect(request.injuries[0].injuryId).not.toBe(
        request.injuries[1].injuryId,
      );
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it('출혈+골절은 필수 추가 확인에 답한 뒤 손상별 문진을 전송한다', async () => {
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const navigation = createNavigation();
    const renderer = await renderFirstAidDetail(navigation);
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () =>
          findAction(renderer, '이전 질문').props.onPress(),
        );
      }
      await selectCurrentAnswer(renderer, 'FRACTURE_BRUISE');
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(getCurrentStep(renderer).kind).toBe('scope');
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
      await selectCurrentAnswer(renderer, 'LOCALIZED');
      expect(getCurrentStep(renderer).kind).toBe('scope');
      await act(async () =>
        renderer.root.findByType(TextInput).props.onChangeText('   '),
      );
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
      await fillCompoundToAge(renderer);
      expect(
        renderer.root.findByType(EmergencyQuestionHeader).props.questions,
      ).toHaveLength(8);
      expect(
        renderer.root
          .findAllByType(Text)
          .some(item => item.props.children === '답하지 않은 필수 질문'),
      ).toBe(false);
      await act(async () => findAction(renderer, '이전 질문').props.onPress());
      await act(async () => findAction(renderer, '이전 질문').props.onPress());
      expect(getCurrentStep(renderer)).toMatchObject({
        kind: 'injury',
        injuryId: 'injury-0',
      });
      expect(
        renderer.root
          .findAllByType(EmergencyQuestionOption)
          .some(
            item =>
              item.props.isSelected &&
              item.props.label === '피가 조금씩 배어 나옴',
          ),
      ).toBe(true);
      while (getCurrentStep(renderer).id !== 'ageGroup') {
        await act(async () =>
          findAction(renderer, '다음 질문').props.onPress(),
        );
      }
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      expect(createEmergencyGuide).not.toHaveBeenCalled();
      const request = jest.mocked(createCompoundGuide).mock.calls[0][0];
      expect(request.injuries[1].questionnaire).toEqual([
        { questionId: 'Q1_IMMEDIATE_DANGER', answerIds: ['UNCONSCIOUS'] },
        { questionId: 'F1_INJURY_STATE', answerIds: ['MINOR_BRUISE'] },
        { questionId: 'F2_DISTAL_STATE', answerIds: ['NORMAL_DISTAL'] },
        { questionId: 'C1_AGE_GROUP', answerIds: ['ADULT'] },
      ]);
      expect(request.injuries[0].observations).toContain('QA_FACT_V1:PRESSURE_REQUIRED=UNKNOWN');
      expect(request.injuries[1].observations).toContain('다친 부위 전체의 피부 상태를 확인하지 못했습니다.');
      expect(
        request.injuries[1].questionnaire.some(answer =>
          answer.questionId.startsWith('B'),
        ),
      ).toBe(false);
      expect(navigation.replace).toHaveBeenCalledWith('EmergencyGuide');
      expect(useEmergencyGuideStore.getState().mainLabel).toBe(
        '출혈 · 골절/타박상',
      );
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it('출혈+물집 화상의 추가 질문을 손상별로 표시하고 선택한 답변을 전송한다', async () => {
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation());
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () => findAction(renderer, '이전 질문').props.onPress());
      }
      await selectCurrentAnswer(renderer, 'BURN');
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await fillCompoundToAge(renderer, false);
      expect(findAction(renderer, '응급처치 가이드 시작').props.disabled).toBe(true);
      await act(async () => findAction(renderer, '응급처치 가이드 시작').props.onPress());
      expect(createCompoundGuide).not.toHaveBeenCalled();
      await act(async () =>
        findAction(renderer, '손상 1 추가 질문 확인').props.onPress(),
      );
      for (const answer of [
        'BLEEDING_CONTROLLED_WITH_PRESSURE-YES',
        'BLEEDING_DRESSING_ALREADY_APPLIED-NO',
        'BLEEDING_BANDAGE_AVAILABLE-UNKNOWN',
        'CONTINUOUS_PRESSURE_HELPER_READY-NO',
        'SYMPTOMS_WORSENING-NO',
      ]) {
        await act(async () =>
          {
            const choice = renderer.root.findByProps({ testID: `fact-${answer}` });
            if (!choice.props.isSelected) choice.props.onPress();
          },
        );
      }
      expect(
        renderer.root.findAllByProps({
          testID: 'fact-BURN_SKIN_INTACT-YES',
        }),
      ).toHaveLength(0);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      for (const answer of [
        'BURN_PROTECTIVE_CLOTH_SUITABLE-UNKNOWN',
        'BURN_SKIN_INTACT-NO',
        'BURN_MEDICAL_EVALUATION_PLANNED-NO',
      ]) {
        const toggle = renderer.root.findByProps({ testID: 'burn-additional-toggle' });
        if (!toggle.props.accessibilityState.expanded) {
          await act(async () => toggle.props.onPress());
        }
        await act(async () =>
          {
            const choice = renderer.root.findByProps({ testID: `fact-${answer}` });
            if (!choice.props.isSelected) choice.props.onPress();
          },
        );
      }
      for (const id of ['BURN_NONADHERENT_GAUZE_CONFIRMED', 'BURN_BLISTERS_INTACT', 'SAFE_IMMEDIATE_TRANSPORT_AVAILABLE']) {
        expect(
          renderer.root.findAllByProps({ testID: `fact-${id}-YES` }),
        ).toHaveLength(0);
      }
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      expect(createCompoundGuide).toHaveBeenCalledTimes(1);
      const request = jest.mocked(createCompoundGuide).mock.calls[0][0];
      expect(request.injuries[0].observations).toEqual(expect.arrayContaining([
        'QA_FACT_V1:BLEEDING_CONTROLLED_WITH_PRESSURE=YES',
        'QA_FACT_V1:BLEEDING_DRESSING_ALREADY_APPLIED=NO',
        'QA_FACT_V1:BLEEDING_BANDAGE_AVAILABLE=UNKNOWN',
        'QA_FACT_V1:CONTINUOUS_PRESSURE_HELPER_READY=NO',
        'QA_FACT_V1:SYMPTOMS_WORSENING=NO',
      ]));
      expect(request.injuries[1].observations).toEqual(expect.arrayContaining([
        'QA_FACT_V1:BURN_PROTECTIVE_CLOTH_SUITABLE=UNKNOWN',
        'QA_FACT_V1:BURN_SKIN_INTACT=NO',
        'QA_FACT_V1:BURN_MEDICAL_EVALUATION_PLANNED=NO',
      ]));
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it('골절 의심 피부 확인의 누락을 막고 모름 답변으로 문진을 계속할 수 있다', async () => {
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation());
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () =>
          findAction(renderer, '이전 질문').props.onPress(),
        );
      }
      await selectCurrentAnswer(renderer, 'FRACTURE_BRUISE');
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await fillCompoundToAge(renderer);
      await act(async () => findAction(renderer, '이전 질문').props.onPress());
      const deformity = renderer.root
        .findAllByType(EmergencyQuestionOption)
        .find(option => option.props.label === '모양이 평소와 다르게 변함');
      expect(deformity).toBeDefined();
      await act(async () => deformity!.props.onPress());
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
      expect(JSON.stringify(renderer.toJSON())).toContain('필수 확인');
      await act(async () =>
        renderer.root.findByProps({ testID: 'skin-UNKNOWN' }).props.onPress(),
      );
      await answerMissingQa(renderer);
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(false);
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await finishAdditionalQuestions(renderer);
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      expect(createCompoundGuide).toHaveBeenCalledTimes(1);
      const request = jest.mocked(createCompoundGuide).mock.calls[0][0];
      expect(request.injuries[1].observations).toContain(
        '다친 부위 전체의 피부 상태를 확인하지 못했습니다.',
      );
      expect(request.injuries[1].observations).not.toContain(
        '다친 부위 전체의 피부가 온전합니다.',
      );
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it('복합에서 뒤로 가 증상을 하나로 줄이면 기존 단일 질문과 단일 API로 전환한다', async () => {
    jest.mocked(createEmergencyGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation());
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () =>
          findAction(renderer, '이전 질문').props.onPress(),
        );
      }
      await selectCurrentAnswer(renderer, 'FRACTURE_BRUISE');
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      await fillCompoundToAge(renderer);
      do {
        await act(async () =>
          findAction(renderer, '이전 질문').props.onPress(),
        );
      } while (getCurrentStep(renderer).id !== 'visibleSymptoms');
      await act(async () =>
        renderer.root.findByProps({ testID: 'injury-count-1' }).props.onPress(),
      );
      expect(
        renderer.root.findByType(EmergencyQuestionHeader).props.questions,
      ).toEqual(getEmergencyQuestions('bleeding'));
      for (let index = 0; index < 3; index += 1) {
        await act(async () =>
          findAction(renderer, '다음 질문').props.onPress(),
        );
      }
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      expect(createCompoundGuide).not.toHaveBeenCalled();
      expect(createEmergencyGuide).toHaveBeenCalledTimes(1);
      const fields = jest.mocked(createEmergencyGuide).mock
        .calls[0][0] as unknown as {
        entries: () => Iterable<[string, string]>;
      };
      const questionnaire = JSON.parse(
        Array.from(fields.entries()).find(
          ([name]) => name === 'questionnaire',
        )![1],
      ) as { questionId: string }[];
      expect(questionnaire.map(answer => answer.questionId)).toEqual([
        'Q1_IMMEDIATE_DANGER',
        'Q2_VISIBLE_SYMPTOMS',
        'B1_BLEEDING_PATTERN',
        'B2_BLEEDING_RISKS',
        'C1_AGE_GROUP',
      ]);
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it.each([{ additional: ['OTHER_UNKNOWN'] }])(
    '지원하지 않는 복합 선택 $additional은 증상 질문에서 막는다',
    async ({ additional }) => {
      const renderer = await renderFirstAidDetail(createNavigation());
      try {
        for (let index = 0; index < 3; index += 1) {
          await act(async () =>
            findAction(renderer, '이전 질문').props.onPress(),
          );
        }
        for (const code of additional) {
          await selectCurrentAnswer(renderer, code);
        }
        await act(async () =>
          findAction(renderer, '다음 질문').props.onPress(),
        );
        expect(getCurrentStep(renderer).id).toBe('visibleSymptoms');
        expect(Alert.alert).toHaveBeenLastCalledWith(
          '복합 선택 확인',
          expect.any(String),
        );
        expect(createCompoundGuide).not.toHaveBeenCalled();
        expect(createEmergencyGuide).not.toHaveBeenCalled();
      } finally {
        await act(async () => renderer.unmount());
      }
    },
  );

  it('복합 문진의 두 상세·부위·관계를 전송하고 같은 입력 재시도만 ID를 유지한다', async () => {
    jest
      .mocked(createCompoundGuide)
      .mockRejectedValueOnce(new TypeError('network'))
      .mockRejectedValueOnce(new TypeError('network'));
    jest.mocked(createCompoundGuide).mockResolvedValue(PENDING_GUIDE);
    const renderer = await renderFirstAidDetail(createNavigation());
    try {
      for (let index = 0; index < 3; index += 1) {
        await act(async () =>
          findAction(renderer, '이전 질문').props.onPress(),
        );
      }
      await selectCurrentAnswer(renderer, 'BURN');
      await act(async () => findAction(renderer, '다음 질문').props.onPress());
      expect(getCurrentStep(renderer).kind).toBe('scope');
      await fillCompoundToAge(renderer);
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      expect(createEmergencyGuide).not.toHaveBeenCalled();
      const requests = jest
        .mocked(createCompoundGuide)
        .mock.calls.map(call => call[0]);
      expect(requests).toHaveLength(2);
      expect(requests[0].requestId).toBe(requests[1].requestId);
      expect(requests[0].injuries.map(injury => injury.categoryCode)).toEqual([
        'BLEEDING',
        'BURN',
      ]);
      expect(requests[0].relations[0]).toMatchObject({
        relation: 'DIFFERENT',
        confirmed: true,
      });
      expect(requests[0].injuries.map(injury => injury.location)).toEqual([
        { scope: 'LOCALIZED', description: '왼손 손바닥' },
        { scope: 'LOCALIZED', description: '오른쪽 정강이' },
      ]);
      expect(requests[0].injuries[1].questionnaire).toEqual(
        expect.arrayContaining([
          {
            questionId: 'U1_BURN_LOCATION_CAUSE',
            answerIds: ['BURN_SMALL_AREA'],
          },
          { questionId: 'U2_BURN_SKIN_STATE', answerIds: ['BLISTER'] },
        ]),
      );
      expect(
        requests[0].injuries.every(injury => injury.observations.length > 0),
      ).toBe(true);
      await selectCurrentAnswer(renderer, 'ELDERLY');
      await act(async () =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
      );
      const revised = jest.mocked(createCompoundGuide).mock.calls[2][0];
      expect(revised.requestId).not.toBe(requests[0].requestId);
      expect(revised.patientContext.ageGroup).toBe('ELDERLY');
      expect(
        revised.injuries.every(injury => injury.observations.length > 0),
      ).toBe(true);
    } finally {
      await act(async () => renderer.unmount());
    }
  });

  it('새 문진 제출은 기존 세션 재시도 없이 새 requestId로 생성한다', async () => {
    jest.mocked(createEmergencyGuide).mockResolvedValue(PENDING_GUIDE);
    const requestIds: string[] = [];
    const nowSpy = jest.spyOn(Date, 'now');
    try {
      for (const timestamp of [1000, 2000]) {
        nowSpy.mockReturnValue(timestamp);
        const renderer = await renderFirstAidDetail(createNavigation());
        await act(async () =>
          findAction(renderer, '응급처치 가이드 시작').props.onPress(),
        );
        const formData = jest
          .mocked(createEmergencyGuide)
          .mock.calls.at(-1)?.[0];
        const fields = formData as unknown as {
          entries: () => Iterable<readonly [string, unknown]>;
        };
        const request = Array.from(fields.entries()).find(
          ([name]) => name === 'request',
        )?.[1];
        const payload = JSON.parse(request as string) as { requestId: string };
        requestIds.push(payload.requestId);
        await act(async () => renderer.unmount());
      }
      expect(requestIds).toEqual(['manual-1000', 'manual-2000']);
      expect(retryEmergencyGuide).not.toHaveBeenCalled();
    } finally {
      nowSpy.mockRestore();
    }
  });
  beforeEach((): void => {
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach((): void => {
    useEmergencyGuideStore.getState().resetGuide();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each(FIRST_AID_CATEGORIES)(
    '$label 문진은 자동 선택 없이 시작하고 유형 답변도 해제할 수 있다',
    async category => {
      let renderer!: ReactTestRenderer;
      await act(async () => {
        renderer = create(
          React.createElement(FirstAidDetail, {
            navigation: createNavigation() as never,
            route: { params: { mainId: category.id } } as never,
          }),
        );
      });
      try {
        const questions = getEmergencyQuestions(category.id);
        for (const [index, question] of questions.entries()) {
          const options = renderer.root.findAllByType(EmergencyQuestionOption);
          expect(
            options.every(option => option.props.isSelected === false),
          ).toBe(true);
          const actionLabel =
            index === questions.length - 1
              ? '응급처치 가이드 시작'
              : '다음 질문';
          expect(findAction(renderer, actionLabel).props.disabled).toBe(true);
          const optionIndex =
            question.id === 'visibleSymptoms'
              ? question.options.findIndex(
                  option =>
                    option.id === SERVER_SYMPTOM_ID_BY_CATEGORY[category.id],
                )
              : 0;
          await act(async () => options[optionIndex].props.onPress());
          expect(findAction(renderer, actionLabel).props.disabled).toBe(false);
          if (question.id === 'visibleSymptoms') {
            await act(async () =>
              renderer.root
                .findAllByType(EmergencyQuestionOption)
                [optionIndex].props.onPress(),
            );
            expect(findAction(renderer, actionLabel).props.disabled).toBe(true);
            expect(
              renderer.root
                .findAllByType(EmergencyQuestionOption)
                .every(option => !option.props.isSelected),
            ).toBe(true);
            await act(async () =>
              renderer.root
                .findAllByType(EmergencyQuestionOption)
                [optionIndex].props.onPress(),
            );
          }
          if (index < questions.length - 1) {
            await act(async () =>
              findAction(renderer, actionLabel).props.onPress(),
            );
            if (question.id === 'immediateDanger') {
              await confirmUrgentNotice();
            }
          }
        }
        expect(createEmergencyGuide).not.toHaveBeenCalled();
      } finally {
        await act(async () => renderer.unmount());
      }
    },
  );

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
    await act(
      async (): Promise<void> =>
        findAction(renderer, '응급처치 가이드 시작').props.onPress(),
    );

    const submittedFormData =
      jest.mocked(createEmergencyGuide).mock.calls[0][0];
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
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((): void => {});
    const navigation = createNavigation();
    const renderer = await renderFirstAidDetail(navigation);
    alertSpy.mockClear();

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
    expect(jest.mocked(createEmergencyGuide).mock.calls[0]?.[1]?.aborted).toBe(
      true,
    );

    await act(
      async (): Promise<void> => request.reject(new Error('network failure')),
    );
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
    const secondSubmission = findAction(
      renderer,
      '응급처치 가이드 시작',
    ).props.onPress();
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
    expect(findAction(renderer, '응급처치 가이드 시작').props.disabled).toBe(
      true,
    );

    await act(async (): Promise<void> => secondRequest.resolve(PENDING_GUIDE));
    await secondSubmission;
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    await act(async (): Promise<void> => renderer.unmount());
  });
});

describe('FirstAidDetail 출혈 유형 확인과 119 우선 안내', () => {
  let renderer: ReactTestRenderer;
  let navigation: NavigationMock;

  const getQuestionId = (): string => {
    const { questions, currentQuestionIndex } = renderer.root.findByType(
      EmergencyQuestionHeader,
    ).props;
    return questions[currentQuestionIndex].id;
  };
  const selectAnswer = async (answerId: string): Promise<void> => {
    const questions = getEmergencyQuestions('bleeding');
    const question = questions.find(item => item.id === getQuestionId());
    const label = question?.options.find(item => item.id === answerId)?.label;
    const option = renderer.root
      .findAllByType(EmergencyQuestionOption)
      .find(item => item.props.label === label);
    expect(option).toBeDefined();
    await act(async () => option?.props.onPress());
  };
  const press = async (label: string): Promise<void> => {
    await act(async () => findAction(renderer, label).props.onPress());
  };
  const reachSymptoms = async (): Promise<void> => {
    await selectAnswer('NONE');
    await press('다음 질문');
  };
  const openMismatch = async (): Promise<void> => {
    await reachSymptoms();
    await selectAnswer('BURN');
    await press('다음 질문');
    expect(getQuestionId()).toBe('visibleSymptoms');
    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    expect(createEmergencyGuide).not.toHaveBeenCalled();
  };

  beforeEach(async () => {
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    navigation = createNavigation();
    await act(async () => {
      renderer = create(
        React.createElement(FirstAidDetail, {
          navigation: navigation as never,
          route: { params: { mainId: 'bleeding' } } as never,
        }),
      );
    });
  });
  afterEach(async () => {
    await act(async () => renderer.unmount());
    useEmergencyGuideStore.getState().resetGuide();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('사고 유형 다시 선택은 기존 유형 화면으로 돌아간다', async () => {
    await openMismatch();
    await press('사고 유형 다시 선택');
    expect(navigation.popTo).toHaveBeenCalledWith('FirstAid');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('증상 수정과 시스템 뒤로가기는 답변을 보존하고 증상 질문에 머문다', async () => {
    await openMismatch();
    await press('증상 수정');
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
    expect(getQuestionId()).toBe('visibleSymptoms');
    expect(
      renderer.root
        .findAllByType(EmergencyQuestionOption)
        .find(item => item.props.label === '데었거나 피부가 화상을 입음')?.props
        .isSelected,
    ).toBe(true);
    await press('다음 질문');
    await act(async () =>
      renderer.root.findByType(Modal).props.onRequestClose(),
    );
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
    expect(getQuestionId()).toBe('visibleSymptoms');
    await selectAnswer('BLEEDING');
    await press('다음 질문');
    expect(getQuestionId()).toBe('injury-0:scope');
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  });

  it('그대로 진행은 출혈 상세 문진을 이어가고 실제 답변을 그대로 전송한다', async () => {
    jest.mocked(createEmergencyGuide).mockResolvedValue(PENDING_GUIDE);
    await openMismatch();
    await press('그대로 진행');
    expect(getQuestionId()).toBe('bleedingPattern');
    await selectAnswer('BLEEDING_UNKNOWN');
    await press('다음 질문');
    await selectAnswer('NONE');
    await press('다음 질문');
    expect(getQuestionId()).toBe('ageGroup');
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
    await selectAnswer('ADULT');
    await press('응급처치 가이드 시작');
    const formData = jest.mocked(createEmergencyGuide).mock.calls[0][0];
    const fields = formData as unknown as {
      entries: () => Iterable<readonly [string, unknown]>;
    };
    const questionnaire = Array.from(fields.entries()).find(
      ([name]) => name === 'questionnaire',
    )?.[1];
    expect(JSON.parse(questionnaire as string)).toEqual([
      { questionId: 'Q1_IMMEDIATE_DANGER', answerIds: ['NONE'] },
      { questionId: 'Q2_VISIBLE_SYMPTOMS', answerIds: ['BURN'] },
      { questionId: 'B1_BLEEDING_PATTERN', answerIds: ['BLEEDING_UNKNOWN'] },
      { questionId: 'B2_BLEEDING_RISKS', answerIds: ['NONE'] },
      { questionId: 'C1_AGE_GROUP', answerIds: ['ADULT'] },
    ]);
  });

  it('출혈 증상이 있으면 확인 없이 진행하고 상처 위험 해당 없음도 허용한다', async () => {
    await reachSymptoms();
    await selectAnswer('BLEEDING');
    await press('다음 질문');
    expect(getQuestionId()).toBe('bleedingPattern');
    await selectAnswer('BLEEDING_OOZING');
    await press('다음 질문');
    await selectAnswer('NONE');
    await press('다음 질문');
    expect(getQuestionId()).toBe('ageGroup');
    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it.each(['UNCONSCIOUS', 'BREATHING_DIFFICULTY'])(
    '위험 신호 %s는 119 안내가 우선이며 불일치 모달을 건너뛴다',
    async answerId => {
      const openUrlSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      await selectAnswer(answerId);
      await press('다음 질문');
      expect(Alert.alert).toHaveBeenLastCalledWith(
        '119 신고가 필요해요',
        expect.any(String),
        expect.any(Array),
        { cancelable: false },
      );
      expect(getQuestionId()).toBe('immediateDanger');
      expect(openUrlSpy).not.toHaveBeenCalled();
      const callButton = jest
        .mocked(Alert.alert)
        .mock.calls.at(-1)?.[2]
        ?.find(button => button.text === '119 전화');
      await act(async () => callButton?.onPress?.());
      expect(openUrlSpy).toHaveBeenCalledWith('tel:119');
      await confirmUrgentNotice();
      await selectAnswer('BURN');
      await press('다음 질문');
      expect(getQuestionId()).toBe('bleedingPattern');
      expect(renderer.root.findByType(Modal).props.visible).toBe(false);
      expect(createEmergencyGuide).not.toHaveBeenCalled();
    },
  );
});

describe.each(FIRST_AID_CATEGORIES)(
  'FirstAidDetail $label 유형 확인',
  category => {
    let renderer: ReactTestRenderer;
    let navigation: NavigationMock;
    const questions = getEmergencyQuestions(category.id);
    const symptomId = SERVER_SYMPTOM_ID_BY_CATEGORY[category.id];
    const mismatchedSymptomId =
      category.id === 'bleeding' ? 'BURN' : 'BLEEDING';
    const mismatchedSymptomLabel = questions[1].options.find(
      option => option.id === mismatchedSymptomId,
    )?.label;
    const getQuestionIndex = (): number =>
      renderer.root.findByType(EmergencyQuestionHeader).props
        .currentQuestionIndex;
    const selectAnswer = async (answerId: string): Promise<void> => {
      const label = questions[getQuestionIndex()].options.find(
        option => option.id === answerId,
      )?.label;
      const option = renderer.root
        .findAllByType(EmergencyQuestionOption)
        .find(item => item.props.label === label);
      expect(option).toBeDefined();
      await act(async () => option?.props.onPress());
    };
    const press = async (label: string): Promise<void> => {
      await act(async () => findAction(renderer, label).props.onPress());
    };
    beforeEach(async () => {
      jest.mocked(useIsFocused).mockReturnValue(true);
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      navigation = createNavigation();
      await act(async () => {
        renderer = create(
          React.createElement(FirstAidDetail, {
            navigation: navigation as never,
            route: { params: { mainId: category.id } } as never,
          }),
        );
      });
    });
    afterEach(async () => {
      await act(async () => renderer.unmount());
      useEmergencyGuideStore.getState().resetGuide();
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('불일치 안내에 유형명을 표시하고 수정·유형 재선택·그대로 진행을 제공한다', async () => {
      await selectAnswer('NONE');
      await press('다음 질문');
      await selectAnswer(mismatchedSymptomId);
      await press('다음 질문');
      expect(getQuestionIndex()).toBe(1);
      expect(renderer.root.findByType(Modal).props.visible).toBe(true);
      const texts = renderer.root
        .findAllByType(Text)
        .map(item => item.props.children)
        .flat();
      expect(texts).toContain(category.label);
      await press('증상 수정');
      expect(getQuestionIndex()).toBe(1);
      expect(renderer.root.findByType(Modal).props.visible).toBe(false);
      expect(
        renderer.root
          .findAllByType(EmergencyQuestionOption)
          .find(item => item.props.label === mismatchedSymptomLabel)?.props
          .isSelected,
      ).toBe(true);
      await press('다음 질문');
      await press('사고 유형 다시 선택');
      expect(navigation.popTo).toHaveBeenCalledWith('FirstAid');
      await press('다음 질문');
      await press('그대로 진행');
      expect(getQuestionIndex()).toBe(2);
      expect(renderer.root.findByType(Modal).props.visible).toBe(false);
      expect(
        renderer.root
          .findAllByType(EmergencyQuestionOption)
          .every(item => !item.props.isSelected),
      ).toBe(true);
      expect(createEmergencyGuide).not.toHaveBeenCalled();
    });

    it('유형에 해당하는 증상이 포함되면 여러 증상을 선택해도 바로 상세 문진으로 진행한다', async () => {
      await selectAnswer('NONE');
      await press('다음 질문');
      await selectAnswer(mismatchedSymptomId);
      await selectAnswer(symptomId);
      await press('다음 질문');
      expect(getQuestionIndex()).toBe(2);
      expect(renderer.root.findByType(Modal).props.visible).toBe(false);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('위험 신호의 119 안내가 우선이며 증상 불일치 확인을 생략한다', async () => {
      await selectAnswer('BREATHING_DIFFICULTY');
      await press('다음 질문');
      expect(Alert.alert).toHaveBeenLastCalledWith(
        '119 신고가 필요해요',
        expect.any(String),
        expect.any(Array),
        { cancelable: false },
      );
      expect(getQuestionIndex()).toBe(0);
      await confirmUrgentNotice();
      await selectAnswer(mismatchedSymptomId);
      await press('다음 질문');
      expect(getQuestionIndex()).toBe(2);
      expect(renderer.root.findByType(Modal).props.visible).toBe(false);
      expect(createEmergencyGuide).not.toHaveBeenCalled();
    });

    it('증상 수정 후 답변을 바꾸지 않고 다음을 누르면 다시 확인한다', async () => {
      await selectAnswer('NONE');
      await press('다음 질문');
      await selectAnswer(mismatchedSymptomId);
      await press('다음 질문');
      await press('증상 수정');
      await press('다음 질문');
      expect(getQuestionIndex()).toBe(1);
      expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    });

    it('그대로 진행 확인은 뒤로가도 유지하고 증상을 바꾸면 다시 확인한다', async () => {
      await selectAnswer('NONE');
      await press('다음 질문');
      await selectAnswer(mismatchedSymptomId);
      await press('다음 질문');
      await press('그대로 진행');
      await press('이전 질문');
      await press('다음 질문');
      expect(getQuestionIndex()).toBe(2);
      expect(renderer.root.findByType(Modal).props.visible).toBe(false);
      await press('이전 질문');
      await selectAnswer(mismatchedSymptomId);
      await selectAnswer('OTHER_UNKNOWN');
      await press('다음 질문');
      expect(getQuestionIndex()).toBe(1);
      expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    });

    it('미선택은 다음을 막고 잘 모르겠음은 불일치 확인을 표시한다', async () => {
      await selectAnswer('NONE');
      await press('다음 질문');
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(true);
      await press('다음 질문');
      expect(getQuestionIndex()).toBe(1);
      expect(renderer.root.findByType(Modal).props.visible).toBe(false);
      await selectAnswer('OTHER_UNKNOWN');
      expect(findAction(renderer, '다음 질문').props.disabled).toBe(false);
      await press('다음 질문');
      expect(renderer.root.findByType(Modal).props.visible).toBe(true);
      expect(createEmergencyGuide).not.toHaveBeenCalled();
    });
  },
);
