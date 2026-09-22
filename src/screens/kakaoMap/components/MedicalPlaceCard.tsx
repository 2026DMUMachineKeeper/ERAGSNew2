import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type MedicalLocationListItem = {
  id: string;
  type: 'hospital' | 'aed';
  typeLabel: string;
  name: string;
  address: string;
  distanceInMeters: number;
  detailPlaces?: readonly string[];
  phone?: string;
  hospitalDetails?: {
    isRealTimeAvailable: boolean;
    availableBeds: number | null;
    operatingRoomBeds: number | null;
    ctAvailable: boolean;
    mriAvailable: boolean;
  };
};

const formatDistance = (distanceInMeters: number): string => {
  if (distanceInMeters < 1000) {
    return `${Math.max(10, Math.round(distanceInMeters / 10) * 10)}m`;
  }

  return `${(distanceInMeters / 1000).toFixed(1)}km`;
};

const formatEquipmentAvailability = (
  isRealTimeAvailable: boolean,
  isAvailable: boolean,
): string =>
  isRealTimeAvailable ? (isAvailable ? '가능' : '불가') : '정보 없음';

type MedicalPlaceCardProps = {
  isSelected: boolean;
  location: MedicalLocationListItem;
  onDirectionsPress: () => void;
  onPress: () => void;
};

export const MedicalPlaceCard = ({
  isSelected,
  location,
  onDirectionsPress,
  onPress,
}: MedicalPlaceCardProps): React.JSX.Element => (
  <View className={`mb-3 rounded-2xl border bg-white p-4 ${
    isSelected
      ? location.type === 'hospital' ? 'border-red' : 'border-green-700'
      : 'border-memoLine'
  }`}>
    <Pressable
      accessibilityLabel={`${location.name} 위치 보기`}
      accessibilityRole="button"
      accessibilityState={{
        selected: isSelected,
      }}
      className="min-h-[68px] flex-row items-center"
      onPress={onPress}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-xl ${location.type === 'aed' ? 'bg-green-700' : 'border border-red/20 bg-white'}`}>
        <Text className={`text-[14px] font-suitBold ${location.type === 'aed' ? 'text-white' : 'text-danger'}`}>
          {location.type === 'aed' ? 'AED' : '병원'}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text
          className="text-body font-suitBold text-memoText"
          numberOfLines={isSelected ? 2 : 1}
        >
          {location.name}
        </Text>
        <Text className="mt-1 text-coment leading-5 text-gray" numberOfLines={2}>
          {location.address}
        </Text>
      </View>
      <View className="ml-2 self-start pt-1">
        <Text className="text-[14px] font-suitBold text-memoText">
          {formatDistance(location.distanceInMeters)}
        </Text>
        {isSelected ? (
          <Text className={`mt-1 text-coment font-suitBold ${location.type === 'aed' ? 'text-green-700' : 'text-danger'}`}>
            선택됨
          </Text>
        ) : null}
      </View>
    </Pressable>
    {isSelected ? (
      <View className="mt-3 border-t border-memoLine pt-3">
        {location.type === 'hospital' && location.hospitalDetails ? (
          <>
            <Text className="mb-2 text-coment font-suitBold text-memoText">
              {location.hospitalDetails.isRealTimeAvailable
                ? '실시간 병상 정보'
                : '실시간 병상 정보 미제공'}
            </Text>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">가용 병상</Text>
              <Text className="flex-1 text-coment font-suitMedium text-memoText">
                {location.hospitalDetails.availableBeds ?? '정보 없음'}
              </Text>
            </View>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">수술실 병상</Text>
              <Text className="flex-1 text-coment font-suitMedium text-memoText">
                {location.hospitalDetails.operatingRoomBeds ?? '정보 없음'}
              </Text>
            </View>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">CT</Text>
              <Text className="flex-1 text-coment font-suitMedium text-memoText">
                {formatEquipmentAvailability(
                  location.hospitalDetails.isRealTimeAvailable,
                  location.hospitalDetails.ctAvailable,
                )}
              </Text>
            </View>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">MRI</Text>
              <Text className="flex-1 text-coment font-suitMedium text-memoText">
                {formatEquipmentAvailability(
                  location.hospitalDetails.isRealTimeAvailable,
                  location.hospitalDetails.mriAvailable,
                )}
              </Text>
            </View>
          </>
        ) : null}
        {location.detailPlaces?.length ? (
          <View className="flex-row py-1.5">
            <Text className="w-24 text-coment font-suitMedium text-gray">
              설치 위치
            </Text>
            <Text className="flex-1 text-coment font-suitMedium leading-5 text-memoText">
              {location.detailPlaces.join(' · ')}
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={`${location.name} 길찾기`}
          accessibilityRole="button"
          className="mt-3 min-h-[48px] items-center justify-center rounded-xl bg-[#FEE500] py-3 active:bg-[#F2D900]"
          onPress={onDirectionsPress}
        >
          <Text className="text-[14px] font-suitBold text-memoText">
            카카오맵 길찾기 ›
          </Text>
        </Pressable>
      </View>
    ) : null}
  </View>
);

export default MedicalPlaceCard;
