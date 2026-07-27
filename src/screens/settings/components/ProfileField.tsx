import React from 'react';
import { Text, TextInput, type KeyboardTypeOptions, View } from 'react-native';

import tailwindConfig from '../../../../tailwind.config';

import SettingsIcon, { type SettingsIconName } from './SettingsIcon';

interface ProfileFieldConfig {
  iconName: Extract<SettingsIconName, 'phone' | 'user'>;
  keyboardType?: KeyboardTypeOptions;
  label: string;
  placeholder: string;
}

interface ProfileFieldProps {
  config: ProfileFieldConfig;
  editable: boolean;
  onChangeText: (value: string) => void;
  value: string;
}

const { colors } = tailwindConfig;

export const ProfileField = ({
  config,
  editable,
  onChangeText,
  value,
}: ProfileFieldProps): React.JSX.Element => {
  const containerClassName = editable
    ? 'mt-3 min-h-[68px] flex-row items-center rounded-xl border border-red bg-white px-4'
    : 'mt-3 min-h-[68px] flex-row items-center rounded-xl border border-memoLine bg-white px-4';

  return (
    <View className={containerClassName}>
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-camera_bg">
        <SettingsIcon color={colors.red} name={config.iconName} size={20} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-coment font-suitBold text-textDim">
          {config.label}
        </Text>
        <TextInput
          className="mt-1 h-8 p-0 text-body font-suitBold text-black"
          editable={editable}
          keyboardType={config.keyboardType ?? 'default'}
          onChangeText={onChangeText}
          placeholder={config.placeholder}
          placeholderTextColor={colors.placeholder}
          selectTextOnFocus={editable}
          value={value}
        />
      </View>
    </View>
  );
};

export default ProfileField;
