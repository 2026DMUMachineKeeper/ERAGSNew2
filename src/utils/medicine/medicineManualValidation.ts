import type { MedicineManualInputValues, MedicineManualInputErrors } from '@/types';

export const EMPTY_MEDICINE_MANUAL_INPUT_ERRORS: MedicineManualInputErrors = {
  name: null,
  efficacy: null,
  usage: null,
};
export const getMedicineManualInputErrors = ({
  name,
  efficacy,
  usage,
}: MedicineManualInputValues): MedicineManualInputErrors => ({
  name: name.trim() ? null : '약 이름을 입력해 주세요.',
  efficacy: efficacy.trim() ? null : '효능을 입력해 주세요.',
  usage: usage.trim() ? null : '사용 방법을 입력해 주세요.',
});
