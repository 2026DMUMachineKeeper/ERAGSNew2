import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import type { MedicineFormFieldConfig } from '@/types';

interface MedicineFormFieldProps {
  config: MedicineFormFieldConfig;
  value: string;
  error: string | null;
  onChangeText: (nextText: string) => void;
  focusHandlers?: Pick<TextInputProps, 'onFocus' | 'onBlur'>;
}

export const MedicineFormField = ({
  config,
  value,
  error,
  onChangeText,
  focusHandlers,
}: MedicineFormFieldProps): React.JSX.Element => {
  // 글자 수가 있는 여러 줄 입력은 테두리를 바깥에 두어 글자 수도 함께 감쌉니다.
  const inputClassName = error ? config.errorInputClassName : config.inputClassName;
  const characterCount = config.hasCharacterCount ? (
    <Text className="self-end text-xs text-memoSubText">
      {value.length}/{config.inputProps?.maxLength}
    </Text>
  ) : null;
  const input = (
    <TextInput
      {...config.inputProps}
      {...focusHandlers}
      className={config.innerInputClassName ?? inputClassName}
      value={value}
      onChangeText={onChangeText}
    />
  );

  return (
    <View className={config.containerClassName}>
      <Text className={config.labelClassName}>
        {config.label}{' '}
        {config.isOptional ? (
          <Text className="text-memoSubText">(선택)</Text>
        ) : (
          <Text className="text-memoRed">*</Text>
        )}
      </Text>
      {config.innerInputClassName ? (
        <View className={inputClassName}>
          {input}
          {characterCount}
        </View>
      ) : (
        input
      )}
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-2 text-sm font-suitMedium text-red">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default MedicineFormField;
