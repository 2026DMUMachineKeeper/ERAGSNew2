import { getMedicineManualInputErrors } from '@/utils/medicine/medicineManualValidation';

describe('getMedicineManualInputErrors', () => {
  it('비어 있는 필수 입력의 오류를 각 필드에 반환한다', (): void => {
    expect(
      getMedicineManualInputErrors({
        name: '',
        efficacy: '해열 진통',
        usage: '',
        expireDate: '',
      }),
    ).toEqual({
      name: '약 이름을 입력해 주세요.',
      efficacy: null,
      usage: '사용 방법을 입력해 주세요.',
      expireDate: null,
    });
  });

  it('유통기한은 비워둘 수 있고 실제 날짜만 허용한다', (): void => {
    const values = { name: '붕대', efficacy: '보호', usage: '부착', expireDate: '' };
    expect(getMedicineManualInputErrors(values).expireDate).toBeNull();
    expect(getMedicineManualInputErrors({ ...values, expireDate: '2026-02-30' }).expireDate)
      .toBe('올바른 유통기한 날짜를 입력해 주세요.');
    expect(getMedicineManualInputErrors({ ...values, expireDate: '2026-10-15' }).expireDate)
      .toBeNull();
  });
});
