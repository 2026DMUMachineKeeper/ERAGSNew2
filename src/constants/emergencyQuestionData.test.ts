import { FIRST_AID_CATEGORIES } from './firstAidData';
import { getEmergencyQuestions } from './emergencyQuestionData';

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
});
