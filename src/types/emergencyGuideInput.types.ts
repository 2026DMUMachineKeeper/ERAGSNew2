import type { EmergencyGuidePhotoRequest } from './emergencyGuide.types';
import type { QuestionnaireState } from './compoundQuestionnaire.types';

// 같은 상황의 추가 문진에만 재사용하며 새 요청에서는 이전 환자 자료를 가져오지 않습니다.
export interface EmergencyGuideInput {
  media?: EmergencyGuidePhotoRequest;
  questionnaire?: QuestionnaireState;
  mainId?: string;
}
