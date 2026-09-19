import type { NearbyAed } from '@/types';
import { fetchNearbyAeds } from '@/services';

import { useNearbyPlaces } from './useNearbyPlaces';

type Coordinates = { latitude: number; longitude: number };

export const useNearbyAeds = ({
  coordinates,
}: { coordinates: Coordinates | null }): {
  aeds: readonly NearbyAed[];
  error: unknown;
  isLoading: boolean;
  hasLoaded: boolean;
  retry: () => void;
} => {
  const { items, ...rest } = useNearbyPlaces(coordinates, fetchNearbyAeds);
  return { aeds: items, ...rest };
};
