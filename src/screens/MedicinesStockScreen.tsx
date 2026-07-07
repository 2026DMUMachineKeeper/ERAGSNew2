import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon, MedicinesIcon2 } from '../assets';

import {
  fetchMedicines,
  getVisibleMedicineErrorMessage,
  type MedicineItem,
} from '../services/medicineApi';

type MedicinesStockScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'MedicinesStock'
>;

export function MedicinesStockScreen({
  navigation,
}: MedicinesStockScreenProps) {
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadMedicines = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const fetchedMedicines = await fetchMedicines();

        if (!isActive) {
          return;
        }

        setMedicines(fetchedMedicines);
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error('[MedicinesStockScreen] 약품 조회 실패:', error);
        setLoadError(getVisibleMedicineErrorMessage(error, 'load'));
        setMedicines([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadMedicines();

    return () => {
      isActive = false;
    };
  }, []);

  const openAdd = () => {
    console.log('[MedicinesStockScreen] 약품 추가 버튼 눌림');
    setShowAddSheet(true);
  };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 pt-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <BackIcon width={24} height={24} />
          </TouchableOpacity>

          <Text className="ml-3 text-body text-white tracking-erags font-suitBold">
            약품 재고
          </Text>
        </View>
        <Text className="mt-2 text-lightGray text-body tracking-erags font-suitBold">
          {isLoading
            ? '약품 데이터를 불러오는 중...'
            : `총 ${medicines.length}개 품목`}
        </Text>

        {loadError ? (
          <Text className="mt-2 text-red text-sm font-suitBold">
            {loadError}
          </Text>
        ) : null}

        <View className="h-[1px] bg-lightGray rounded-full mt-2" />
      </View>

      {/* List */}
      <FlatList
        data={medicines}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 140 + insets.bottom,
        }}
        renderItem={({ item: m }) => (
          <View
            className="mb-4 bg-successSurface border-2 border-success rounded-3xl p-4 h-[100px]"
            style={{ overflow: 'hidden' }}
          >
            <View className="flex-row items-start justify-between h-full">
              {/* Left */}
              <View className="flex-row items-center flex-1">
                <MedicinesIcon2 width={40} height={40} />
                <View className="ml-3">
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    className="text-white text-body font-suitBold"
                    style={{ flexShrink: 1 }}
                  >
                    {m.name}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    className="text-lightGray text-sm mt-2"
                    style={{ flexShrink: 1 }}
                  >
                    {m.info}
                  </Text>
                </View>
              </View>

              {/* Right */}
              <View className="items-end">
                <Text className="text-white font-semibold">수량 {m.qty}</Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Floating Add Button */}
      {!showAddSheet && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24 + insets.bottom,
          }}
        >
          <TouchableOpacity
            onPress={openAdd}
            activeOpacity={0.8}
            className="h-[75px] bg-red rounded-3xl items-center justify-center"
            style={{
              elevation: 8,
            }}
          >
            <Text className="text-white text-title font-suitBold">
              약품 추가
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
