import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface EmergencyQuestionOptionProps {
  label: string;
  isSelected: boolean;
  isMultiple: boolean;
  onPress: () => void;
}

export const EmergencyQuestionOption = ({
  label,
  isSelected,
  isMultiple,
  onPress,
}: EmergencyQuestionOptionProps): React.JSX.Element => {
  const containerClassName = isSelected
    ? 'mb-3 min-h-14 flex-row items-center rounded-xl border border-red bg-camera_bg px-4 py-3'
    : 'mb-3 min-h-14 flex-row items-center rounded-xl border border-memoLine bg-white px-4 py-3';

  return (
    <TouchableOpacity
      accessibilityRole={isMultiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: isSelected }}
      activeOpacity={0.8}
      className={containerClassName}
      onPress={onPress}
    >
      <View
        className={`h-6 w-6 items-center justify-center border ${
          isMultiple ? 'rounded-md' : 'rounded-full'
        } ${
          isSelected ? 'border-red bg-red' : 'border-authInputBorder bg-white'
        }`}
      >
        {isSelected ? (
          <Text className="text-coment font-suitBold text-white">✓</Text>
        ) : null}
      </View>
      <Text className="ml-3 flex-1 text-body font-suitMedium text-black">
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default EmergencyQuestionOption;
