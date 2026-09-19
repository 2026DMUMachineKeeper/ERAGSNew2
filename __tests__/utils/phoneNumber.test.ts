import { normalizeOptionalKoreanPhoneNumber } from '@/utils/phoneNumber';

describe('normalizeOptionalKoreanPhoneNumber', () => {
  it('선택 입력을 허용하고 유효한 국내 전화번호만 표준 형식으로 정리한다', (): void => {
    expect(normalizeOptionalKoreanPhoneNumber('  ')).toBe('');
    expect(normalizeOptionalKoreanPhoneNumber('01012345678')).toBe(
      '010-1234-5678',
    );
    expect(normalizeOptionalKoreanPhoneNumber('02-123-4567')).toBe(
      '02-123-4567',
    );
    expect(normalizeOptionalKoreanPhoneNumber('010 1234 5678')).toBeNull();
    expect(normalizeOptionalKoreanPhoneNumber('1234')).toBeNull();
  });
});
