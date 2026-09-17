import React from 'react';

import type { NearbyAed } from '@/types';
import { fetchNearbyAeds } from '@/services';

type MapCoordinates = {
  latitude: number;
  longitude: number;
};

type UseNearbyAedsParams = {
  coordinates: MapCoordinates | null;
};

type UseNearbyAedsResult = {
  aeds: readonly NearbyAed[];
  error: unknown;
};

export const useNearbyAeds = ({
  coordinates,
}: UseNearbyAedsParams): UseNearbyAedsResult => {
  const [aeds, setAeds] = React.useState<readonly NearbyAed[]>([]);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (!coordinates) {
      return;
    }

    let isActive = true;

    fetchNearbyAeds(coordinates)
      .then(nextAeds => {
        if (isActive) {
          setAeds(nextAeds);
          setError(null);
        }
      })
      .catch((nextError: unknown) => {
        if (isActive) {
          setAeds([]);
          setError(nextError);
        }
      });

    return () => {
      isActive = false;
    };
  }, [coordinates]);

  return { aeds, error };
};
