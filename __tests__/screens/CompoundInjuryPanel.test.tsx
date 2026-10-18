import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import requests from '../../testSupport/compoundCRequests.json';
import { qa19State } from '../../testSupport/qa19';
import { CompoundInjuryPanel } from '@/screens/firstAidDetail/components/CompoundInjuryPanel';
import type { CompoundGuideRequest, QuestionnaireState } from '@/types';

jest.mock('@/assets', () => ({ BackIcon: () => null }));

const Harness = ({ initial }: { initial: QuestionnaireState }) => {
  const [state, setState] = React.useState(initial);
  return (
    <CompoundInjuryPanel
      state={state}
      injuryId={state.compoundDraft.injuries[0].injuryId}
      onChange={setState}
    />
  );
};

it.each(Object.entries(requests))(
  '%s: 두 번째 손상 문진 전에도 자료의 질문을 표시하고 선택을 유지한다',
  async (name, raw) => {
    const initial = qa19State(raw as unknown as CompoundGuideRequest);
    initial.compoundDraft = {
      ...initial.compoundDraft,
      injuries: initial.compoundDraft.injuries.map((injury, index) => ({
        ...injury,
        answers: index ? {} : injury.answers,
        qaFacts: {},
      })),
    };
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(<Harness initial={initial} />);
      });
      const target =
        name === 'burn' ? 'BURN_MEDICINES_AVAILABLE' : 'SPLINT_AVAILABLE';
      const no = renderer!.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.testID === `fact-${target}-NO`);
      expect(no).toBeDefined();
      await act(async () => no!.props.onPress());
      const selected = renderer!.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.testID === `fact-${target}-NO`);
      expect(selected!.props.accessibilityState.selected).toBe(true);
      const ids = renderer!.root
        .findAllByType(TouchableOpacity)
        .map(node => node.props.testID);
      const text = renderer!.root
        .findAllByType(Text)
        .map(node => node.props.children);
      if (name === 'burn') {
        expect(ids).toContain('fact-FLOWING_COOL_WATER_READY-YES');
        expect(ids).not.toContain('fact-BURN_CAN_REMAIN_CLEAN-YES');
        expect(text).toContain('열이나 뜨거운 물체로 생긴 화상인가요?');
      } else {
        expect(ids).toContain('fact-FIXATION_TOOLS_AVAILABLE-YES');
        expect(ids).not.toContain('fact-SEVERE_SWELLING-YES');
        expect(ids).not.toContain('fact-COOLING_TOOL_AVAILABLE-YES');
      }
    } finally {
      await act(async () => renderer?.unmount());
    }
  },
);
