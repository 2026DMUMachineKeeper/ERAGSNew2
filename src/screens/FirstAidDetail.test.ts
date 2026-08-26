import { toEmergencyGuideQuestionnaire } from './FirstAidDetail';

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
