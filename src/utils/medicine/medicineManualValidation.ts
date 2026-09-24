import type { MedicineManualInputValues, MedicineManualInputErrors } from '@/types';
import { getMedicineExpireDateError } from './medicineExpireDateValidation';

export const EMPTY_MEDICINE_MANUAL_INPUT_ERRORS: MedicineManualInputErrors = {
  name: null,
  efficacy: null,
  usage: null,
  expireDate: null,
};
export const getMedicineManualInputErrors = ({
  name,
  efficacy,
  usage,
  expireDate,
}: MedicineManualInputValues): MedicineManualInputErrors => ({
  name: name.trim() ? null : '약 이름을 입력해 주세요.',
  efficacy: efficacy.trim() ? null : '효능을 입력해 주세요.',
  usage: usage.trim() ? null : '사용 방법을 입력해 주세요.',
  expireDate: getMedicineExpireDateError(expireDate),
});
