import { FIRST_AID_CATEGORIES } from '@/constants/firstAidData';
import {
  getEmergencyQuestions,
  getNextEmergencyAnswerIds,
} from '@/constants/emergencyQuestionData';

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
          'rashAppearance',
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
        ['TEMP_UNDER_38', 'SEIZURE'],
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

  it('발열의 네 체온 답변은 서로 배타적이고 동반 증상은 유지한다', () => {
    const question = getEmergencyQuestions('fever')[2];
    const temperatureIds = [
      'TEMP_UNDER_38', 'TEMP_38_TO_38_9', 'TEMP_39_OR_HIGHER', 'TEMP_UNKNOWN',
    ];
    expect(question.options.slice(0, 4).map(option => option.id)).toEqual(temperatureIds);
    for (const previousId of temperatureIds) {
      for (const nextId of temperatureIds.filter(id => id !== previousId)) {
        expect(getNextEmergencyAnswerIds(question, [previousId, 'SEIZURE'], nextId))
          .toEqual(['SEIZURE', nextId]);
      }
    }
  });

  it('발진 모양은 다중 선택하되 알 수 없음은 단독 선택한다', () => {
    const question = getEmergencyQuestions('skinRash')[3];
    expect(question.options.map(option => option.id)).toEqual([
      'RASH_FLAT_SPOTS', 'RASH_BLISTERS', 'RASH_RED_WARM', 'RASH_RAISED_WHEALS', 'UNKNOWN',
    ]);
    expect(getNextEmergencyAnswerIds(question, ['RASH_FLAT_SPOTS'], 'RASH_BLISTERS'))
      .toEqual(['RASH_FLAT_SPOTS', 'RASH_BLISTERS']);
    expect(getNextEmergencyAnswerIds(question, ['RASH_FLAT_SPOTS'], 'UNKNOWN'))
      .toEqual(['UNKNOWN']);
    expect(getNextEmergencyAnswerIds(question, ['UNKNOWN'], 'RASH_RED_WARM'))
      .toEqual(['RASH_RED_WARM']);
  });

});
