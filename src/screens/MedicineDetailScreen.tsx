import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMedicineDetail } from '@/hooks/useMedicineDetail';
import type { RootStackParamList } from '@/navigation/RootNavigator';

import { MedicineEditModal, MedicineInfoCards } from './medicineDetail/components';

import { BackIcon } from '@/assets';

export const MedicineDetailScreen = (
  props: NativeStackScreenProps<RootStackParamList, 'MedicineDetail'>,
): React.JSX.Element => {
  const { navigation } = props;
  const medicineDetail = useMedicineDetail(props);
  const { medicine, isLoading, loadError, isDeleting, handleOpenEdit, handleConfirmDelete } =
    medicineDetail;
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!medicine) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-5">
        <Text className="text-center text-body font-suitBold text-memoText">{loadError}</Text>
        <TouchableOpacity
          className="mt-5 h-12 items-center justify-center rounded-xl bg-red px-6"
          onPress={() => navigation.goBack()}>
          <Text className="text-body font-suitBold text-white">돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-3">
        <View className="h-10 flex-row items-center justify-between">
          <TouchableOpacity className="h-9 w-9 justify-center" onPress={() => navigation.goBack()}>
            <BackIcon width={24} height={24} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-sm font-suitBold text-memoText">약품 상세</Text>
          <View className="h-9 w-9" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <MedicineInfoCards medicine={medicine} />
        </ScrollView>
      </View>

      <View className="bg-background px-4 pb-5">
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="h-12 flex-1 items-center justify-center rounded-xl border border-memoLine bg-white"
            disabled={isDeleting}
            onPress={handleOpenEdit}>
            <Text className="font-suitBold text-memoText">수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="h-12 flex-1 items-center justify-center rounded-xl border border-red bg-white"
            disabled={isDeleting}
            onPress={handleConfirmDelete}>
            {isDeleting ? (
              <ActivityIndicator />
            ) : (
              <Text className="font-suitBold text-red">삭제</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <MedicineEditModal editor={medicineDetail.editor} />
    </SafeAreaView>
  );
};

export default MedicineDetailScreen;
