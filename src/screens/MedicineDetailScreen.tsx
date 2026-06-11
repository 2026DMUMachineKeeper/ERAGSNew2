import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineDetail'>;

const styles = StyleSheet.create({
  card: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});

export function MedicineDetailScreen({ navigation, route }: Props) {
  const { medicine } = route.params;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-3">
        <View className="h-10 flex-row items-center justify-between">
          <TouchableOpacity
            className="h-9 w-9 justify-center"
            onPress={() => navigation.goBack()}
          >
            <BackIcon width={24} height={24} />
          </TouchableOpacity>
          <Text className="flex-1 text-sm font-extrabold text-memoText">
            약품 상세
          </Text>
          <Text className="text-xl text-memoText">...</Text>
        </View>

        <View className="mt-5 rounded-2xl bg-white p-4" style={styles.card}>
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-red">
              <Text className="text-white text-lg">⌁</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-extrabold text-memoText">
                {medicine.name}
              </Text>
              <Text className="mt-1 text-sm font-extrabold text-red">
                {medicine.qty}개
              </Text>
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-red/10">
              <Text className="text-red">✎</Text>
            </View>
          </View>
        </View>

        <View className="mt-3 rounded-2xl bg-white p-4" style={styles.card}>
          <Text className="text-sm font-extrabold text-memoText">효능</Text>
          <Text className="mt-3 text-sm leading-6 text-memoSubText">
            {medicine.efficacy}
          </Text>
        </View>

        <View className="mt-3 rounded-2xl bg-white p-4" style={styles.card}>
          <Text className="text-sm font-extrabold text-memoText">사용 방법</Text>
          <Text className="mt-3 text-sm leading-6 text-memoSubText">
            {medicine.usage}
          </Text>
        </View>

        <View className="mt-3 rounded-2xl bg-white p-4" style={styles.card}>
          <Text className="text-sm font-extrabold text-memoText">추가 정보</Text>
          <View className="mt-3 flex-row">
            <Text className="w-20 text-sm font-bold text-memoText">등록일</Text>
            <Text className="flex-1 text-sm text-memoSubText">
              {medicine.expiry}
            </Text>
          </View>
          <View className="mt-3 flex-row">
            <Text className="w-20 text-sm font-bold text-memoText">메모</Text>
            <Text className="flex-1 text-sm text-memoSubText">
              {medicine.info}
            </Text>
          </View>
        </View>
      </View>

      <View className="bg-background px-4 pb-5">
        <View className="flex-row gap-3">
          <TouchableOpacity className="h-12 flex-1 items-center justify-center rounded-xl border border-memoLine bg-white">
            <Text className="font-bold text-memoText">수정</Text>
          </TouchableOpacity>
          <TouchableOpacity className="h-12 flex-1 items-center justify-center rounded-xl border border-red bg-white">
            <Text className="font-bold text-red">삭제</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
