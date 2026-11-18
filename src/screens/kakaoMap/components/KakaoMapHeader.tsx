import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { BackIcon } from '@/assets/icons';

export type MedicalFilter = 'all' | 'aed' | 'hospital';

type KakaoMapHeaderProps = {
  isStackScreen: boolean;
  selectedMedicalFilter: MedicalFilter;
  onBackPress: () => void;
  onFilterChange: (filter: MedicalFilter) => void;
  onOpenAedGuide: () => void;
};

const MEDICAL_FILTERS: ReadonlyArray<{
  key: MedicalFilter;
  label: string;
}> = [
  { key: 'all', label: '전체' },
  { key: 'aed', label: 'AED' },
  { key: 'hospital', label: '병원' },
];

export const KakaoMapHeader = ({
  isStackScreen,
  selectedMedicalFilter,
  onBackPress,
  onFilterChange,
  onOpenAedGuide,
}: KakaoMapHeaderProps): React.JSX.Element => (
  <View
    className="absolute left-0 right-0 top-0 z-10 px-4 pb-3 pt-2"
    pointerEvents="box-none"
  >
    <View className="flex-row items-center">
      {isStackScreen ? (
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
          hitSlop={10}
          onPress={onBackPress}
        >
          <BackIcon height={26} width={26} />
        </Pressable>
      ) : null}
      <View className={`flex-1 ${isStackScreen ? 'ml-2' : ''}`}>
        <View className="flex-row items-center">
          <View className="rounded-full bg-white px-3 py-2 shadow">
            <Text className="text-body font-suitBold text-black">
              주변 응급시설
            </Text>
          </View>
          <Pressable
            accessibilityLabel="AED 사용법 보기"
            accessibilityRole="button"
            className="ml-auto min-h-[44px] items-center justify-center rounded-full border border-memoLine bg-white px-3 shadow-sm active:bg-background"
            onPress={onOpenAedGuide}
          >
            <Text className="text-coment font-suitBold text-danger">
              AED 사용법
            </Text>
          </Pressable>
        </View>
      </View>
    </View>

    <View className="mt-2 flex-row">
      {MEDICAL_FILTERS.map(filter => {
        const isSelected = selectedMedicalFilter === filter.key;

        return (
          <Pressable
            key={filter.key}
            accessibilityLabel={`${filter.label} 장소만 보기`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className={`mr-2 min-h-[44px] flex-row items-center rounded-full border px-4 py-2 shadow-sm ${
              isSelected ? 'border-gray bg-gray' : 'border-authInputBorder bg-white'
            }`}
            onPress={() => onFilterChange(filter.key)}
          >
            <Text
              className={`text-[14px] font-suitBold ${
                isSelected ? 'text-white' : 'text-gray'
              }`}
            >
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

export default KakaoMapHeader;
