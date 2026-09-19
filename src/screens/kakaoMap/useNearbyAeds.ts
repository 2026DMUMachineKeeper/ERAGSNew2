import React from 'react';

import type { NearbyAed } from '@/types';
import { fetchNearbyAeds } from '@/services';

type Coordinates = { latitude: number; longitude: number };

export type NearbyResult<T> = {
  items: readonly T[];
  error: unknown;
  isLoading: boolean;
  hasLoaded: boolean;
  retry: () => void;
};

export const useNearbyPlaces = <T,>(
  coordinates: Coordinates | null,
  fetchPlaces: (coordinates: Coordinates) => Promise<T[]>,
): NearbyResult<T> => {
  const key = coordinates ? `${coordinates.latitude}:${coordinates.longitude}` : null;
  const [requestVersion, setRequestVersion] = React.useState(0);
  const [state, setState] = React.useState<Omit<NearbyResult<T>, 'retry'> & { key: string | null }>({
    key: null, items: [], error: null, isLoading: false, hasLoaded: false,
  });
  const pendingKey = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!key || !coordinates) {
      return;
    }

    let isActive = true;
    pendingKey.current = key;
    setState(previous => ({
      ...previous, key, items: previous.key === key ? previous.items : [],
      error: null, isLoading: true,
      hasLoaded: previous.key === key && previous.hasLoaded,
    }));
    fetchPlaces(coordinates)
      .then(items => {
        if (isActive) {
          setState(previous => ({
            ...previous, key, items, error: null, isLoading: false, hasLoaded: true,
          }));
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState(previous => ({
            ...previous, key, items: previous.key === key ? previous.items : [],
            error, isLoading: false, hasLoaded: true,
          }));
        }
      })
      .finally(() => {
        if (isActive) {
          pendingKey.current = null;
        }
      });

    return () => {
      isActive = false;
      if (pendingKey.current === key) {
        pendingKey.current = null;
      }
    };
    // 좌표값이 바뀔 때만 다시 조회합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, requestVersion, fetchPlaces]);

  const retry = (): void => {
    if (key && pendingKey.current !== key && state.key === key && state.error) {
      pendingKey.current = key;
      setRequestVersion(version => version + 1);
    }
  };

  return state.key === key
    ? { items: state.items, error: state.error, isLoading: state.isLoading,
        hasLoaded: state.hasLoaded, retry }
    : { items: [], error: null, isLoading: !!key, hasLoaded: false, retry };
};

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
