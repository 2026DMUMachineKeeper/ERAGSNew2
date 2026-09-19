import React from 'react';
import { Script } from 'node:vm';
import { Alert, Linking } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Geolocation from '@react-native-community/geolocation';

import {
  fetchNearbyAeds,
  fetchNearbyHospitals,
  requestLocationPermission,
} from '@/services';
import type { MedicalLocationListItem } from './kakaoMap/components';
import { createKakaoMapHtml } from './kakaoMap/mapHtml';
import { KakaoMapScreen } from './KakaoMapScreen';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';
import type { NearbyAed } from '@/types';
import { ApiRequestError } from '@/services/apiError.service';

const mockInjectJavaScript = jest.fn();
const mockDismiss = jest.fn();
const mockExpand = jest.fn();
const mockMedicalPlacesSheet = jest.fn();
jest.mock('react-native-config', () => ({ KAKAO_MAP_APP_KEY: 'test-key' }));
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));
jest.mock('@/services', () => ({
  fetchNearbyAeds: jest.fn(),
  fetchNearbyHospitals: jest.fn(),
  requestLocationPermission: jest.fn(),
}));
jest.mock('@/services/auth.service', () => ({
  isAuthSessionExpiredError: (error: unknown) =>
    error instanceof Error && error.name === 'AuthSessionExpiredError',
}));
jest.mock('@/utils/authSessionNavigation', () => ({
  redirectToLoginForExpiredSession: jest.fn(),
}));
jest.mock('react-native-webview', () => {
  const ReactModule: typeof React = require('react');
  const { View } = require('react-native');
  return {
    WebView: ReactModule.forwardRef((props, ref) => {
      ReactModule.useImperativeHandle(ref, () => ({
        injectJavaScript: mockInjectJavaScript,
      }));
      return ReactModule.createElement(View, { ...props, testID: 'map' });
    }),
  };
});

describe('주변 병원·AED 조회 상태', () => {
  const aed: NearbyAed = {
    name: '테스트 AED', address: '서울', latitude: 37.5, longitude: 127,
    phone: '02-0000-0000', distanceInMeters: 100, detailPlaces: [],
  };
  const getSheet = (): {
    locations: MedicalLocationListItem[];
    aedErrorMessage: string | null;
    hospitalErrorMessage: string | null;
    isAedLoading: boolean;
    isHospitalLoading: boolean;
    hasLoaded: boolean;
    hasSearchConditions: boolean;
    onRetryAeds: () => void;
    onRetryHospitals: () => void;
  } => mockMedicalPlacesSheet.mock.lastCall?.[0];
  const renderAtCurrentLocation = async (navigation = {
    goBack: jest.fn(), setOptions: jest.fn(), reset: jest.fn(),
    getParent: jest.fn(() => ({ reset: jest.fn() })),
  }): Promise<ReactTestRenderer.ReactTestRenderer> => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <KakaoMapScreen navigation={navigation} route={{ name: 'MapTab' }} />,
      );
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    return renderer;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(requestLocationPermission).mockResolvedValue('granted');
    jest.mocked(Geolocation.getCurrentPosition).mockImplementation(success =>
      success({
        coords: {
          latitude: 37.5, longitude: 127, altitude: null, accuracy: 10,
          altitudeAccuracy: null, heading: null, speed: null,
        },
        timestamp: 1,
      }),
    );
  });
  afterEach(() => jest.useRealTimers());

  it('최초 로딩과 정상적인 빈 결과를 구분한다', async () => {
    let resolveAeds!: (items: NearbyAed[]) => void;
    jest.mocked(fetchNearbyAeds).mockImplementation(() => new Promise(resolve => {
      resolveAeds = resolve;
    }));
    jest.mocked(fetchNearbyHospitals).mockResolvedValue([]);
    const renderer = await renderAtCurrentLocation();
    expect(getSheet()).toEqual(expect.objectContaining({
      locations: [], isAedLoading: true, hasLoaded: false,
    }));
    await act(async () => resolveAeds([]));
    expect(getSheet()).toEqual(expect.objectContaining({
      locations: [], isAedLoading: false, hasLoaded: true,
      aedErrorMessage: null, hospitalErrorMessage: null,
    }));
    act(() => renderer.root.findByProps({ testID: 'open-aed-guide' })
      .props.onSearchQueryChange('없는 장소'));
    expect(getSheet().hasSearchConditions).toBe(true);
    act(() => renderer.unmount());
  });

  it('한쪽 실패 시 성공 결과를 유지하고 중복 없이 재시도한다', async () => {
    let resolveRetry!: (items: []) => void;
    jest.mocked(fetchNearbyAeds).mockResolvedValue([aed]);
    jest.mocked(fetchNearbyHospitals)
      .mockRejectedValueOnce(new TypeError('network'))
      .mockImplementationOnce(() => new Promise(resolve => { resolveRetry = resolve; }));
    const renderer = await renderAtCurrentLocation();
    expect(getSheet().locations).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '테스트 AED' }),
    ]));
    expect(getSheet().hospitalErrorMessage).toContain('병원 정보를');
    act(() => {
      getSheet().onRetryHospitals();
      getSheet().onRetryHospitals();
    });
    expect(fetchNearbyHospitals).toHaveBeenCalledTimes(2);
    expect(getSheet().locations).toHaveLength(1);
    expect(getSheet().isHospitalLoading).toBe(true);
    await act(async () => resolveRetry([]));
    expect(getSheet().hospitalErrorMessage).toBeNull();
    expect(getSheet().locations).toHaveLength(1);
    expect(redirectToLoginForExpiredSession).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('두 조회의 인증 만료가 동시에 도착해도 로그인 이동을 한 번만 요청한다', async () => {
    const expired = new Error();
    expired.name = 'AuthSessionExpiredError';
    jest.mocked(fetchNearbyAeds).mockRejectedValue(expired);
    jest.mocked(fetchNearbyHospitals).mockRejectedValue(expired);
    const parentNavigation = { reset: jest.fn() };
    const renderer = await renderAtCurrentLocation({
      goBack: jest.fn(), setOptions: jest.fn(), reset: jest.fn(),
      getParent: jest.fn(() => parentNavigation),
    });
    expect(redirectToLoginForExpiredSession).toHaveBeenCalledTimes(1);
    expect(redirectToLoginForExpiredSession).toHaveBeenCalledWith(parentNavigation);
    expect(getSheet().aedErrorMessage).toBeNull();
    expect(getSheet().hospitalErrorMessage).toBeNull();
    act(() => renderer.unmount());
  });

  it('서버 오류는 인증 만료로 취급하지 않는다', async () => {
    jest.mocked(fetchNearbyAeds).mockRejectedValue(new ApiRequestError(
      { code: 'SERVER_ERROR', details: [], message: '서버 오류' }, 500,
    ));
    jest.mocked(fetchNearbyHospitals).mockResolvedValue([]);
    const renderer = await renderAtCurrentLocation();
    expect(getSheet().aedErrorMessage).toContain('서버에 문제가 있습니다.');
    expect(redirectToLoginForExpiredSession).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('위치가 바뀌면 이전 위치의 결과를 현재 결과로 표시하지 않는다', async () => {
    let positionCount = 0;
    jest.mocked(Geolocation.getCurrentPosition).mockImplementation(success => {
      positionCount += 1;
      success({
        coords: {
          latitude: positionCount === 1 ? 37.5 : 38,
          longitude: 127, altitude: null, accuracy: 10,
          altitudeAccuracy: null, heading: null, speed: null,
        },
        timestamp: 1,
      });
    });
    let resolveNext!: (items: NearbyAed[]) => void;
    jest.mocked(fetchNearbyAeds).mockResolvedValueOnce([aed])
      .mockImplementationOnce(() => new Promise(resolve => { resolveNext = resolve; }));
    jest.mocked(fetchNearbyHospitals).mockResolvedValue([]);
    const renderer = await renderAtCurrentLocation();
    expect(getSheet().locations).toHaveLength(1);
    act(() => renderer.root.findByProps({ testID: 'map' }).props.onLoadEnd());
    await act(async () => {
      await renderer.root.findByProps({ accessibilityLabel: '현재 위치로 이동' })
        .props.onPress();
    });
    expect(getSheet().locations).toHaveLength(0);
    expect(getSheet().isAedLoading).toBe(true);
    expect(renderer.root.findByProps({ testID: 'map' }).props.source.html)
      .not.toContain('테스트 AED');
    await act(async () => resolveNext([]));
    expect(getSheet().hasLoaded).toBe(true);
    act(() => renderer.unmount());
  });
});
jest.mock('./kakaoMap/components', () => {
  const ReactModule: typeof React = require('react');
  const { View } = require('react-native');
  return {
    KakaoMapHeader: ({ onOpenAedGuide, onSearchQueryChange, onFilterChange }: {
      onOpenAedGuide: () => void;
      onSearchQueryChange: (value: string) => void;
      onFilterChange: (value: 'all' | 'aed' | 'hospital') => void;
    }) =>
      ReactModule.createElement(View, {
        onPress: onOpenAedGuide,
        onSearchQueryChange,
        onFilterChange,
        testID: 'open-aed-guide',
      }),
    AedUsageModal: ({
      onClose,
      visible,
    }: {
      onClose: () => void;
      visible: boolean;
    }) =>
      ReactModule.createElement(View, {
        onClose,
        testID: 'aed-guide',
        visible,
      }),
    MedicalPlacesSheet: ReactModule.forwardRef(
      (props: { floatingControl?: React.ReactNode }, ref) => {
        mockMedicalPlacesSheet(props);
        ReactModule.useImperativeHandle(ref, () => ({
          dismiss: mockDismiss,
          expand: mockExpand,
        }));
        return props.floatingControl;
      },
    ),
  };
});

describe('현재 위치 버튼', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchNearbyAeds).mockResolvedValue([]);
    jest.mocked(fetchNearbyHospitals).mockResolvedValue([]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('지도 화면의 외부 주소 이동을 막고 장소 데이터를 안전하게 삽입한다', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <KakaoMapScreen
          navigation={{ goBack: jest.fn(), setOptions: jest.fn() }}
          route={{ name: 'MapTab' }}
        />,
      );
    });
    const map = renderer!.root.findByProps({ testID: 'map' });
    expect(
      map.props.onShouldStartLoadWithRequest({ url: 'http://localhost/' }),
    ).toBe(true);
    expect(
      map.props.onShouldStartLoadWithRequest({ url: 'https://example.com' }),
    ).toBe(false);
    act(() => renderer!.unmount());

    const html = createKakaoMapHtml(
      'test-key',
      { aed: 'aed.png', hospital: 'hospital.png' },
      [
        {
          address: '서울',
          distanceInMeters: 100,
          id: 'test',
          name: '</script><script>alert(1)</script>',
          type: 'aed',
          typeLabel: 'AED',
          latitude: 37.5,
          longitude: 127,
        },
      ],
    );
    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).toContain('\\u003c/script>');
  });

  it.each(['granted', 'denied'] as const)(
    '%s 권한에 맞게 지도 이동 또는 안내를 처리한다',
    async permission => {
      jest.mocked(requestLocationPermission).mockResolvedValue(permission);
      jest.mocked(Geolocation.getCurrentPosition).mockImplementation(success =>
        success({
          coords: {
            latitude: 37.5,
            longitude: 127,
            altitude: null,
            accuracy: 10,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: 1,
        }),
      );
      const alert = jest.spyOn(Alert, 'alert');
      let renderer: ReactTestRenderer.ReactTestRenderer;
      act(() => {
        renderer = ReactTestRenderer.create(
          <KakaoMapScreen
            navigation={{ goBack: jest.fn(), setOptions: jest.fn() }}
            route={{ name: 'MapTab' }}
          />,
        );
      });
      const getButton = () =>
        renderer!.root.findByProps({ accessibilityLabel: '현재 위치로 이동' });
      expect(getButton().props.disabled).toBe(true);
      act(() =>
        renderer!.root.findByProps({ testID: 'map' }).props.onLoadEnd(),
      );
      await act(async () => {
        await getButton().props.onPress();
      });

      if (permission === 'granted') {
        expect(Geolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({ maximumAge: 0 }),
        );
        expect(mockInjectJavaScript).toHaveBeenCalledWith(
          expect.stringContaining(
            'setCenter(new kakao.maps.LatLng(37.5, 127))',
          ),
        );
        expect(mockDismiss).toHaveBeenCalledTimes(1);
      } else {
        expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
        expect(alert).toHaveBeenCalledWith(
          '위치 권한 필요',
          expect.any(String),
        );
        expect(mockDismiss).not.toHaveBeenCalled();
      }
      expect(getButton().props.disabled).toBe(false);
      act(() => renderer!.unmount());
    },
  );

  it('AED 안내를 여는 동안 하단 탭을 숨긴다', () => {
    const setOptions = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <KakaoMapScreen
          navigation={{ goBack: jest.fn(), setOptions }}
          route={{ name: 'MapTab' }}
        />,
      );
    });
    act(() =>
      renderer!.root.findByProps({ testID: 'open-aed-guide' }).props.onPress(),
    );
    expect(setOptions).toHaveBeenCalledWith({
      tabBarStyle: { display: 'none' },
    });

    act(() =>
      renderer!.root.findByProps({ testID: 'aed-guide' }).props.onClose(),
    );
    expect(setOptions).toHaveBeenLastCalledWith({ tabBarStyle: undefined });
    act(() => renderer!.unmount());
  });

  it('하단 시트의 AED를 누르면 시트는 유지하고 지도를 해당 위치로 이동한다', () => {
    jest.mocked(requestLocationPermission).mockResolvedValue('denied');
    let renderer: ReactTestRenderer.ReactTestRenderer;
    const location: MedicalLocationListItem = {
      address: '인천광역시 계양구 향교로 24',
      distanceInMeters: 160,
      id: 'calculation-office',
      name: '계산1동주민센터',
      type: 'aed',
      typeLabel: 'AED',
    };

    act(() => {
      renderer = ReactTestRenderer.create(
        <KakaoMapScreen
          navigation={{ goBack: jest.fn(), setOptions: jest.fn() }}
          route={{ name: 'MapTab' }}
        />,
      );
    });
    act(() => renderer!.root.findByProps({ testID: 'map' }).props.onLoadEnd());
    mockExpand.mockClear();
    mockInjectJavaScript.mockClear();

    const sheetProps = mockMedicalPlacesSheet.mock.lastCall?.[0] as {
      onLocationPress: (item: MedicalLocationListItem) => void;
    };
    act(() => sheetProps.onLocationPress(location));

    expect(mockExpand).not.toHaveBeenCalled();
    expect(mockMedicalPlacesSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedLocation: location }),
    );
    expect(mockInjectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining(
        'eragsFocusMedicalLocation?.("calculation-office")',
      ),
    );
    act(() => renderer!.unmount());
  });

  it('전체 목록에 가까운 AED가 다섯 곳이어도 병원을 포함한다', async () => {
    jest.useFakeTimers();
    jest.mocked(requestLocationPermission).mockResolvedValue('granted');
    jest.mocked(Geolocation.getCurrentPosition).mockImplementation(success =>
      success({
        coords: {
          latitude: 37.538,
          longitude: 126.722,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: 1,
      }),
    );
    jest.mocked(fetchNearbyAeds).mockResolvedValue([
      {
        name: '계산1동주민센터',
        address: '인천광역시 계양구 향교로 24',
        latitude: 37.5396051913,
        longitude: 126.7213476855,
        phone: '032*******',
        distanceInMeters: 160,
        detailPlaces: ['1층 민원실내'],
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        name: `AED ${index + 2}`,
        address: '인천광역시 계양구 향교로 24',
        latitude: 37.54 + index * 0.001,
        longitude: 126.72,
        phone: '032*******',
        distanceInMeters: 200 + index * 20,
        detailPlaces: [],
      })),
    ]);
    jest.mocked(fetchNearbyHospitals).mockResolvedValue([
      {
        hpid: 'A1403121',
        name: '인천더드림병원',
        address: '인천광역시 계양구 계양대로 123(작전동)',
        distanceInMeters: 400,
        isRealTimeAvailable: false,
        availableBeds: null,
        operatingRoomBeds: null,
        ctAvailable: false,
        mriAvailable: false,
      },
    ]);
    let renderer: ReactTestRenderer.ReactTestRenderer;

    try {
      act(() => {
        renderer = ReactTestRenderer.create(
          <KakaoMapScreen
            navigation={{ goBack: jest.fn(), setOptions: jest.fn() }}
            route={{ name: 'MapTab' }}
          />,
        );
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(fetchNearbyAeds).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 37.538, longitude: 126.722 }),
      );
      expect(fetchNearbyHospitals).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 37.538, longitude: 126.722 }),
      );
      expect(mockMedicalPlacesSheet).toHaveBeenLastCalledWith(
        expect.objectContaining({
          locations: expect.arrayContaining([
            expect.objectContaining({
              name: '인천더드림병원',
              type: 'hospital',
            }),
          ]),
        }),
      );
      const openURL = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
      act(() =>
        renderer!.root.findByProps({ testID: 'map' }).props.onLoadEnd(),
      );
      const sheetProps = mockMedicalPlacesSheet.mock.lastCall?.[0] as {
        locations: MedicalLocationListItem[];
        onDirectionsPress: (location: MedicalLocationListItem) => void;
      };
      act(() => sheetProps.onDirectionsPress(sheetProps.locations[0]));
      expect(openURL).toHaveBeenCalledWith(
        `https://map.kakao.com/link/from/${encodeURIComponent(
          '현재 위치',
        )},37.538,126.722/to/${encodeURIComponent(
          '계산1동주민센터',
        )},37.5396051913,126.7213476855`,
      );

      const hospital = sheetProps.locations.find(
        location => location.type === 'hospital',
      );
      expect(hospital).toBeDefined();
      act(() => sheetProps.onDirectionsPress(hospital!));
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining(
          'eragsRequestMedicalDirections?.("hospital:A1403121")',
        ),
      );
      act(() => {
        renderer!.root.findByProps({ testID: 'map' }).props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              type: 'medical-directions-location',
              locationId: 'hospital:A1403121',
              latitude: 37.54,
              longitude: 126.73,
            }),
          },
        });
      });
      expect(openURL).toHaveBeenLastCalledWith(
        `https://map.kakao.com/link/from/${encodeURIComponent(
          '현재 위치',
        )},37.538,126.722/to/${encodeURIComponent(
          '인천더드림병원',
        )},37.54,126.73`,
      );
      const alert = jest.spyOn(Alert, 'alert');
      act(() => {
        renderer!.root.findByProps({ testID: 'map' }).props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              type: 'medical-directions-unavailable',
              locationId: 'hospital:A1403121',
            }),
          },
        });
      });
      expect(alert).toHaveBeenCalledWith(
        '길찾기 불가',
        '장소 위치를 찾지 못했습니다.',
      );
      expect(
        renderer!.root.findByProps({ testID: 'map' }).props.source.html,
      ).toContain('계산1동주민센터');
      expect(
        renderer!.root.findByProps({ testID: 'map' }).props.source.html,
      ).toContain('인천더드림병원');
      expect(
        renderer!.root.findByProps({ testID: 'map' }).props.source.html,
      ).toContain('geocoder.addressSearch(searchAddress');
      expect(
        renderer!.root.findByProps({ testID: 'map' }).props.source.html,
      ).toContain('window.eragsRequestMedicalDirections =');
      const html = renderer!.root.findByProps({ testID: 'map' }).props.source
        .html as string;
      const mapScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
      expect(mapScript).toBeDefined();
      expect(() => new Script(mapScript ?? '')).not.toThrow();
      expect(
        renderer!.root.findByProps({ testID: 'map' }).props.source.html,
      ).not.toContain('임시 AED 위치');
      act(() => renderer!.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  it('AED 마커를 누르면 선택한 장소를 하단 시트에 표시한다', async () => {
    jest.useFakeTimers();
    jest.mocked(requestLocationPermission).mockResolvedValue('granted');
    jest.mocked(Geolocation.getCurrentPosition).mockImplementation(success =>
      success({
        coords: {
          latitude: 37.538,
          longitude: 126.722,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: 1,
      }),
    );
    jest.mocked(fetchNearbyAeds).mockResolvedValue([
      {
        name: '계산1동주민센터',
        address: '인천광역시 계양구 향교로 24',
        latitude: 37.5396051913,
        longitude: 126.7213476855,
        phone: '032*******',
        distanceInMeters: 160,
        detailPlaces: ['1층 민원실내'],
      },
    ]);
    let renderer: ReactTestRenderer.ReactTestRenderer;

    try {
      act(() => {
        renderer = ReactTestRenderer.create(
          <KakaoMapScreen
            navigation={{ goBack: jest.fn(), setOptions: jest.fn() }}
            route={{ name: 'MapTab' }}
          />,
        );
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(300);
      });
      act(() => {
        renderer!.root.findByProps({ testID: 'map' }).props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              locationId: '37.5396051913:126.7213476855:계산1동주민센터:0',
              type: 'medical-location-pressed',
            }),
          },
        });
      });

      expect(mockExpand).toHaveBeenCalledTimes(1);
      expect(mockMedicalPlacesSheet).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedLocation: expect.objectContaining({
            detailPlaces: ['1층 민원실내'],
            name: '계산1동주민센터',
            phone: '032*******',
          }),
        }),
      );
      act(() => renderer!.unmount());
    } finally {
      jest.useRealTimers();
    }
  });
});
