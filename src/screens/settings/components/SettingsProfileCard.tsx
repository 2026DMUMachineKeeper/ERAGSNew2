import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { SettingsProfileForm } from '@/types';

import ProfileField from './ProfileField';
import ProfileEditActions from './ProfileEditActions';
import SettingsIcon from './SettingsIcon';

import tailwindConfig from '../../../../tailwind.config';

const { colors } = tailwindConfig;
interface SettingsProfileCardProps {
  form: SettingsProfileForm;
  style: StyleProp<ViewStyle>;
}
export const SettingsProfileCard = ({
  form,
  style,
}: SettingsProfileCardProps): React.JSX.Element => {
  const {
    values,
    errors,
    isLoading,
    isEditing,
    isSaving,
    onEdit,
    onCancel,
    onSave,
    onNameChange,
    onGuardianPhoneChange,
  } = form;
  const isEditable = isEditing && !isLoading && !isSaving;
  const namePlaceholder = isLoading ? '불러오는 중...' : '이름이 등록되지 않았습니다';
  const guardianPhonePlaceholder = isLoading ? '불러오는 중...' : '등록된 번호가 없습니다';

  return (
    <View className="mt-6 overflow-hidden rounded-2xl bg-white px-5 py-5" style={style}>
      <View className="min-h-[40px] flex-row items-center">
        <View className="flex-row items-center">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-camera_bg">
            <SettingsIcon color={colors.red} name="user" size={20} />
          </View>
          <Text className="ml-3 text-body font-suitBold text-black">개인 정보</Text>
        </View>
      </View>

      <ProfileField
        config={{
          iconName: 'user',
          label: '이름',
          placeholder: namePlaceholder,
        }}
        editable={isEditable}
        errorMessage={errors.name ?? undefined}
        onChangeText={onNameChange}
        value={values.name}
      />
      <ProfileField
        config={{
          iconName: 'phone',
          keyboardType: 'phone-pad',
          label: '보호자 전화번호',
          placeholder: guardianPhonePlaceholder,
        }}
        editable={isEditable}
        errorMessage={errors.guardianPhone ?? undefined}
        onChangeText={onGuardianPhoneChange}
        value={values.guardianPhone}
      />

      <ProfileEditActions
        handlers={{
          onCancel,
          onEdit,
          onSave,
        }}
        isEditing={isEditing}
        isLoading={isLoading}
        isSaving={isSaving}
      />
    </View>
  );
};
export default SettingsProfileCard;
