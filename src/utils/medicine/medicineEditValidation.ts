import type { MedicineEditValues, MedicineEditValidationErrors } from '@/types';

export const EMPTY_MEDICINE_EDIT_ERRORS: MedicineEditValidationErrors = {
  name: null,
  efficacy: null,
  usage: null,
  quantity: null,
};
export const getMedicineEditValidationErrors = ({
  name,
  efficacy,
  usage,
  quantity,
}: MedicineEditValues): MedicineEditValidationErrors => {
  const trimmedQuantity = quantity.trim();
  const parsedQuantity = Number(trimmedQuantity);
  // 숫자 변환만 하면 빈 문자열이나 지수 표기도 허용되므로 입력 형식부터 검사합니다.
  const isQuantityInvalid = !/^\d+$/.test(trimmedQuantity) || !Number.isSafeInteger(parsedQuantity);

  return {
    name: name.trim() ? null : '약 이름을 입력해 주세요.',
    quantity: isQuantityInvalid ? '수량은 0 이상의 정수로 입력해 주세요.' : null,
    efficacy: efficacy.trim() ? null : '효능을 입력해 주세요.',
    usage: usage.trim() ? null : '사용 방법을 입력해 주세요.',
  };
};
