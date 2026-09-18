import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import aedMapMarker from '@/assets/icons/markers/aed-map-marker.png';
import hospitalMapMarker from '@/assets/icons/markers/hospital-map-marker.png';

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
  <View
    className={`mb-2 overflow-hidden rounded-xl border bg-white shadow ${
      isSelected ? 'border-red' : 'border-transparent'
    }`}
  >
    <Pressable
      accessibilityLabel={`${location.name} 위치 보기`}
      accessibilityRole="button"
      accessibilityState={{
        selected: isSelected,
      }}
      className="min-h-[64px] flex-row items-center px-3 py-2"
      onPress={onPress}
    >
      <Image
        accessibilityLabel={`${location.typeLabel} 마커`}
        className="h-9 w-9"
        resizeMode="contain"
        source={location.type === 'aed' ? aedMapMarker : hospitalMapMarker}
      />
      <View className="ml-2 flex-1">
        <Text className="text-body font-suitBold text-black" numberOfLines={1}>
          {location.name}
        </Text>
        <Text className="mt-1 text-coment text-textDim" numberOfLines={2}>
          {location.address}
        </Text>
      </View>
      <View className="ml-2 rounded-full bg-background px-2 py-1">
        <Text className="text-[11px] font-suitBold text-gray">
          {location.typeLabel} · {formatDistance(location.distanceInMeters)}
        </Text>
      </View>
    </Pressable>
    {isSelected ? (
      <View className="border-t border-memoLine px-3 pb-4 pt-3">
        {location.type === 'hospital' && location.hospitalDetails ? (
          <>
            <Text className="text-coment font-suitBold text-black">
              {location.hospitalDetails.isRealTimeAvailable
                ? '실시간 병상 정보'
                : '실시간 병상 정보 미제공'}
            </Text>
            <Text className="mt-2 text-coment leading-5 text-textDim">
              가용 병상: {location.hospitalDetails.availableBeds ?? '정보 없음'}
              {' · '}수술실 병상:{' '}
              {location.hospitalDetails.operatingRoomBeds ?? '정보 없음'}
            </Text>
            <Text className="mt-1 text-coment leading-5 text-textDim">
              CT:{' '}
              {formatEquipmentAvailability(
                location.hospitalDetails.isRealTimeAvailable,
                location.hospitalDetails.ctAvailable,
              )}
              {' · '}MRI:{' '}
              {formatEquipmentAvailability(
                location.hospitalDetails.isRealTimeAvailable,
                location.hospitalDetails.mriAvailable,
              )}
            </Text>
          </>
        ) : null}
        {location.detailPlaces?.length ? (
          <>
            <Text className="text-coment font-suitBold text-black">
              설치 위치
            </Text>
            <Text className="mt-2 text-coment leading-5 text-textDim">
              {location.detailPlaces.join(' · ')}
            </Text>
          </>
        ) : null}
      </View>
    ) : null}
  </View>
);

export default MedicalPlaceCard;
