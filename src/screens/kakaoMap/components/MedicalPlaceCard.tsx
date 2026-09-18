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
  onPress: () => void;
};

export const MedicalPlaceCard = ({
  isSelected,
  location,
  onPress,
}: MedicalPlaceCardProps): React.JSX.Element => (
  <View className="mb-2 rounded-2xl border border-memoLine bg-white px-3 py-3 shadow-sm">
    <Pressable
      accessibilityLabel={`${location.name} 위치 보기`}
      accessibilityRole="button"
      accessibilityState={{
        selected: isSelected,
      }}
      className="min-h-[68px] flex-row items-center"
      onPress={onPress}
    >
      <View className="relative h-14 w-14 items-center justify-center rounded-2xl bg-[#FDE9EC]">
        <Text className="text-[17px] font-suitBold text-[#AF3145]">
          {location.type === 'aed' ? 'AED' : '병원'}
        </Text>
        <View
          className={`absolute -right-1 -top-1 items-center justify-center rounded-full bg-[#BC344A] ${
            isSelected ? 'min-w-[22px] px-1 py-0.5' : 'h-3 w-3'
          }`}
        >
          {isSelected ? (
            <Text className="text-[8px] font-suitBold text-white">
              {location.typeLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="ml-3 flex-1">
        <Text
          className="text-body font-suitBold text-black"
          numberOfLines={isSelected ? 2 : 1}
        >
          {location.name}
        </Text>
        <Text className="mt-1 text-coment leading-5 text-gray" numberOfLines={2}>
          {location.address}
        </Text>
      </View>
      <View
        className={`ml-2 self-start ${
          isSelected ? 'pt-1' : 'rounded-full bg-[#FDE9EC] px-2 py-1'
        }`}
      >
        <Text
          className={`font-suitBold ${
            isSelected ? 'text-coment text-black' : 'text-[11px] text-[#AF3145]'
          }`}
        >
          {isSelected ? '' : `${location.typeLabel} · `}
          {formatDistance(location.distanceInMeters)}
        </Text>
      </View>
    </Pressable>
    {isSelected ? (
      <View className="mt-3 border-t border-memoLine pt-3">
        {location.type === 'hospital' && location.hospitalDetails ? (
          <>
            <Text className="mb-2 text-coment font-suitBold text-black">
              {location.hospitalDetails.isRealTimeAvailable
                ? '실시간 병상 정보'
                : '실시간 병상 정보 미제공'}
            </Text>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">가용 병상</Text>
              <Text className="flex-1 text-coment font-suitMedium text-black">
                {location.hospitalDetails.availableBeds ?? '정보 없음'}
              </Text>
            </View>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">수술실 병상</Text>
              <Text className="flex-1 text-coment font-suitMedium text-black">
                {location.hospitalDetails.operatingRoomBeds ?? '정보 없음'}
              </Text>
            </View>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">CT</Text>
              <Text className="flex-1 text-coment font-suitMedium text-black">
                {formatEquipmentAvailability(
                  location.hospitalDetails.isRealTimeAvailable,
                  location.hospitalDetails.ctAvailable,
                )}
              </Text>
            </View>
            <View className="flex-row py-1.5">
              <Text className="w-24 text-coment font-suitMedium text-gray">MRI</Text>
              <Text className="flex-1 text-coment font-suitMedium text-black">
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
            <Text className="flex-1 text-coment font-suitMedium leading-5 text-black">
              {location.detailPlaces.join(' · ')}
            </Text>
          </View>
        ) : null}
      </View>
    ) : null}
  </View>
);

export default MedicalPlaceCard;
