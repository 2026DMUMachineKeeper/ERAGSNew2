import { getMedicineManualInputErrors } from './MedicineManualInputScreen';

describe('getMedicineManualInputErrors', () => {
  it('비어 있는 필수 입력의 오류를 각 필드에 반환한다', (): void => {
    expect(
      getMedicineManualInputErrors({
        name: '',
        efficacy: '해열 진통',
        usage: '',
      }),
    ).toEqual({
      name: '약 이름을 입력해 주세요.',
      efficacy: null,
      usage: '사용 방법을 입력해 주세요.',
    });
  });
});
