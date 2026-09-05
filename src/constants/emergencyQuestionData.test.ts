import { FIRST_AID_CATEGORIES } from './firstAidData';
import {
  getEmergencyQuestions,
  getNextEmergencyAnswerIds,
} from './emergencyQuestionData';

describe('getEmergencyQuestions', () => {
  it('기존 6개 유형마다 공통 질문과 유형별 질문을 조립한다', () => {
    const questionIdsByCategory = FIRST_AID_CATEGORIES.map(category => ({
      categoryId: category.id,
      questionIds: getEmergencyQuestions(category.id).map(
        question => question.id,
      ),
    }));

    expect(questionIdsByCategory).toEqual([
      {
        categoryId: 'bleeding',
        questionIds: [
          'immediateDanger',
          'visibleSymptoms',
          'bleedingPattern',
          'woundRisk',
          'ageGroup',
        ],
      },
      {
        categoryId: 'burn',
        questionIds: [
          'immediateDanger',
          'visibleSymptoms',
          'burnCause',
          'burnSkinState',
          'ageGroup',
        ],
      },
      {
        categoryId: 'fractureBruise',
        questionIds: [
          'immediateDanger',
          'visibleSymptoms',
          'injuryState',
          'distalCondition',
          'ageGroup',
        ],
      },
      {
        categoryId: 'fever',
        questionIds: [
          'immediateDanger',
          'visibleSymptoms',
          'feverSymptoms',
          'ageGroup',
        ],
      },
      {
        categoryId: 'skinRash',
        questionIds: [
          'immediateDanger',
          'visibleSymptoms',
          'allergyRisk',
          'ageGroup',
        ],
      },
      {
        categoryId: 'airwayObstruction',
        questionIds: [
          'immediateDanger',
          'visibleSymptoms',
          'speakOrCough',
          'ageGroup',
        ],
      },
    ]);
  });

  it('배타 답변과 상호 배타 그룹을 서버 규칙대로 선택한다', (): void => {
    const bleedingQuestions = getEmergencyQuestions('bleeding');
    const immediateDangerQuestion = bleedingQuestions[0];

    expect(
      getNextEmergencyAnswerIds(
        immediateDangerQuestion,
        ['MASSIVE_BLEEDING'],
        'NONE',
      ),
    ).toEqual(['NONE']);

    const feverQuestion = getEmergencyQuestions('fever').find(
      question => question.id === 'feverSymptoms',
    );

    expect(feverQuestion).toBeDefined();

    if (!feverQuestion) {
      throw new Error('발열 질문을 찾을 수 없습니다.');
    }

    expect(
      getNextEmergencyAnswerIds(
        feverQuestion,
        ['TEMP_UNDER_39', 'SEIZURE'],
        'TEMP_39_OR_HIGHER',
      ),
    ).toEqual(['SEIZURE', 'TEMP_39_OR_HIGHER']);
  });

  it('Q2에서 다른 증상과 알 수 없음을 다중 선택할 수 있다', (): void => {
    const visibleSymptomsQuestion = getEmergencyQuestions('bleeding').find(
      question => question.id === 'visibleSymptoms',
    );

    expect(visibleSymptomsQuestion?.isMultiple).toBe(true);
    expect(
      visibleSymptomsQuestion?.options.some(
        option => option.id === 'OTHER_UNKNOWN',
      ),
    ).toBe(true);
  });

});
