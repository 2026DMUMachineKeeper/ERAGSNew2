const ALLOWED_PHONE_NUMBER_PATTERN = /^[0-9-]+$/;
const SEOUL_PHONE_NUMBER_PATTERN = /^02\d{7,8}$/;
const OTHER_PHONE_NUMBER_PATTERN = /^0\d{9,10}$/;

export const INVALID_KOREAN_PHONE_NUMBER_MESSAGE =
  '전화번호 형식을 확인해 주세요. 예: 010-1234-5678';

export const normalizeOptionalKoreanPhoneNumber = (
  phoneNumber: string,
): string | null => {
  const trimmedPhoneNumber = phoneNumber.trim();

  if (trimmedPhoneNumber.length === 0) {
    return '';
  }

  if (!ALLOWED_PHONE_NUMBER_PATTERN.test(trimmedPhoneNumber)) {
    return null;
  }

  const phoneNumberDigits = trimmedPhoneNumber.replaceAll('-', '');
  const isSeoulPhoneNumber = phoneNumberDigits.startsWith('02');
  const isValidPhoneNumber = isSeoulPhoneNumber
    ? SEOUL_PHONE_NUMBER_PATTERN.test(phoneNumberDigits)
    : OTHER_PHONE_NUMBER_PATTERN.test(phoneNumberDigits);

  if (!isValidPhoneNumber) {
    return null;
  }

  const areaCodeLength = isSeoulPhoneNumber ? 2 : 3;
  const areaCode = phoneNumberDigits.slice(0, areaCodeLength);
  const exchangeNumber = phoneNumberDigits.slice(areaCodeLength, -4);
  const subscriberNumber = phoneNumberDigits.slice(-4);

  return `${areaCode}-${exchangeNumber}-${subscriberNumber}`;
};
