import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Text,
  TouchableOpacity,
} from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FirstAidGuideIcon } from '@/assets';
import { GuideHeader } from '@/components/EmergencyGuide/GuideHeader';
import { GuideNextButton } from '@/components/EmergencyGuide/GuideNextButton';
import { StepDetail } from '@/components/EmergencyGuide/StepDetail';
import { CompoundGuideStatus } from '@/screens/emergencyGuide/components/CompoundGuideStatus';
import {
  HELD_COMPOUND_SNAPSHOT,
  PARTIAL_FINISHED_SNAPSHOT,
} from '../../testSupport/compoundGuide';
import type { CompoundGuideResult } from '@/types';

jest.mock('@/assets', () => ({
  BackIcon: () => null,
  FirstAidGuideIcon: () => null,
}));

describe('복합 안내 보류 화면', () => {
  let renderer: ReactTestRenderer;
  const handleNewRequest = jest.fn();
  const handleClose = jest.fn();
  const handleRefresh = jest.fn();
  const mount = async (
    props: Partial<React.ComponentProps<typeof CompoundGuideStatus>> = {},
  ): Promise<void> => {
    await act(async () => {
      renderer = create(
        <CompoundGuideStatus
          compound={HELD_COMPOUND_SNAPSHOT.compound}
          onNewRequest={handleNewRequest}
          onClose={handleClose}
          onRefresh={handleRefresh}
          {...props}
        />,
      );
    });
  };
  const text = (): string =>
    JSON.stringify(
      renderer.root.findAllByType(Text).map(node => node.props.children),
    );
  const press = async (label: string): Promise<void> => {
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === label);
    expect(button).toBeDefined();
    await act(async () => button!.props.onPress());
  };
  afterEach(async () => {
    await act(async () => renderer?.unmount());
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('단계·진행률·빈 처치 이미지 대신 상태 일러스트와 손상별 사유를 보여준다', async () => {
    await mount();
    expect(renderer.root.findAllByType(FirstAidGuideIcon)).toHaveLength(1);
    expect(renderer.root.findAllByType(GuideHeader)).toHaveLength(0);
    expect(renderer.root.findAllByType(StepDetail)).toHaveLength(0);
    expect(renderer.root.findAllByType(GuideNextButton)).toHaveLength(0);
    expect(text()).toContain('처치 안내를 잠시 보류했어요');
    expect(text()).toContain('출혈');
    expect(text()).toContain('화상');
    expect(text()).toContain('안내를 보류한 이유');
    expect(text()).not.toContain('COMPOUND_DISABLED');
    await press('새 문진 시작');
    await press('저장된 복합 가이드 다시 조회');
    await press('닫기');
    expect(handleNewRequest).toHaveBeenCalledTimes(1);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('추가 질문은 해당 손상에 표시하고 알 수 없는 코드가 화면에 나오지 않는다', async () => {
    const base = HELD_COMPOUND_SNAPSHOT.compound;
    const compound: CompoundGuideResult = {
      ...base,
      blockedReasons: ['ASSESSMENT_INCOMPLETE', 'UNRECOGNIZED_CODE'],
      injuries: base.injuries.map((injury, index) =>
        index
          ? injury
          : {
              ...injury,
              assessment: {
                ...injury.assessment,
                missingInputs: ['burnDegree', 'INTERNAL_UNKNOWN'],
                display: {
                  missingInputs: [
                    {
                      code: 'burnDegree',
                      label: '물집이 생겼는지 확인해 주세요.',
                    },
                  ],
                },
              },
            },
      ),
    };
    await mount({ compound });
    expect(text()).toContain('물집이 생겼는지 확인해 주세요.');
    expect(text()).toContain('추가 확인 필요');
    expect(text()).not.toContain('INTERNAL_UNKNOWN');
    expect(text()).not.toContain('UNRECOGNIZED_CODE');
  });

  it('서버가 119를 요구한 경우에만 전화 동작을 제공한다', async () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await mount({
      compound: { ...HELD_COMPOUND_SNAPSHOT.compound, call119Required: true },
    });
    await press('119 전화');
    expect(openUrl).toHaveBeenCalledWith('tel:119');
    await act(async () => renderer.unmount());
    await mount();
    expect(text()).not.toContain('119 신고가 필요합니다.');
    expect(
      renderer.root
        .findAllByType(TouchableOpacity)
        .some(node => node.props.accessibilityLabel === '119 전화'),
    ).toBe(false);
  });

  it('최초 로딩 중에는 보류나 완료 결과를 먼저 보여주지 않는다', async () => {
    await mount({ isLoading: true });
    expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(text()).toContain('손상 정보를 확인하고 있어요');
    expect(text()).not.toContain('처치 안내를 잠시 보류했어요');
    expect(text()).not.toContain('안내를 보류한 이유');
    expect(text()).not.toContain('새 문진 시작');
    expect(text()).not.toContain('전체 처치 완료');
  });

  it('통신 오류와 부분 보류를 구분하고 미확인 기록이 있으면 새 문진을 막는다', async () => {
    await mount({
      compound: PARTIAL_FINISHED_SNAPSHOT.compound,
      progress: PARTIAL_FINISHED_SNAPSHOT.progress,
      canStartNewRequest: false,
      errorMessage: '요청 시간이 초과되었습니다.',
    });
    expect(text()).toContain('안내를 불러오지 못했어요');
    expect(text()).toContain('요청 시간이 초과되었습니다.');
    expect(text()).toContain('손상 안내 보류');
    expect(text()).toContain('처치 기록 완료');
    expect(text()).not.toContain('전체 처치 완료');
    expect(text()).not.toContain('새 문진 시작');
    await press('저장된 복합 가이드 다시 조회');
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});
