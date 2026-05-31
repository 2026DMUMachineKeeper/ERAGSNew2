import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon, MedicinesIcon2 } from '../assets';
import AddMedicineBottomSheet from '../components/AddMedicineBottomSheet';
import BarcodeScanModal from '../components/BarcodeScanModal';
import { fetchMedicines, type MedicineItem } from '../services/medicineApi';

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

  const [showScanModal, setShowScanModal] = useState(false);
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
        setLoadError('약품 데이터를 불러오지 못했습니다.');
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

  const handleScannedBarcode = (barcode: string) => {
    console.log('[MedicinesStockScreen] 바코드 스캔됨:', barcode);

    setMedicines(current => [
      {
        id: `barcode-${Date.now()}`,
        name: '스캔된 약품',
        info: `바코드 ${barcode}`,
        qty: 1,
        expiry: '미지정',
        threshold: 0,
        barcode,
        usage: '정보 없음',
        efficacy: '정보 없음',
      },
      ...current,
    ]);
  };

  const openAdd = () => {
    console.log('[MedicinesStockScreen] 약품 추가 버튼 눌림');
    setShowAddSheet(true);
  };

  const closeAddSheet = () => {
    console.log('[MedicinesStockScreen] 약품 추가 시트 닫기');
    setShowAddSheet(false);
  };

  const openScanModal = () => {
    console.log('[MedicinesStockScreen] 스캔 모달 열기');
    setShowAddSheet(false);
    setShowScanModal(true);
  };

  const closeScanModal = () => {
    console.log('[MedicinesStockScreen] 바코드 스캔 모달 닫기');
    setShowScanModal(false);
  };
  return (
    <SafeAreaView className="flex-1 bg-background">
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
          {isLoading ? '약품 데이터를 불러오는 중...' : `총 ${medicines.length}개 품목`}
        </Text>

        {loadError ? (
          <Text className="mt-2 text-red text-sm font-suitBold">{loadError}</Text>
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
          paddingBottom: 140,
        }}
        renderItem={({ item: m }) => (
          <View className="mb-4 bg-[#1C2F2C] border-2 border-[#2ECC71] rounded-3xl p-4 h-[100px]">
            <View className="flex-row items-start justify-between h-full">
              {/* Left */}
              <View className="flex-row items-center">
                <MedicinesIcon2 width={40} height={40} />

                <View className="ml-3">
                  <Text className="text-white text-body font-suitBold">
                    {m.name}
                  </Text>

                  <Text className="text-lightGray text-sm mt-2">{m.info}</Text>
                </View>
              </View>

              {/* Right */}
              <View className="items-end">
                <Text className="text-white font-semibold">수량 {m.qty}</Text>

                <Text className="text-lightGray text-xs mt-2">
                  유통기한 {m.expiry}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* Floating Add Button */}
      {!showScanModal && !showAddSheet && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
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

      <AddMedicineBottomSheet
        visible={showAddSheet}
        onClose={closeAddSheet}
        medicines={medicines}
        onOpenScanModal={openScanModal}
      />

      <BarcodeScanModal
        visible={showScanModal}
        onClose={closeScanModal}
        onScanned={handleScannedBarcode}
      />
    </SafeAreaView>
  );
}
