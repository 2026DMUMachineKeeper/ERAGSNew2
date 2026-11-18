import React from 'react';
import {
  Alert,
  PermissionsAndroid,
  Text,
  TouchableOpacity,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import * as recording from '@/services/audioRecording.service';
import {
  canContinueQuestionnaireStep,
  getQuestionnaireSteps,
} from '@/utils/compoundQuestionnaire';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import requests from '../../testSupport/compoundCRequests.json';
import { qa19State } from '../../testSupport/qa19';
import { CompoundInjuryPanel } from '@/screens/firstAidDetail/components/CompoundInjuryPanel';
import type { CompoundGuideRequest, QuestionnaireState } from '@/types';

jest.mock('@/assets', () => ({ BackIcon: () => null }));
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

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
      if (name === 'burn') {
        const toggle = renderer!.root.findByProps({ testID: 'burn-additional-toggle' });
        expect(toggle.props.accessibilityState.expanded).toBe(false);
        expect(renderer!.root.findAllByProps({ testID: 'fact-BURN_MEDICINES_AVAILABLE-NO' })).toHaveLength(0);
        await act(async () => toggle.props.onPress());
      }
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
        expect(ids).toContain('fact-BURN_CAN_REMAIN_CLEAN-YES');
        expect(text).toContain('열이나 뜨거운 물체로 생긴 화상인가요?');
      } else {
        expect(ids).toContain('fact-FIXATION_TOOLS_AVAILABLE-YES');
        expect(ids).toContain('fact-SEVERE_SWELLING-YES');
        expect(ids).toContain('fact-COOLING_TOOL_AVAILABLE-YES');
      }
    } finally {
      await act(async () => renderer?.unmount());
    }
  },
);

it('사진은 현재 손상에만 붙이고 삭제 후 다음 사진의 업로드 순서를 갱신한다', async () => {
  const initial = qa19State(
    Object.values(requests)[0] as unknown as CompoundGuideRequest,
  );
  jest
    .mocked(launchCamera)
    .mockResolvedValue({
      assets: [
        { uri: 'file:///first.jpg', fileName: 'first.jpg', type: 'image/jpeg' },
      ],
    });
  let renderer!: ReactTestRenderer;
  const button = (label: string) =>
    renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === label)!;
  try {
    await act(async () => {
      renderer = create(<Harness initial={initial} />);
    });
    await act(async () => button('이 손상 사진 촬영').props.onPress());
    const state = renderer.root.findByType(CompoundInjuryPanel).props
      .state as QuestionnaireState;
    expect(state.compoundDraft.injuries[0].images).toEqual([
      { uri: 'file:///first.jpg', name: 'first.jpg', type: 'image/jpeg' },
    ]);
    expect(state.compoundDraft.injuries[1].images).toBeUndefined();
    await act(async () => button('이 손상 사진 1 삭제').props.onPress());
    const changed = renderer.root.findByType(CompoundInjuryPanel).props
      .state as QuestionnaireState;
    expect(changed.compoundDraft.injuries[0].images).toEqual([]);
  } finally {
    await act(async () => renderer?.unmount());
  }
});

it('음성 녹음 중 다음 진행을 막고 완료한 음성만 현재 손상에 첨부한다', async () => {
  const initial = qa19State(
    Object.values(requests)[0] as unknown as CompoundGuideRequest,
  );
  jest.spyOn(recording, 'startAudioRecording').mockResolvedValue();
  jest
    .spyOn(recording, 'stopAudioRecording')
    .mockResolvedValue({
      uri: 'file:///voice.m4a',
      name: 'voice.m4a',
      type: 'audio/mp4',
    });
  let renderer!: ReactTestRenderer;
  const button = (label: string) =>
    renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === label)!;
  try {
    await act(async () => {
      renderer = create(<Harness initial={initial} />);
    });
    await act(async () => button('이 손상 음성 녹음').props.onPress());
    const state = renderer.root.findByType(CompoundInjuryPanel).props
      .state as QuestionnaireState;
    const step = getQuestionnaireSteps(
      'burn',
      state.questionAnswers,
      state.compoundDraft,
    ).find(
      q =>
        q.kind === 'injury' &&
        q.injuryId === state.compoundDraft.injuries[0].injuryId,
    )!;
    expect(canContinueQuestionnaireStep(step, state)).toBe(false);
    await act(async () => button('이 손상 녹음 완료').props.onPress());
    const changed = renderer.root.findByType(CompoundInjuryPanel).props
      .state as QuestionnaireState;
    expect(changed.compoundDraft.injuries[0].audio?.uri).toBe(
      'file:///voice.m4a',
    );
    expect(changed.compoundDraft.injuries[1].audio).toBeUndefined();
    expect(canContinueQuestionnaireStep(step, changed)).toBe(true);
    expect(recording.stopAudioRecording).toHaveBeenCalledTimes(1);
    await act(async () => button('이 손상 음성 삭제').props.onPress());
    expect(button('이 손상 음성 녹음')).toBeDefined();
  } finally {
    await act(async () => renderer?.unmount());
  }
});

it('녹음 시작을 기다리는 중 화면을 벗어나면 음성을 첨부하지 않고 녹음을 종료한다', async () => {
  const initial = qa19State(
    Object.values(requests)[0] as unknown as CompoundGuideRequest,
  );
  let resolve!: () => void;
  jest.spyOn(recording, 'startAudioRecording').mockImplementation(
    () =>
      new Promise<void>(done => {
        resolve = done;
      }),
  );
  const stop = jest
    .spyOn(recording, 'stopAudioRecording')
    .mockResolvedValue({
      uri: 'file:///voice.m4a',
      name: 'voice.m4a',
      type: 'audio/mp4',
    });
  let renderer!: ReactTestRenderer;
  let pending!: Promise<void>;
  await act(async () => {
    renderer = create(<Harness initial={initial} />);
  });
  await act(async () => {
    pending = renderer.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === '이 손상 음성 녹음')!
      .props.onPress();
  });
  await act(async () => renderer.unmount());
  await act(async () => {
    resolve();
    await pending;
  });
  expect(stop).toHaveBeenCalledTimes(1);
});
