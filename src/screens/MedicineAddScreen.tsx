import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useMedicinePhoto } from '@/hooks/useMedicinePhoto';

import { MedicinePhotoCard } from './medicineAdd/components';

export const MedicineAddScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'MedicineAdd'>): React.JSX.Element => {
  const { isUploading, handleClose, handleOpenCamera } = useMedicinePhoto(navigation);

  return (
    <SafeAreaView className="flex-1 bg-memoCard" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-3">
        <View className="h-10 flex-row items-center justify-between">
          <TouchableOpacity className="h-9 w-9 items-center justify-center" onPress={handleClose}>
            <Text className="text-2xl text-memoText">x</Text>
          </TouchableOpacity>
        </View>

        <MedicinePhotoCard isUploading={isUploading} onPress={handleOpenCamera} />

        <View className="mt-5 flex-row items-center">
          <View className="h-[1px] flex-1 bg-memoLine" />
          <Text className="mx-4 text-sm font-suitBold text-memoSubText">또는</Text>
          <View className="h-[1px] flex-1 bg-memoLine" />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          className="mt-5 min-h-[88px] flex-row items-center rounded-xl border border-blue-200 bg-blue-50 px-4"
          onPress={() => navigation.dispatch(StackActions.replace('MedicineManualInput'))}>
          <Text className="mr-3 text-2xl text-memoBlue">+</Text>

          <View className="flex-1">
            <Text className="text-base font-suitBold text-memoText">직접 수동 입력하기</Text>

            <Text className="mt-1 text-xs leading-5 text-memoSubText">
              사진 말고 직접 입력할 수 있어요.
            </Text>
          </View>

          <Text className="text-2xl text-memoBlue">{'>'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
export default MedicineAddScreen;
