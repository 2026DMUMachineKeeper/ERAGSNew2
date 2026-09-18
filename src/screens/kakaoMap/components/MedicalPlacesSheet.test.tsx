import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import { MedicalPlacesSheet } from './MedicalPlacesSheet';

const event = {} as GestureResponderEvent;
const gesture = (dy: number): PanResponderGestureState => ({
  stateID: 1,
  moveX: 0,
  moveY: dy,
  x0: 0,
  y0: 0,
  dx: 0,
  dy,
  vx: 0,
  vy: 0,
  numberActiveTouches: 1,
  _accountsForMovesUpTo: 0,
});

describe('MedicalPlacesSheet 스냅', () => {
  afterEach(() => jest.restoreAllMocks());

  it('안드로이드 목록은 기본 스크롤을 허용하고 AED 선택을 유지한다', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onLocationPress = jest.fn();
    const location = {
      id: 'aed-1',
      type: 'aed' as const,
      typeLabel: 'AED',
      name: 'AED 설치 장소',
      address: '서울특별시',
      distanceInMeters: 100,
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={[location]}
          mapHeight={800}
          onDirectionsPress={jest.fn()}
          onLocationPress={onLocationPress}
          searchQuery=""
        />,
      );
    });
    const list = renderer!.root.findByType(ScrollView);
    expect(list.props.scrollEnabled).toBe(true);
    expect(list.props.style).toContainEqual({ flexGrow: 0, height: 308 });
    expect(list.props.onMoveShouldSetResponderCapture).toBeUndefined();
    expect(list.props.onResponderMove).toBeUndefined();
    act(() => {
      renderer!.root
        .findByProps({
          accessibilityLabel: 'AED 설치 장소 위치 보기',
        })
        .props.onPress();
    });
    expect(onLocationPress).toHaveBeenCalledWith(location);
    act(() => renderer!.unmount());
  });

  it('중간에서 위아래로 반복 드래그해도 매번 정확히 50%로 돌아온다', () => {
    const responder = jest.spyOn(PanResponder, 'create');
    const spring = jest.spyOn(Animated, 'spring');
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={[]}
          mapHeight={800}
          onDirectionsPress={jest.fn()}
          onLocationPress={jest.fn()}
          searchQuery=""
        />,
      );
    });
    const handlers = responder.mock.calls[0][0];

    for (const dy of [-80, 80, 7]) {
      act(() => {
        handlers.onPanResponderGrant?.(event, gesture(0));
        handlers.onPanResponderMove?.(event, gesture(dy));
        handlers.onPanResponderRelease?.(event, gesture(dy));
      });
      expect(spring).toHaveBeenLastCalledWith(
        expect.any(Animated.Value),
        expect.objectContaining({ toValue: 400, useNativeDriver: false }),
      );
    }
    expect(spring).toHaveBeenCalledTimes(3);
    act(() => renderer!.unmount());
  });

  it('제스처가 취소되어도 중간 위치로 복귀한다', () => {
    const responder = jest.spyOn(PanResponder, 'create');
    const spring = jest.spyOn(Animated, 'spring');
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={[]}
          mapHeight={600}
          onDirectionsPress={jest.fn()}
          onLocationPress={jest.fn()}
          searchQuery=""
        />,
      );
    });
    const handlers = responder.mock.calls[0][0];
    act(() => {
      handlers.onPanResponderGrant?.(event, gesture(0));
      handlers.onPanResponderMove?.(event, gesture(100));
      handlers.onPanResponderTerminate?.(event, gesture(100));
    });
    expect(spring).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 300 }),
    );
    act(() => renderer!.unmount());
  });

  it('더보기로 목록을 펼치고 접는다', () => {
    const spring = jest.spyOn(Animated, 'spring');
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={[]}
          mapHeight={800}
          onDirectionsPress={jest.fn()}
          onLocationPress={jest.fn()}
          searchQuery=""
        />,
      );
    });

    act(() => {
      renderer!.root
        .findByProps({ accessibilityLabel: '장소 목록 더보기' })
        .props.onPress();
    });
    expect(spring).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 0 }),
    );
    act(() => {
      renderer!.root
        .findByProps({ accessibilityLabel: '장소 목록 접기' })
        .props.onPress();
    });
    expect(spring).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({ toValue: 400 }),
    );
    act(() => renderer!.unmount());
  });

  it('선택한 AED의 상세 정보는 해당 항목 바로 아래에 표시한다', () => {
    const onDirectionsPress = jest.fn();
    const locations = [
      {
        address: '서울특별시 관악구 조원로 25',
        detailPlaces: ['2단지 지하1층 방재실앞'],
        distanceInMeters: 230,
        id: 'hills-new-foret',
        name: '힐스테이트뉴포레아파트',
        phone: '831****',
        type: 'aed' as const,
        typeLabel: 'AED',
      },
      {
        address: '서울특별시 관악구 조원로 25',
        distanceInMeters: 250,
        id: 'sports-center',
        name: '조원생활스포츠센터',
        type: 'aed' as const,
        typeLabel: 'AED',
      },
    ];
    let renderer: ReactTestRenderer.ReactTestRenderer;

    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={locations}
          mapHeight={800}
          onDirectionsPress={onDirectionsPress}
          onLocationPress={jest.fn()}
          searchQuery=""
          selectedLocation={locations[0]}
        />,
      );
    });

    const renderedOutput = JSON.stringify(renderer!.toJSON());
    expect(renderer!.root.findAllByType(ScrollView)).toHaveLength(1);
    expect(
      renderer!.root
        .findAllByType(Text)
        .filter(node => node.props.children === locations[0].name),
    ).toHaveLength(1);
    expect(renderedOutput).toContain('2단지 지하1층 방재실앞');
    expect(renderedOutput).not.toContain('연락처');
    expect(renderedOutput).not.toContain('831****');
    act(() => {
      renderer!.root
        .findByProps({ accessibilityLabel: '힐스테이트뉴포레아파트 길찾기' })
        .props.onPress();
    });
    expect(onDirectionsPress).toHaveBeenCalledWith(locations[0]);
    act(() => renderer!.unmount());
  });

  it('병원 선택 시 실시간 병상과 장비 정보를 표시한다', () => {
    const location = {
      address: '인천광역시 계양구 장제로 722',
      distanceInMeters: 1250,
      id: 'hospital:A1400014',
      name: '한림병원',
      type: 'hospital' as const,
      typeLabel: '병원',
      hospitalDetails: {
        isRealTimeAvailable: true,
        availableBeds: 14,
        operatingRoomBeds: 6,
        ctAvailable: true,
        mriAvailable: false,
      },
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={[location]}
          mapHeight={800}
          onDirectionsPress={jest.fn()}
          onLocationPress={jest.fn()}
          searchQuery=""
          selectedLocation={location}
        />,
      );
    });

    const output = JSON.stringify(renderer!.toJSON());
    expect(output).toContain('실시간 병상 정보');
    expect(output).toContain('가용 병상');
    expect(output).toContain('14');
    expect(output).toContain('수술실 병상');
    expect(output).toContain('CT');
    expect(output).toContain('가능');
    expect(output).toContain('MRI');
    expect(output).toContain('불가');
    act(() => renderer!.unmount());
  });

  it('실시간 정보가 없는 병원은 병상과 장비 상태를 정보 없음으로 표시한다', () => {
    const location = {
      address: '인천광역시 계양구 계양대로 123',
      distanceInMeters: 400,
      id: 'hospital:A1403121',
      name: '인천더드림병원',
      type: 'hospital' as const,
      typeLabel: '병원',
      hospitalDetails: {
        isRealTimeAvailable: false,
        availableBeds: null,
        operatingRoomBeds: null,
        ctAvailable: false,
        mriAvailable: false,
      },
    };
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={[location]}
          mapHeight={800}
          onDirectionsPress={jest.fn()}
          onLocationPress={jest.fn()}
          searchQuery=""
          selectedLocation={location}
        />,
      );
    });

    const output = JSON.stringify(renderer!.toJSON());
    expect(output).toContain('실시간 병상 정보 미제공');
    expect(output.match(/정보 없음/g)).toHaveLength(4);
    act(() => renderer!.unmount());
  });
});
