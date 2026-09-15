import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  type LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import Geolocation, {
  type GeolocationOptions,
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import Config from 'react-native-config';
import Svg, { Circle, Path } from 'react-native-svg';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useIsFocused,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import aedMapMarker from '@/assets/icons/markers/aed-map-marker.png';
import hospitalMapMarker from '@/assets/icons/markers/hospital-map-marker.png';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { requestLocationPermission } from '@/services';

import {
  AedUsageModal,
  KakaoMapHeader,
  MedicalPlacesSheet,
  type MedicalFilter,
  type MedicalLocationListItem,
  type MedicalPlacesSheetRef,
} from './kakaoMap/components';

type KakaoMapScreenProps = {
  navigation: Pick<NavigationProp<ParamListBase>, 'goBack' | 'setOptions'>;
  route?: { name?: keyof RootStackParamList | 'MapTab' };
};

const KAKAO_MAP_CENTER = {
  latitude: 37.4999957879,
  longitude: 126.8681696567,
};
const KAKAO_MAP_BASE_URL = 'https://localhost';

const DEMO_MEDICAL_LOCATIONS = [
  {
    id: 'demo-hospital-1',
    type: 'hospital',
    typeLabel: '병원',
    name: '데모 병원 A',
    address: '임시 좌표 · 동양미래대학교 인근',
    latitude: 37.50115,
    longitude: 126.86695,
  },
  {
    id: 'demo-hospital-2',
    type: 'hospital',
    typeLabel: '병원',
    name: '데모 병원 B',
    address: '임시 좌표 · 동양미래대학교 서쪽 인근',
    latitude: 37.49842,
    longitude: 126.87008,
  },
  {
    id: 'demo-aed-1',
    type: 'aed',
    typeLabel: 'AED',
    name: '임시 AED 위치 1',
    address: '임시 좌표 · 동양미래대학교 본관 인근',
    latitude: 37.50055,
    longitude: 126.86715,
  },
  {
    id: 'demo-aed-2',
    type: 'aed',
    typeLabel: 'AED',
    name: '임시 AED 위치 2',
    address: '임시 좌표 · 동양미래대학교 동쪽 인근',
    latitude: 37.49865,
    longitude: 126.86935,
  },
  {
    id: 'demo-aed-3',
    type: 'aed',
    typeLabel: 'AED',
    name: '임시 AED 위치 3',
    address: '임시 좌표 · 동양미래대학교 북쪽 인근',
    latitude: 37.50125,
    longitude: 126.8692,
  },
] as const;

const DEMO_MARKER_ASSET_URIS = {
  hospital: Image.resolveAssetSource(hospitalMapMarker).uri,
  aed: Image.resolveAssetSource(aedMapMarker).uri,
} as const;

interface MapCoordinates {
  latitude: number;
  longitude: number;
}

const getDistanceInMeters = (
  origin: MapCoordinates,
  destination: MapCoordinates,
): number => {
  const earthRadiusInMeters = 6371000;
  const latitudeDelta =
    ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const longitudeDelta =
    ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const originLatitude = (origin.latitude * Math.PI) / 180;
  const destinationLatitude = (destination.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 *
      Math.cos(originLatitude) *
      Math.cos(destinationLatitude);

  return (
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) *
    earthRadiusInMeters
  );
};

const requestCurrentPosition = (
  options: GeolocationOptions,
): Promise<GeolocationResponse> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, options);
  });

const getCurrentMapCoordinates = async (
  maximumAge = 300000,
): Promise<MapCoordinates> => {
  try {
    const { coords } = await requestCurrentPosition({
      enableHighAccuracy: false,
      maximumAge,
      timeout: 8000,
    });

    return coords;
  } catch {
    const { coords } = await requestCurrentPosition({
      enableHighAccuracy: true,
      maximumAge: Math.min(maximumAge, 60000),
      timeout: 20000,
    });

    return coords;
  }
};

const createKakaoMapHtml = (
  appKey: string,
  markerAssetUris: typeof DEMO_MARKER_ASSET_URIS,
): string => `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>카카오맵</title>
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    </style>
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const mapContainer = document.getElementById('map');
      const mapOption = {
        center: new kakao.maps.LatLng(${KAKAO_MAP_CENTER.latitude}, ${
  KAKAO_MAP_CENTER.longitude
}),
        level: 4,
      };
      window.eragsMap = new kakao.maps.Map(mapContainer, mapOption);

      const demoMedicalLocations = ${JSON.stringify(DEMO_MEDICAL_LOCATIONS)};
      const demoMarkerAssetUris = ${JSON.stringify(markerAssetUris)};
      const createMarkerImage = (assetUri) => new kakao.maps.MarkerImage(
        assetUri,
        new kakao.maps.Size(40, 40),
        { offset: new kakao.maps.Point(20, 40) },
      );
      const demoMarkerImages = {
        hospital: createMarkerImage(demoMarkerAssetUris.hospital),
        aed: createMarkerImage(demoMarkerAssetUris.aed),
      };
      const demoInfoWindow = new kakao.maps.InfoWindow({ zIndex: 10 });
      const demoBounds = new kakao.maps.LatLngBounds();
      const demoMarkers = {};
      const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]);

      demoMedicalLocations.forEach(location => {
        const position = new kakao.maps.LatLng(
          location.latitude,
          location.longitude,
        );
        demoBounds.extend(position);

        const marker = new kakao.maps.Marker({
          image: demoMarkerImages[location.type],
          map: window.eragsMap,
          position,
          title: location.name,
        });
        demoMarkers[location.id] = marker;

        kakao.maps.event.addListener(marker, 'click', () => {
          const accentColor = location.type === 'hospital' ? '#FF3A3A' : '#18A999';
          demoInfoWindow.setContent(
            '<div style="min-width:180px;padding:12px 14px;border-radius:12px;background:#fff;box-shadow:0 3px 12px rgba(0,0,0,.16);font-family:Arial,sans-serif;">' +
              '<strong style="display:block;color:#111;font-size:14px;">' +
              escapeHtml(location.name) +
              '</strong>' +
              '<span style="display:inline-block;margin-top:5px;color:' +
              accentColor +
              ';font-size:12px;font-weight:700;">' +
              escapeHtml(location.typeLabel) +
              '</span>' +
              '<div style="margin-top:5px;color:#666;font-size:12px;">' +
              escapeHtml(location.address) +
              '</div>' +
            '</div>',
          );
          demoInfoWindow.open(window.eragsMap, marker);
        });
      });

      if (demoMedicalLocations.length > 1) {
        window.eragsMap.setBounds(demoBounds, 56, 56, 56, 56);
      }

      kakao.maps.event.addListener(window.eragsMap, 'click', () => {
        window.ReactNativeWebView?.postMessage('map-clicked');
      });

      window.eragsFilterMedicalLocations = function (filter, query) {
        const normalizedQuery = (query || '').trim().toLocaleLowerCase();

        demoMedicalLocations.forEach(location => {
          const matchesFilter = filter === 'all' || location.type === filter;
          const searchableText = (location.name + ' ' + location.address).toLocaleLowerCase();
          const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
          const marker = demoMarkers[location.id];

          marker?.setMap(matchesFilter && matchesQuery ? window.eragsMap : null);
        });
      };

      window.eragsFocusMedicalLocation = function (locationId) {
        const marker = demoMarkers[locationId];

        if (!marker) {
          return;
        }

        window.eragsMap.setCenter(marker.getPosition());
        window.eragsMap.setLevel(3);
      };

      window.eragsUpdateCurrentLocation = function (latitude, longitude) {
        const position = new kakao.maps.LatLng(latitude, longitude);

        if (!window.eragsCurrentLocationMarker) {
          window.eragsCurrentLocationMarker = new kakao.maps.Marker({
            position,
          });
        } else {
          window.eragsCurrentLocationMarker.setPosition(position);
        }

        window.eragsCurrentLocationMarker.setMap(window.eragsMap);
      };
    </script>
  </body>
</html>
`;

const createCurrentLocationScript = ({
  latitude,
  longitude,
}: MapCoordinates): string => `
  window.eragsUpdateCurrentLocation?.(${latitude}, ${longitude});
  true;
`;

const createMedicalFilterScript = (
  filter: MedicalFilter,
  query: string,
): string => `
  window.eragsFilterMedicalLocations?.(${JSON.stringify(filter)}, ${JSON.stringify(
    query,
  )});
  true;
`;

const createFocusMedicalLocationScript = (locationId: string): string => `
  window.eragsFocusMedicalLocation?.(${JSON.stringify(locationId)});
  true;
`;

export const KakaoMapScreen = ({
  navigation,
  route,
}: KakaoMapScreenProps): React.JSX.Element => {
  const appKey = Config.KAKAO_MAP_APP_KEY;
  const isStackScreen = route?.name === 'KakaoMap';
  const isMapFocused = useIsFocused();
  const mapWebViewRef = React.useRef<WebView<unknown>>(null);
  const placesSheetRef = React.useRef<MedicalPlacesSheetRef>(null);
  const [currentLocation, setCurrentLocation] =
    React.useState<MapCoordinates | null>(null);
  const [isMapReady, setIsMapReady] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const isLocatingRef = React.useRef(false);
  const [isAedGuideVisible, setIsAedGuideVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedMedicalFilter, setSelectedMedicalFilter] =
    React.useState<MedicalFilter>('all');
  const [mapHeight, setMapHeight] = React.useState(0);
  const nearbyMedicalLocations = React.useMemo(() => {
    const origin = currentLocation ?? KAKAO_MAP_CENTER;
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('ko-KR');

    return DEMO_MEDICAL_LOCATIONS.filter(location => {
      const matchesFilter =
        selectedMedicalFilter === 'all' ||
        location.type === selectedMedicalFilter;
      const searchableText = `${location.name} ${location.address}`.toLocaleLowerCase(
        'ko-KR',
      );

      return (
        matchesFilter &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    })
      .map(location => ({
        ...location,
        distanceInMeters: getDistanceInMeters(origin, location),
      }))
      .sort((firstLocation, secondLocation) =>
        firstLocation.distanceInMeters - secondLocation.distanceInMeters,
      )
      .slice(0, 5);
  }, [currentLocation, searchQuery, selectedMedicalFilter]);
  const mapSource = React.useMemo(
    () => ({
      baseUrl: KAKAO_MAP_BASE_URL,
      html: createKakaoMapHtml(appKey ?? '', DEMO_MARKER_ASSET_URIS),
    }),
    [appKey],
  );

  React.useLayoutEffect(() => {
    if (!isAedGuideVisible || route?.name !== 'MapTab') {
      return;
    }

    navigation.setOptions({ tabBarStyle: { display: 'none' } });

    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [isAedGuideVisible, navigation, route?.name]);

  React.useEffect(() => {
    if (!appKey || !isMapFocused) {
      return;
    }

    let isActive = true;

    const loadCurrentLocation = async (): Promise<void> => {
      const permissionStatus = await requestLocationPermission();

      if (permissionStatus !== 'granted') {
        return;
      }

      try {
        const coordinates = await getCurrentMapCoordinates();

        if (isActive) {
          setCurrentLocation(coordinates);
        }
      } catch (error: unknown) {
        console.warn('[KakaoMapScreen] 현재 위치 조회 실패:', error);
      }
    };

    loadCurrentLocation().catch((error: unknown) => {
      console.warn('[KakaoMapScreen] 위치 권한 요청 실패:', error);
    });

    return () => {
      isActive = false;
    };
  }, [appKey, isMapFocused]);

  React.useEffect(() => {
    if (!isMapReady || !currentLocation) {
      return;
    }

    mapWebViewRef.current?.injectJavaScript(
      createCurrentLocationScript(currentLocation),
    );
  }, [currentLocation, isMapReady]);

  React.useEffect(() => {
    if (!isMapReady) {
      return;
    }

    mapWebViewRef.current?.injectJavaScript(
      createMedicalFilterScript(selectedMedicalFilter, searchQuery),
    );
  }, [isMapReady, searchQuery, selectedMedicalFilter]);

  const handleMapLayout = (event: LayoutChangeEvent): void => {
    setMapHeight(event.nativeEvent.layout.height);
  };

  const handleCurrentLocationPress = async (): Promise<void> => {
    if (!isMapReady || isLocatingRef.current) {
      return;
    }

    isLocatingRef.current = true;
    setIsLocating(true);
    try {
      const permissionStatus = await requestLocationPermission();
      if (permissionStatus !== 'granted') {
        Alert.alert('위치 권한 필요', '설정에서 위치 권한을 허용해 주세요.');
        return;
      }

      const coordinates = await getCurrentMapCoordinates(0);
      setCurrentLocation(coordinates);
      mapWebViewRef.current?.injectJavaScript(`
        window.eragsUpdateCurrentLocation?.(${coordinates.latitude}, ${coordinates.longitude});
        window.eragsMap?.setCenter(new kakao.maps.LatLng(${coordinates.latitude}, ${coordinates.longitude}));
        window.eragsMap?.setLevel(3);
        true;
      `);
      placesSheetRef.current?.dismiss();
    } catch {
      Alert.alert(
        '위치 조회 실패',
        '현재 위치를 가져오지 못했습니다. 위치 설정을 확인하고 다시 시도해 주세요.',
      );
    } finally {
      isLocatingRef.current = false;
      setIsLocating(false);
    }
  };

  const handleMedicalLocationPress = (
    location: MedicalLocationListItem,
  ): void => {
    if (!isMapReady) {
      return;
    }

    mapWebViewRef.current?.injectJavaScript(
      createFocusMedicalLocationScript(location.id),
    );
  };
  const handleMapMessage = (event: WebViewMessageEvent): void => {
    if (event.nativeEvent.data !== 'map-clicked') {
      return;
    }

    placesSheetRef.current?.dismiss();
  };

  return (
    <SafeAreaView
      edges={route?.name === 'MapTab' ? ['top'] : ['top', 'bottom']}
      className="flex-1 bg-white"
    >
      {appKey ? (
        <View
          className="relative flex-1 overflow-hidden bg-white"
          onLayout={handleMapLayout}
        >
          <WebView
            domStorageEnabled
            javaScriptEnabled
            onMessage={handleMapMessage}
            originWhitelist={['*']}
            onLoadEnd={() => setIsMapReady(true)}
            ref={mapWebViewRef}
            renderLoading={() => (
              <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#FF3A3A" />
                <Text className="mt-3 text-coment text-textDim">
                  지도를 불러오는 중입니다.
                </Text>
              </View>
            )}
            source={mapSource}
            startInLoadingState
          />
          <KakaoMapHeader
            isStackScreen={isStackScreen}
            onBackPress={() => navigation.goBack()}
            onClearSearch={() => setSearchQuery('')}
            onFilterChange={setSelectedMedicalFilter}
            onOpenAedGuide={() => setIsAedGuideVisible(true)}
            onSearchQueryChange={setSearchQuery}
            searchQuery={searchQuery}
            selectedMedicalFilter={selectedMedicalFilter}
          />
          <MedicalPlacesSheet
            locations={nearbyMedicalLocations}
            mapHeight={mapHeight}
            onLocationPress={handleMedicalLocationPress}
            ref={placesSheetRef}
            searchQuery={searchQuery}
          />
          <Pressable
            accessibilityLabel="현재 위치로 이동"
            accessibilityRole="button"
            accessibilityState={{
              disabled: !isMapReady || isLocating,
              busy: isLocating,
            }}
            disabled={!isMapReady || isLocating}
            onPress={handleCurrentLocationPress}
            className="absolute bottom-10 right-4 z-30 h-12 w-12 items-center justify-center rounded-full border border-authInputBorder bg-white shadow-lg active:bg-background"
          >
            {isLocating ? (
              <ActivityIndicator color="#525D6D" />
            ) : (
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle
                  cx={12} cy={12} r={7}
                  stroke="#525D6D" strokeWidth={1.8}
                />
                <Circle cx={12} cy={12} r={3} fill="#525D6D" />
                <Path
                  d="M12 2V5M12 19V22M2 12H5M19 12H22"
                  stroke="#525D6D"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </Svg>
            )}
          </Pressable>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-center text-body font-suitBold text-black">
            카카오맵 키가 설정되지 않았습니다.
          </Text>
          <Text className="mt-2 text-center text-coment text-textDim">
            .env 파일에 KAKAO_MAP_APP_KEY를 설정해 주세요.
          </Text>
        </View>
      )}

      <AedUsageModal
        onClose={() => setIsAedGuideVisible(false)}
        visible={isAedGuideVisible}
      />
    </SafeAreaView>
  );
};

export default KakaoMapScreen;
