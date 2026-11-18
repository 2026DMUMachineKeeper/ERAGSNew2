import React from 'react';
import { processColor, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { WasteGuideScreen } from '@/screens/WasteGuideScreen';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideResponse, EmergencyWasteGuideItem } from '@/types';
import tailwindConfig from '../../tailwind.config';

jest.mock('@/assets', () => ({ BackIcon: (): null => null }));

const GUIDE: EmergencyGuideResponse = {
  sessionId: 'session-1',
  requestId: 'request-1',
  generatedAt: '2026-09-03T00:00:00.000Z',
  status: 'COMPLETE',
  patientContext: null,
  evidence: null,
  assessment: null,
  treatment: { routeCode: null, modelVersion: null, steps: [] },
  error: null,
};

describe('WasteGuideScreen', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  const navigation = { goBack: jest.fn() };

  afterEach(async (): Promise<void> => {
    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
    });
    renderer = undefined;
    useEmergencyGuideStore.getState().resetGuide();
    jest.clearAllMocks();
  });

  it.each<EmergencyWasteGuideItem>([
    {
      itemName: '거즈',
      wasteCategory: 'GENERAL',
      displayTitle: '일반 배출',
      disposalMethod: '일반 쓰레기로 배출하세요.',
      dangerLevel: 'LOW',
    },
    {
      itemName: '소독 핀셋',
      wasteCategory: 'REUSABLE',
      displayTitle: '소독 후 보관',
      disposalMethod: '사용 후 알코올이나 소독약으로 소독한 뒤 구급함에 보관하세요.',
      dangerLevel: 'LOW',
    },
    {
      itemName: '후시딘 연고',
      wasteCategory: 'KEEP',
      displayTitle: '잔량 보관',
      disposalMethod: '아직 재고(1개)가 남아있습니다. 뚜껑을 잘 닫아 보관하세요.',
      dangerLevel: 'LOW',
    },
    {
      itemName: '다 쓴 포비돈 소독약',
      wasteCategory: 'PHARMACEUTICAL',
      displayTitle: '수거함 배출',
      disposalMethod: '약국, 보건소의 폐의약품 수거함에 배출하세요.',
      dangerLevel: 'LOW',
    },
    {
      itemName: '주사바늘',
      wasteCategory: 'SHARPS',
      displayTitle: '위험 배출',
      disposalMethod: '단단한 통에 넣어 배출하세요.',
      dangerLevel: 'HIGH',
    },
  ])('$itemName의 서버 제목·상세 안내와 위험도 색상을 표시한다', async item => {
    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: GUIDE, source: 'manual' });
    store.setWasteGuide([item]);

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <WasteGuideScreen
          navigation={navigation as never}
          route={{} as never}
        />,
      );
    });

    if (!renderer) {
      throw new Error('폐기물 안내 화면이 렌더링되지 않았습니다.');
    }

    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain(item.itemName);
    expect(rendered).toContain(item.displayTitle);
    expect(rendered).toContain(item.disposalMethod);
    expect(rendered).not.toContain('분류:');
    const badge = renderer.root.findAllByType(Text)
      .find(node => node.props.children === item.displayTitle);
    expect(badge).toBeDefined();
    expect(processColor(StyleSheet.flatten(badge?.props.style)?.color)).toBe(
      processColor(item.dangerLevel === 'HIGH'
        ? tailwindConfig.colors.red
        : tailwindConfig.colors.textDim),
    );
    if (item.wasteCategory !== 'GENERAL') {
      expect(rendered).not.toContain('일반 배출');
    }
  });

  it('기존 뒤로가기 아이콘 버튼으로 이전 화면으로 이동한다', async (): Promise<void> => {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <WasteGuideScreen
          navigation={navigation as never}
          route={{} as never}
        />,
      );
    });

    if (!renderer) {
      throw new Error('폐기물 안내 화면이 렌더링되지 않았습니다.');
    }

    const backButton = renderer.root.findByProps({
      accessibilityLabel: '뒤로 가기',
    });

    backButton.props.onPress();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
