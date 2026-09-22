import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { requestLocationPermission } from '@/services';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { isAuthSessionExpiredError } from '@/services/auth.service';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';

import {
  AedUsageModal,
  KakaoMapHeader,
  MedicalPlacesSheet,
  type MedicalFilter,
  type MedicalLocationListItem,
  type MedicalPlacesSheetRef,
} from './kakaoMap/components';
import {
  createCurrentLocationScript,
  createFocusMedicalLocationScript,
  createKakaoMapHtml,
  createMedicalFilterScript,
  createRequestMedicalDirectionsScript,
  MEDICAL_MARKER_ASSET_URIS,
  type MapCoordinates,
} from './kakaoMap/mapHtml';
import {
  getNearbyMedicalLocations,
  toMedicalMapLocations,
} from './kakaoMap/medicalLocations';
import { useNearbyAeds } from './kakaoMap/useNearbyAeds';
import { useNearbyHospitals } from './kakaoMap/useNearbyHospitals';

type KakaoMapScreenProps = {
  navigation: Pick<NavigationProp<ParamListBase>, 'goBack' | 'setOptions'> &
    Partial<Pick<NativeStackNavigationProp<RootStackParamList>, 'reset'>> & {
      getParent?: () => Pick<NativeStackNavigationProp<RootStackParamList>, 'reset'> | undefined;
    };
  route?: { name?: keyof RootStackParamList | 'MapTab' };
};

const KAKAO_MAP_BASE_URL = 'http://localhost';
const LOCATION_PERMISSION_REQUEST_DELAY_MS = 300;

type LocationLoadState =
  | 'loading'
  | 'ready'
  | 'permission-denied'
  | 'error';

type MedicalMapMessage =
  | { locationId: string; type: 'medical-location-pressed' }
  | { locationId: string; type: 'medical-directions-unavailable' }
  | {
      locationId: string;
      type: 'medical-directions-location';
      latitude: number;
      longitude: number;
    };

const getMedicalMapMessage = (message: string): MedicalMapMessage | null => {
  try {
    const parsedMessage: unknown = JSON.parse(message);

    if (
      typeof parsedMessage !== 'object' ||
      parsedMessage === null ||
      !('type' in parsedMessage) ||
      !('locationId' in parsedMessage) ||
      typeof parsedMessage.locationId !== 'string'
    ) {
      return null;
    }

    if (
      parsedMessage.type === 'medical-location-pressed' ||
      parsedMessage.type === 'medical-directions-unavailable'
    ) {
      return {
        locationId: parsedMessage.locationId,
        type: parsedMessage.type,
      };
    }

    if (
      parsedMessage.type === 'medical-directions-location' &&
      'latitude' in parsedMessage &&
      'longitude' in parsedMessage &&
      typeof parsedMessage.latitude === 'number' &&
      typeof parsedMessage.longitude === 'number' &&
      Number.isFinite(parsedMessage.latitude) &&
      Number.isFinite(parsedMessage.longitude)
    ) {
      return {
        locationId: parsedMessage.locationId,
        type: 'medical-directions-location',
        latitude: parsedMessage.latitude,
        longitude: parsedMessage.longitude,
      };
    }

    return null;
  } catch {
    return null;
  }
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

const openKakaoDirections = (
  name: string,
  latitude: number,
  longitude: number,
  origin: MapCoordinates | null,
): void => {
  const from = origin
    ? `from/${encodeURIComponent('현재 위치')},${origin.latitude},${
        origin.longitude
      }/`
    : '';
  const url = `https://map.kakao.com/link/${from}to/${encodeURIComponent(
    name,
  )},${latitude},${longitude}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('길찾기 실패', '카카오맵을 열지 못했습니다.');
  });
};

export const KakaoMapScreen = ({
  navigation,
  route,
}: KakaoMapScreenProps): React.JSX.Element => {
  const appKey = Config.KAKAO_MAP_APP_KEY;
  const isStackScreen = route?.name === 'KakaoMap';
  const mapWebViewRef = React.useRef<WebView<unknown>>(null);
  const placesSheetRef = React.useRef<MedicalPlacesSheetRef>(null);
  const [currentLocation, setCurrentLocation] =
    React.useState<MapCoordinates | null>(null);
  const [locationLoadState, setLocationLoadState] =
    React.useState<LocationLoadState>('loading');
  const [isMapReady, setIsMapReady] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const isLocatingRef = React.useRef(false);
  const hasRedirectedForExpiredSession = React.useRef(false);
  const [isAedGuideVisible, setIsAedGuideVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedMedicalFilter, setSelectedMedicalFilter] =
    React.useState<MedicalFilter>('all');
  const [selectedMedicalLocation, setSelectedMedicalLocation] =
    React.useState<MedicalLocationListItem | null>(null);
  const [mapHeight, setMapHeight] = React.useState(0);
  const { aeds, error: aedError, isLoading: isAedLoading,
    hasLoaded: hasAedLoaded, retry: retryAeds } = useNearbyAeds({
    coordinates: currentLocation,
  });
  const { hospitals, error: hospitalError, isLoading: isHospitalLoading,
    hasLoaded: hasHospitalLoaded, retry: retryHospitals } =
    useNearbyHospitals(currentLocation);
  const isAedAuthExpired = isAuthSessionExpiredError(aedError);
  const isHospitalAuthExpired = isAuthSessionExpiredError(hospitalError);
  const isAuthRedirecting = isAedAuthExpired || isHospitalAuthExpired;
  const aedErrorMessage = aedError && !isAedAuthExpired
    ? getApiErrorUserMessage(aedError, {
        fallbackMessage: 'AED 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
      })
    : null;
  const hospitalErrorMessage = hospitalError && !isHospitalAuthExpired
    ? getApiErrorUserMessage(hospitalError, {
        fallbackMessage: '병원 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
      })
    : null;
  const medicalLocations = React.useMemo(
    () => toMedicalMapLocations(aeds, hospitals),
    [aeds, hospitals],
  );
  const nearbyMedicalLocations = React.useMemo(
    () =>
      getNearbyMedicalLocations(
        medicalLocations,
        selectedMedicalFilter,
        searchQuery,
      ),
    [medicalLocations, searchQuery, selectedMedicalFilter],
  );
  const mapSource = React.useMemo(
    () => ({
      baseUrl: KAKAO_MAP_BASE_URL,
      html: createKakaoMapHtml(
        appKey ?? '',
        MEDICAL_MARKER_ASSET_URIS,
        medicalLocations,
      ),
    }),
    [appKey, medicalLocations],
  );
  React.useLayoutEffect(() => {
    if (!isAedGuideVisible || route?.name !== 'MapTab') {
      return;
    }

    navigation.setOptions({ tabBarStyle: { display: 'none' } });

    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [isAedGuideVisible, navigation, route?.name]);

  React.useEffect(() => {
    if (!appKey) {
      return;
    }

    let isActive = true;

    const loadCurrentLocation = async (): Promise<void> => {
      const permissionStatus = await requestLocationPermission();

      if (permissionStatus !== 'granted') {
        if (isActive) {
          setLocationLoadState('permission-denied');
        }
        return;
      }

      try {
        const coordinates = await getCurrentMapCoordinates();

        if (isActive) {
          setCurrentLocation(coordinates);
          setLocationLoadState('ready');
        }
      } catch (error: unknown) {
        console.warn('[KakaoMapScreen] 현재 위치 조회 실패:', error);
        if (isActive) {
          setLocationLoadState('error');
        }
      }
    };

    // 화면 전환 직후 권한 API가 Activity에 연결되기 전 요청되는 것을 막습니다.
    const permissionRequestTimer = setTimeout(() => {
      loadCurrentLocation().catch((error: unknown) => {
        console.warn('[KakaoMapScreen] 위치 권한 요청 실패:', error);
        if (isActive) {
          setLocationLoadState('error');
        }
      });
    }, LOCATION_PERMISSION_REQUEST_DELAY_MS);

    return () => {
      isActive = false;
      clearTimeout(permissionRequestTimer);
    };
  }, [appKey]);

  React.useEffect(() => {
    if ((!isAedAuthExpired && !isHospitalAuthExpired) ||
        hasRedirectedForExpiredSession.current) {
      return;
    }
    hasRedirectedForExpiredSession.current = true;
    const rootNavigation = route?.name === 'MapTab'
      ? navigation.getParent?.()
      : navigation.reset ? { reset: navigation.reset } : undefined;
    redirectToLoginForExpiredSession(rootNavigation);
  }, [isAedAuthExpired, isHospitalAuthExpired, navigation, route?.name]);

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
    if (!currentLocation) {
      setLocationLoadState('loading');
    }
    try {
      const permissionStatus = await requestLocationPermission();
      if (permissionStatus !== 'granted') {
        if (!currentLocation) {
          setLocationLoadState('permission-denied');
        }
        Alert.alert('위치 권한 필요', '설정에서 위치 권한을 허용해 주세요.');
        return;
      }

      const coordinates = await getCurrentMapCoordinates(0);
      setCurrentLocation(coordinates);
      setLocationLoadState('ready');
      mapWebViewRef.current?.injectJavaScript(`
        window.eragsUpdateCurrentLocation?.(${coordinates.latitude}, ${coordinates.longitude});
        window.eragsMap?.setCenter(new kakao.maps.LatLng(${coordinates.latitude}, ${coordinates.longitude}));
        window.eragsMap?.setLevel(3);
        true;
      `);
      setSelectedMedicalLocation(null);
      placesSheetRef.current?.dismiss();
    } catch {
      if (!currentLocation) {
        setLocationLoadState('error');
      }
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
    setSelectedMedicalLocation(location);

    if (isMapReady) {
      mapWebViewRef.current?.injectJavaScript(
        createFocusMedicalLocationScript(location.id),
      );
    }
  };
  const handleDirectionsPress = (location: MedicalLocationListItem): void => {
    const mapLocation = medicalLocations.find(item => item.id === location.id);
    if (!mapLocation) {
      return;
    }

    if (
      typeof mapLocation.latitude === 'number' &&
      typeof mapLocation.longitude === 'number'
    ) {
      openKakaoDirections(
        mapLocation.name,
        mapLocation.latitude,
        mapLocation.longitude,
        currentLocation,
      );
      return;
    }

    if (!isMapReady) {
      Alert.alert('길찾기 준비 중', '지도를 불러온 뒤 다시 시도해 주세요.');
      return;
    }

    mapWebViewRef.current?.injectJavaScript(
      createRequestMedicalDirectionsScript(location.id),
    );
  };
  const handleMapMessage = (event: WebViewMessageEvent): void => {
    const { data } = event.nativeEvent;

    if (data === 'map-clicked') {
      setSelectedMedicalLocation(null);
      placesSheetRef.current?.dismiss();
      return;
    }

    const message = getMedicalMapMessage(data);
    if (!message) {
      return;
    }

    const selectedLocation = medicalLocations.find(
      location => location.id === message.locationId,
    );

    if (!selectedLocation) {
      return;
    }

    if (message.type === 'medical-directions-unavailable') {
      Alert.alert('길찾기 불가', '장소 위치를 찾지 못했습니다.');
      return;
    }

    if (message.type === 'medical-directions-location') {
      openKakaoDirections(
        selectedLocation.name,
        message.latitude,
        message.longitude,
        currentLocation,
      );
      return;
    }

    setSelectedMedicalLocation(selectedLocation);
    placesSheetRef.current?.expand();
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
            onLoadStart={() => setIsMapReady(false)}
            onMessage={handleMapMessage}
            onShouldStartLoadWithRequest={request =>
              request.url === KAKAO_MAP_BASE_URL ||
              request.url === `${KAKAO_MAP_BASE_URL}/` ||
              request.url === 'about:blank'
            }
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
            aedStatus={{
              errorMessage: aedErrorMessage,
              isLoading: isAedLoading,
              onRetry: retryAeds,
            }}
            hospitalStatus={{
              errorMessage: hospitalErrorMessage,
              isLoading: isHospitalLoading,
              onRetry: retryHospitals,
            }}
            hasLoaded={hasAedLoaded && hasHospitalLoaded}
            hasSearchConditions={!!searchQuery.trim() || selectedMedicalFilter !== 'all'}
            isAuthRedirecting={isAuthRedirecting}
            locationLoadState={locationLoadState}
            floatingControl={
              <Pressable
                accessibilityLabel="현재 위치로 이동"
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !isMapReady || isLocating,
                  busy: isLocating,
                }}
                disabled={!isMapReady || isLocating}
                onPress={handleCurrentLocationPress}
                className="h-12 w-12 items-center justify-center rounded-full border border-authInputBorder bg-white shadow-lg active:bg-background"
              >
                {isLocating ? (
                  <ActivityIndicator color="#525D6D" />
                ) : (
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    <Circle
                      cx={12}
                      cy={12}
                      r={7}
                      stroke="#525D6D"
                      strokeWidth={1.8}
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
            }
            locations={nearbyMedicalLocations}
            mapHeight={mapHeight}
            onDirectionsPress={handleDirectionsPress}
            onLocationPress={handleMedicalLocationPress}
            ref={placesSheetRef}
            searchQuery={searchQuery}
            selectedLocation={selectedMedicalLocation}
          />
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
