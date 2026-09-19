import { getMedicineEditValidationErrors } from '@/utils/medicine/medicineEditValidation';

jest.mock('@/assets', () => ({
  BackIcon: (): null => null,
}));

const VALID_MEDICINE_EDIT_VALUES = {
  name: '타이레놀',
  efficacy: '해열 진통',
  usage: '식후 복용',
  quantity: '2',
};

describe('getMedicineEditValidationErrors', () => {
  it('필수 입력과 0 이상의 정수 수량만 허용한다', (): void => {
    expect(
      getMedicineEditValidationErrors({
        ...VALID_MEDICINE_EDIT_VALUES,
        quantity: '',
      }).quantity,
    ).toBe('수량은 0 이상의 정수로 입력해 주세요.');
    expect(
      getMedicineEditValidationErrors({
        ...VALID_MEDICINE_EDIT_VALUES,
        quantity: '1.5',
      }).quantity,
    ).toBe('수량은 0 이상의 정수로 입력해 주세요.');
    expect(
      getMedicineEditValidationErrors({
        ...VALID_MEDICINE_EDIT_VALUES,
        efficacy: ' ',
      }).efficacy,
    ).toBe('효능을 입력해 주세요.');
    expect(
      getMedicineEditValidationErrors({
        ...VALID_MEDICINE_EDIT_VALUES,
        usage: ' ',
      }).usage,
    ).toBe('사용 방법을 입력해 주세요.');
    expect(getMedicineEditValidationErrors(VALID_MEDICINE_EDIT_VALUES)).toEqual({
      name: null,
      quantity: null,
      efficacy: null,
      usage: null,
    });
  });
});
