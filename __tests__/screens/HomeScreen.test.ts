import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { HomeScreen } from '@/screens/HomeScreen';
import { fetchMedicineAlerts } from '@/services/medicineApi';

jest.mock('@react-navigation/native', () => ({ useIsFocused: jest.fn() }));
jest.mock('@/services/medicineApi', () => ({ fetchMedicineAlerts: jest.fn() }));
jest.mock('@/assets/icons', () => ({
  CameraIcon: (): null => null,
  EragsLogo: (): null => null,
  FirstAidGuideIcon: (): null => null,
  MainIcon: (): null => null,
  MicIcon: (): null => null,
}));
jest.mock('@/screens/home/useHomeEmergencyActions', () => ({
  useHomeEmergencyActions: () => ({
    isListening: false,
    isVisionUploading: false,
    isVoiceProcessing: false,
    visionStatus: null,
    voiceStatus: null,
    handleEmergencyReportPress: jest.fn(),
    handlePhotoPress: jest.fn(),
    handleVoicePress: jest.fn(),
  }),
}));

it('홈 알림 버튼에서 약품 경고를 보고 상세 화면으로 이동한다', async (): Promise<void> => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const navigate = jest.fn();
  jest.mocked(useIsFocused).mockReturnValue(true);
  jest.mocked(fetchMedicineAlerts).mockResolvedValue([
    {
      id: '1',
      name: '멸균 거즈',
      info: '',
      qty: 2,
      threshold: 3,
      barcode: null,
      usage: '',
      efficacy: '',
      expireDate: '2026-10-15',
      isLowStock: true,
      isExpiringSoon: true,
      isExpired: false,
    },
  ]);
  let renderer: ReactTestRenderer | undefined;

  try {
    await act(async (): Promise<void> => {
      renderer = create(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(HomeScreen, {
            navigation: { getParent: jest.fn(), navigate },
          } as unknown as React.ComponentProps<typeof HomeScreen>),
        ),
      );
    });
    await act(async (): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    const alertButton = renderer?.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === '약품 알림 1개');
    expect(alertButton).toBeDefined();
    await act(async (): Promise<void> => alertButton?.props.onPress());

    const displayedText = renderer?.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .join(' ');
    expect(displayedText).toContain('유통기한 임박');
    expect(displayedText).toContain('재고 부족');

    let medicineAlert =
      renderer?.root
        .findAllByType(Text)
        .find(node => node.props.children === '멸균 거즈') ?? null;
    while (medicineAlert && typeof medicineAlert.props.onPress !== 'function') {
      medicineAlert = medicineAlert.parent;
    }
    await act(async (): Promise<void> => medicineAlert?.props.onPress());
    expect(navigate).toHaveBeenNthCalledWith(1, 'MedicinesTab');
    expect(navigate).toHaveBeenNthCalledWith(2, 'MedicineDetail', {
      medicineId: '1',
    });
  } finally {
    await act(async (): Promise<void> => renderer?.unmount());
    queryClient.clear();
  }
}, 20_000);
