import type { MedicineFormFieldConfig } from '@/types';

import tailwindConfig from '../../tailwind.config';

export const MEDICINE_EDIT_FIELDS = {
  name: {
    label: '약 이름',
    containerClassName: 'mt-4',
    labelClassName: 'text-sm font-suitBold text-memoText',
    inputClassName: 'mt-2 h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText',
    errorInputClassName: 'mt-2 h-12 rounded-xl border border-red px-4 text-sm text-memoText',
    inputProps: {
      placeholder: '약 이름',
    },
  },
  quantity: {
    label: '수량',
    containerClassName: 'mt-4',
    labelClassName: 'text-sm font-suitBold text-memoText',
    inputClassName: 'mt-2 h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText',
    errorInputClassName: 'mt-2 h-12 rounded-xl border border-red px-4 text-sm text-memoText',
    inputProps: {
      placeholder: '수량',
      keyboardType: 'number-pad',
    },
  },
  expireDate: {
    label: '유통기한',
    containerClassName: 'mt-4',
    labelClassName: 'text-sm font-suitBold text-memoText',
    inputClassName: 'mt-2 h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText',
    errorInputClassName: 'mt-2 h-12 rounded-xl border border-red px-4 text-sm text-memoText',
    inputProps: {
      placeholder: 'YYYY-MM-DD',
      keyboardType: 'numbers-and-punctuation',
      maxLength: 10,
    },
    isOptional: true,
  },
  efficacy: {
    label: '효능',
    containerClassName: 'mt-4',
    labelClassName: 'text-sm font-suitBold text-memoText',
    inputClassName:
      'mt-2 min-h-[76px] rounded-xl border border-memoLine px-4 py-3 text-sm text-memoText',
    errorInputClassName:
      'mt-2 min-h-[76px] rounded-xl border border-red px-4 py-3 text-sm text-memoText',
    inputProps: {
      placeholder: '효능',
      multiline: true,
      textAlignVertical: 'top',
    },
  },
  usage: {
    label: '사용 방법',
    containerClassName: 'mt-4',
    labelClassName: 'text-sm font-suitBold text-memoText',
    inputClassName:
      'mt-2 min-h-[76px] rounded-xl border border-memoLine px-4 py-3 text-sm text-memoText',
    errorInputClassName:
      'mt-2 min-h-[76px] rounded-xl border border-red px-4 py-3 text-sm text-memoText',
    inputProps: {
      placeholder: '사용 방법',
      multiline: true,
      textAlignVertical: 'top',
    },
  },
} satisfies Record<string, MedicineFormFieldConfig>;

export const MEDICINE_MANUAL_FIELDS = {
  name: {
    label: '약 이름',
    containerClassName: 'mt-4',
    labelClassName: 'mb-2 text-sm font-suitBold text-memoText',
    inputClassName: 'h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText',
    errorInputClassName: 'h-12 rounded-xl border border-red px-4 text-sm text-memoText',
    inputProps: {
      placeholder: '예: 타이레놀',
      placeholderTextColor: tailwindConfig.colors.memoSubText,
    },
  },
  expireDate: {
    label: '유통기한',
    containerClassName: 'mt-4',
    labelClassName: 'mb-2 text-sm font-suitBold text-memoText',
    inputClassName: 'h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText',
    errorInputClassName: 'h-12 rounded-xl border border-red px-4 text-sm text-memoText',
    inputProps: {
      placeholder: 'YYYY-MM-DD',
      placeholderTextColor: tailwindConfig.colors.memoSubText,
      keyboardType: 'numbers-and-punctuation',
      maxLength: 10,
    },
    isOptional: true,
  },
  efficacy: {
    label: '효능',
    containerClassName: 'mt-5',
    labelClassName: 'mb-2 text-sm font-suitBold text-memoText',
    inputClassName: 'min-h-[92px] rounded-xl border border-memoLine px-4 py-3',
    errorInputClassName: 'min-h-[92px] rounded-xl border border-red px-4 py-3',
    inputProps: {
      placeholder: '예: 해열진통제',
      placeholderTextColor: tailwindConfig.colors.memoSubText,
      multiline: true,
      textAlignVertical: 'top',
      maxLength: 200,
    },
    innerInputClassName: 'min-h-[56px] text-sm text-memoText',
    hasCharacterCount: true,
  },
  usage: {
    label: '사용 방법',
    containerClassName: '',
    labelClassName: 'mb-2 text-sm font-suitBold text-memoText',
    inputClassName: 'min-h-[104px] rounded-xl border border-memoLine px-4 py-3',
    errorInputClassName: 'min-h-[104px] rounded-xl border border-red px-4 py-3',
    inputProps: {
      placeholder: '예: 식후 30분',
      placeholderTextColor: tailwindConfig.colors.memoSubText,
      multiline: true,
      textAlignVertical: 'top',
      maxLength: 300,
    },
    innerInputClassName: 'min-h-[68px] text-sm text-memoText',
    hasCharacterCount: true,
  },
} satisfies Record<string, MedicineFormFieldConfig>;
