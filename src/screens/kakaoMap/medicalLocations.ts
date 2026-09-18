import type { NearbyAed, NearbyHospital } from '@/types';

import type { MedicalFilter, MedicalLocationListItem } from './components';

export type MedicalMapLocation = MedicalLocationListItem & {
  latitude?: number;
  longitude?: number;
};

export const toMedicalMapLocations = (
  aeds: readonly NearbyAed[],
  hospitals: readonly NearbyHospital[],
): MedicalMapLocation[] => [
  ...aeds.map((aed, index) => ({
    address: aed.address,
    detailPlaces: aed.detailPlaces,
    distanceInMeters: aed.distanceInMeters,
    id: `${aed.latitude}:${aed.longitude}:${aed.name}:${index}`,
    latitude: aed.latitude,
    longitude: aed.longitude,
    name: aed.name,
    phone: aed.phone,
    type: 'aed' as const,
    typeLabel: 'AED',
  })),
  ...hospitals.map(hospital => ({
    address: hospital.address,
    detailPlaces: [],
    distanceInMeters: hospital.distanceInMeters,
    id: `hospital:${hospital.hpid}`,
    hospitalDetails: {
      isRealTimeAvailable: hospital.isRealTimeAvailable,
      availableBeds: hospital.availableBeds,
      operatingRoomBeds: hospital.operatingRoomBeds,
      ctAvailable: hospital.ctAvailable,
      mriAvailable: hospital.mriAvailable,
    },
    name: hospital.name,
    phone: '',
    type: 'hospital' as const,
    typeLabel: '병원',
  })),
];

export const getNearbyMedicalLocations = (
  locations: readonly MedicalMapLocation[],
  filter: MedicalFilter,
  query: string,
): MedicalMapLocation[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  const sortedLocations = locations
    .filter(location => {
      const matchesFilter = filter === 'all' || location.type === filter;
      const searchableText =
        `${location.name} ${location.address}`.toLocaleLowerCase('ko-KR');

      return (
        matchesFilter &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    })
    .sort(
      (firstLocation, secondLocation) =>
        firstLocation.distanceInMeters - secondLocation.distanceInMeters,
    );

  if (filter !== 'all') {
    return sortedLocations.slice(0, 5);
  }

  let aedCount = 0;
  let hospitalCount = 0;
  return sortedLocations.filter(location => {
    if (location.type === 'aed') {
      return aedCount++ < 5;
    }
    return hospitalCount++ < 5;
  });
};
