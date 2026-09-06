import React from 'react';
import { TouchableOpacity } from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { createEmergencyGuide, retryEmergencyGuide } from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideResponse } from '@/types';

import {
  FirstAidDetail,
  toEmergencyGuideQuestionnaire,
} from './FirstAidDetail';

jest.mock('@/assets', () => ({
  BackIcon: (): null => null,
}));

jest.mock('@/services', () => ({
  createEmergencyGuide: jest.fn(),
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

describe('FirstAidDetail 응급 평가 보존', () => {
  afterEach((): void => {
    useEmergencyGuideStore.getState().resetGuide();
    jest.clearAllMocks();
  });

  it('가이드 단계가 없어도 최초 평가를 저장하고 결과 화면으로 이동한다', async (): Promise<void> => {
    jest.mocked(createEmergencyGuide).mockResolvedValue(PENDING_GUIDE);
    const navigation = {
      goBack: jest.fn(),
      replace: jest.fn(),
    };
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(
        React.createElement(FirstAidDetail, {
          navigation: navigation as never,
          route: { params: { mainId: 'bleeding' } } as never,
        }),
      );
    });

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
      const action = renderer.root
        .findAll(node => node.props.accessibilityLabel === label)
        .find(node => typeof node.props.onPress === 'function');

      if (!action) {
        throw new Error(`${label} 버튼을 찾을 수 없습니다.`);
      }

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
    await pressAction('응급처치 가이드 시작');

    expect(useEmergencyGuideStore.getState().guide).toBe(PENDING_GUIDE);
    expect(retryEmergencyGuide).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('EmergencyGuide');

    await act(async (): Promise<void> => renderer.unmount());
  });
});
