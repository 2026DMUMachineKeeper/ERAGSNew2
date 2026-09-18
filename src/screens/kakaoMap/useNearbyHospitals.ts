import React from 'react';

import { fetchNearbyHospitals } from '@/services';
import type { NearbyHospital } from '@/types';

type Coordinates = { latitude: number; longitude: number };

export const useNearbyHospitals = (coordinates: Coordinates | null): {
  hospitals: readonly NearbyHospital[];
  error: unknown;
} => {
  const [hospitals, setHospitals] = React.useState<readonly NearbyHospital[]>([]);
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (!coordinates) {
      return;
    }

    let isActive = true;
    fetchNearbyHospitals(coordinates)
      .then(nextHospitals => {
        if (isActive) {
          setHospitals(nextHospitals);
          setError(null);
        }
      })
      .catch((nextError: unknown) => {
        if (isActive) {
          setHospitals([]);
          setError(nextError);
        }
      });

    return () => {
      isActive = false;
    };
  }, [coordinates]);

  return { hospitals, error };
};
