import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  Animated,
  PanResponder,
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

  it('중간에서 위아래로 반복 드래그해도 매번 정확히 50%로 돌아온다', () => {
    const responder = jest.spyOn(PanResponder, 'create');
    const spring = jest.spyOn(Animated, 'spring');
    let renderer: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MedicalPlacesSheet
          locations={[]}
          mapHeight={800}
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
        expect.objectContaining({ toValue: 400, useNativeDriver: true }),
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
});
