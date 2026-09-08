import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { MedicineManualFormState } from '@/types';
import { MedicineFormField } from '@/components/medicine';
import { MEDICINE_MANUAL_FIELDS } from '@/constants/medicineFormData';

import MedicineQuantityInput from './MedicineQuantityInput';

interface MedicineManualFormProps {
  form: MedicineManualFormState;
}

export const MedicineManualForm = ({ form }: MedicineManualFormProps): React.JSX.Element => {
  const { values, quantity, errors, onChange, onIncreaseQuantity, onDecreaseQuantity } = form;
  const scrollViewRef = React.useRef<ScrollView>(null);
  const usageSectionOffsetRef = React.useRef(0);
  const [isUsageInputFocused, setIsUsageInputFocused] = React.useState(false);
  const scrollToUsageInput = React.useCallback((): void => {
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(usageSectionOffsetRef.current - 16, 0),
    });
  }, []);

  React.useEffect(() => {
    if (!isUsageInputFocused) {
      return undefined;
    }

    // 입력란 아래 여백이 반영된 다음 위치를 계산해야 키보드 위로 올라옵니다.
    const animationFrame = requestAnimationFrame(scrollToUsageInput);

    return (): void => cancelAnimationFrame(animationFrame);
  }, [isUsageInputFocused, scrollToUsageInput]);

  return (
    <ScrollView
      ref={scrollViewRef}
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        if (isUsageInputFocused) {
          scrollToUsageInput();
        }
      }}
      showsVerticalScrollIndicator={false}>
      <View className={`px-5 pt-5 ${isUsageInputFocused ? 'pb-72' : 'pb-8'}`}>
        <Text className="text-base font-suitBold text-memoText">기본 정보</Text>

        <MedicineFormField
          config={MEDICINE_MANUAL_FIELDS.name}
          value={values.name}
          error={errors.name}
          onChangeText={(nextText: string): void => onChange('name', nextText)}
        />

        <View className="mt-4">
          <Text className="mb-2 text-sm font-suitBold text-memoText">
            수량 <Text className="text-memoRed">*</Text>
          </Text>
          <MedicineQuantityInput
            quantity={quantity}
            onIncrease={onIncreaseQuantity}
            onDecrease={onDecreaseQuantity}
          />
        </View>

        <MedicineFormField
          config={MEDICINE_MANUAL_FIELDS.efficacy}
          value={values.efficacy}
          error={errors.efficacy}
          onChangeText={(nextText: string): void => onChange('efficacy', nextText)}
        />

        <View
          className="mt-5"
          onLayout={event => {
            usageSectionOffsetRef.current = event.nativeEvent.layout.y;
          }}>
          <MedicineFormField
            config={MEDICINE_MANUAL_FIELDS.usage}
            value={values.usage}
            error={errors.usage}
            onChangeText={(nextText: string): void => onChange('usage', nextText)}
            focusHandlers={{
              onBlur: (): void => setIsUsageInputFocused(false),
              onFocus: (): void => {
                setIsUsageInputFocused(true);
                scrollToUsageInput();
              },
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default MedicineManualForm;
