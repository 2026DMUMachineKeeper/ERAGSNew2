import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { WasteGuideScreen } from '@/screens/WasteGuideScreen';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideResponse } from '@/types';

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

  it('폐기물 안내 항목과 배출 방법을 표시하고 분류는 표시하지 않는다', async (): Promise<void> => {
    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: GUIDE, source: 'manual' });
    store.setWasteGuide([
      {
        itemName: '거즈',
        wasteCategory: 'GENERAL',
        disposalMethod: '일반 쓰레기로 배출하세요.',
        dangerLevel: 'LOW',
      },
    ]);

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
    expect(rendered).toContain('거즈');
    expect(rendered).toContain('일반 쓰레기로 배출하세요.');
    expect(rendered).not.toContain('분류:');
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
