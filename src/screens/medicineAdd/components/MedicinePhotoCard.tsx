import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { CameraRedIcon } from '@/assets';
import tailwindConfig from '../../../../tailwind.config';

interface MedicinePhotoCardProps {
  isUploading: boolean;
  onPress: () => Promise<void>;
}
export const MedicinePhotoCard = ({
  isUploading,
  onPress,
}: MedicinePhotoCardProps): React.JSX.Element => {
  const { colors } = tailwindConfig;
  return (
    <TouchableOpacity
      accessibilityLabel="약품 사진 촬영"
      accessibilityRole="button"
      activeOpacity={0.9}
      className="relative mt-8 items-center justify-center overflow-hidden rounded-xl border border-dashed border-memoRed bg-camera_bg px-5 py-[80px]"
      disabled={isUploading}
      onPress={onPress}>
      <View className="mb-5 items-center justify-center">
        <CameraRedIcon width={48} height={48} />
      </View>

      <Text className="text-base font-suitBold text-memoText">약품 사진을 먼저 촬영해 주세요</Text>

      <Text className="mt-5 text-center text-sm text-memoSubText">
        후면 카메라로 약품의 제품명이 잘 보이도록 촬영합니다.
      </Text>

      {isUploading ? (
        <View className="absolute inset-0 z-10 items-center justify-center bg-camera_bg/80">
          <ActivityIndicator size="large" color={colors.memoRed} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
};
export default MedicinePhotoCard;
