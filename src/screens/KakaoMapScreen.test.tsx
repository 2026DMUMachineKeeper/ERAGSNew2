import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Geolocation from '@react-native-community/geolocation';

import { requestLocationPermission } from '@/services';
import { KakaoMapScreen } from './KakaoMapScreen';

const mockInjectJavaScript = jest.fn();
const mockDismiss = jest.fn();
jest.mock('react-native-config', () => ({ KAKAO_MAP_APP_KEY: 'test-key' }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => false }));
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));
jest.mock('@/services', () => ({ requestLocationPermission: jest.fn() }));
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
jest.mock('./kakaoMap/components', () => {
  const ReactModule: typeof React = require('react');
  const { View } = require('react-native');
  return {
    KakaoMapHeader: ({ onOpenAedGuide }: { onOpenAedGuide: () => void }) =>
      ReactModule.createElement(View, {
        onPress: onOpenAedGuide,
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
    MedicalPlacesSheet: ReactModule.forwardRef((_props, ref) => {
      ReactModule.useImperativeHandle(ref, () => ({ dismiss: mockDismiss }));
      return null;
    }),
  };
});

describe('현재 위치 버튼', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

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
});
