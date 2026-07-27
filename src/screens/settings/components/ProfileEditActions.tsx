import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import tailwindConfig from '../../../../tailwind.config';

import SettingsIcon from './SettingsIcon';

interface ProfileEditActionHandlers {
  onCancel: () => void;
  onEdit: () => void;
  onSave: () => void;
}

interface ProfileEditActionsProps {
  handlers: ProfileEditActionHandlers;
  isEditing: boolean;
  isLoading: boolean;
  isSaving: boolean;
}

const { colors } = tailwindConfig;

export const ProfileEditActions = ({
  handlers,
  isEditing,
  isLoading,
  isSaving,
}: ProfileEditActionsProps): React.JSX.Element => {
  const editButtonClassName = isLoading
    ? 'h-12 flex-1 flex-row items-center justify-center rounded-xl bg-disabled'
    : 'h-12 flex-1 flex-row items-center justify-center rounded-xl bg-red';

  if (!isEditing) {
    return (
      <View className="mt-5 flex-row">
        <TouchableOpacity
          accessibilityLabel="개인 정보 수정"
          activeOpacity={0.85}
          className={editButtonClassName}
          disabled={isLoading}
          onPress={handlers.onEdit}
        >
          <SettingsIcon color={colors.white} name="edit" size={18} />
          <Text className="ml-2 text-body font-suitBold text-white">수정</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mt-5 flex-row">
      <TouchableOpacity
        activeOpacity={0.85}
        className="mr-3 h-12 flex-1 flex-row items-center justify-center rounded-xl border border-authInputBorder bg-white"
        disabled={isSaving}
        onPress={handlers.onCancel}
      >
        <SettingsIcon color={colors.textDim} name="close" size={18} />
        <Text className="ml-2 text-body font-suitBold text-textDim">취소</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.85}
        className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-red"
        disabled={isSaving}
        onPress={handlers.onSave}
      >
        {isSaving ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            <SettingsIcon color={colors.white} name="check" size={18} />
            <Text className="ml-2 text-body font-suitBold text-white">
              저장
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ProfileEditActions;
