export const formatMedicineExpireDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

export const getMedicineExpireDateError = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return '유통기한을 YYYY-MM-DD 형식으로 입력해 주세요.';
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return year >= 1000 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? null
    : '올바른 유통기한 날짜를 입력해 주세요.';
};
