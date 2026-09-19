import { fetchNearbyHospitals } from '@/services';
import type { NearbyHospital } from '@/types';

import { useNearbyPlaces } from './useNearbyPlaces';

type Coordinates = { latitude: number; longitude: number };

export const useNearbyHospitals = (coordinates: Coordinates | null): {
  hospitals: readonly NearbyHospital[];
  error: unknown;
  isLoading: boolean;
  hasLoaded: boolean;
  retry: () => void;
} => {
  const { items, ...rest } = useNearbyPlaces(coordinates, fetchNearbyHospitals);
  return { hospitals: items, ...rest };
};
