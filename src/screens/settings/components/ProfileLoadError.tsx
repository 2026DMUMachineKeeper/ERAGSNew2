import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ProfileLoadErrorProps {
  message: string;
  onRetry: () => void;
}
export const ProfileLoadError = ({
  message,
  onRetry,
}: ProfileLoadErrorProps): React.JSX.Element => (
  <View className="mt-4 rounded-xl border border-red bg-camera_bg px-4 py-3">
    <Text className="text-coment font-suitBold text-red">정보를 불러오지 못했습니다</Text>
    <Text className="mt-1 text-sm font-suitMedium leading-5 text-textDim">{message}</Text>
    <TouchableOpacity
      accessibilityLabel="마이페이지 다시 시도"
      accessibilityRole="button"
      className="mt-3 self-start rounded-xl border border-red px-4 py-2"
      onPress={onRetry}>
      <Text className="text-sm font-suitBold text-red">다시 시도</Text>
    </TouchableOpacity>
  </View>
);
export default ProfileLoadError;
