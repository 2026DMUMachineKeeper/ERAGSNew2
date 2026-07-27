import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import tailwindConfig from '../../../../tailwind.config';

import SettingsIcon from './SettingsIcon';

interface SettingsActionRowProps {
  iconName: 'lock' | 'logout';
  isLoading?: boolean;
  label: string;
  onPress: () => void;
  variant: 'default' | 'danger';
}

const { colors } = tailwindConfig;

export const SettingsActionRow = ({
  iconName,
  isLoading = false,
  label,
  onPress,
  variant,
}: SettingsActionRowProps): React.JSX.Element => {
  const isDanger = variant === 'danger';
  const iconColor = isDanger ? colors.red : colors.gray;
  const chevronColor = isDanger ? colors.red : colors.textDim;
  const iconContainerClassName = isDanger
    ? 'h-10 w-10 items-center justify-center rounded-xl bg-camera_bg'
    : 'h-10 w-10 items-center justify-center rounded-xl bg-background';
  const labelClassName = isDanger
    ? 'ml-3 flex-1 text-body font-suitBold text-red'
    : 'ml-3 flex-1 text-body font-suitBold text-black';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      className="min-h-[64px] flex-row items-center px-4 py-3"
      disabled={isLoading}
      onPress={onPress}
    >
      <View className={iconContainerClassName}>
        <SettingsIcon color={iconColor} name={iconName} />
      </View>
      <Text className={labelClassName}>{label}</Text>
      {isLoading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <SettingsIcon color={chevronColor} name="chevron" size={18} />
      )}
    </TouchableOpacity>
  );
};

export default SettingsActionRow;
