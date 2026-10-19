import React from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import {
  startAudioRecording,
  stopAudioRecording,
} from '@/services/audioRecording.service';
import type { CompoundQuestionnaireInjury, QuestionnaireState } from '@/types';

export const useCompoundInjuryEvidence = (
  injury: CompoundQuestionnaireInjury | undefined,
  state: QuestionnaireState,
  onChange: React.Dispatch<React.SetStateAction<QuestionnaireState>>,
) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);
  const isBusyRef = React.useRef(false);
  const isRecordingRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const currentRef = React.useRef({ injury, state });
  currentRef.current = { injury, state };

  const handlePatch = React.useCallback(
    (
      change: Partial<CompoundQuestionnaireInjury>,
      target: CompoundQuestionnaireInjury,
    ): void => {
      onChange(current => ({
        ...current,
        compoundDraft: {
          ...current.compoundDraft,
          injuries: current.compoundDraft.injuries.map(item =>
            item.injuryId === target.injuryId &&
            item.categoryCode === target.categoryCode
              ? { ...item, ...change }
              : item,
          ),
        },
      }));
    },
    [onChange],
  );

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const target = currentRef.current.injury;
      if (target) handlePatch({ isEvidenceBusy: false }, target);
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        void stopAudioRecording().catch(() => {});
      }
    };
  }, [handlePatch]);

  const handlePermission = async (
    permission: typeof PermissionsAndroid.PERMISSIONS.CAMERA,
    label: string,
  ): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(permission, {
      title: `${label} 권한 필요`,
      message: `손상 자료를 첨부하려면 ${label} 권한이 필요합니다.`,
      buttonPositive: '허용',
      buttonNegative: '취소',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };
  const handleBusy = (
    value: boolean,
    target: CompoundQuestionnaireInjury,
  ): void => {
    isBusyRef.current = value;
    if (isMountedRef.current) {
      setIsBusy(value);
      handlePatch({ isEvidenceBusy: value }, target);
    }
  };
  const handleAddPhoto = async (): Promise<void> => {
    const target = currentRef.current.injury;
    if (!target || isBusyRef.current) return;
    if (
      currentRef.current.state.compoundDraft.injuries.reduce(
        (total, item) => total + (item.images?.length ?? 0),
        0,
      ) >= 5
    ) {
      Alert.alert('사진 첨부', '두 손상에 합계 5장까지 첨부할 수 있습니다.');
      return;
    }
    handleBusy(true, target);
    try {
      if (
        !(await handlePermission(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          '카메라',
        )) ||
        !isMountedRef.current
      )
        return;
      const result = await launchCamera({
        mediaType: 'photo',
        saveToPhotos: false,
        quality: 0.9,
      });
      if (result.didCancel || !isMountedRef.current) return;
      const asset = result.assets?.[0];
      if (result.errorCode || !asset?.uri) {
        throw new Error(result.errorMessage ?? '사진을 가져오지 못했습니다.');
      }
      handlePatch(
        {
          images: [
            ...(currentRef.current.injury?.images ?? []),
            {
              uri: asset.uri,
              name: asset.fileName ?? `injury-${Date.now()}.jpg`,
              type: asset.type ?? 'image/jpeg',
              ...(typeof asset.fileSize === 'number'
                ? { size: asset.fileSize }
                : {}),
            },
          ],
        },
        target,
      );
    } catch (error) {
      if (isMountedRef.current)
        Alert.alert(
          '사진 첨부 실패',
          error instanceof Error ? error.message : '사진을 다시 확인해 주세요.',
        );
    } finally {
      handleBusy(false, target);
    }
  };
  const handleAudio = async (): Promise<void> => {
    const target = currentRef.current.injury;
    if (!target) return;
    if (isRecordingRef.current) {
      // 연속 탭과 화면 이탈 시 동일 녹음을 두 번 종료하지 않습니다.
      isRecordingRef.current = false;
      setIsRecording(false);
      try {
        const audio = await stopAudioRecording();
        if (isMountedRef.current) handlePatch({ audio }, target);
      } catch (error) {
        if (isMountedRef.current)
          Alert.alert(
            '녹음 저장 실패',
            error instanceof Error ? error.message : '다시 녹음해 주세요.',
          );
      } finally {
        handleBusy(false, target);
      }
      return;
    }
    if (
      isBusyRef.current ||
      currentRef.current.state.compoundDraft.injuries.some(item => item.audio)
    )
      return;
    handleBusy(true, target);
    try {
      if (
        !(await handlePermission(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          '마이크',
        )) ||
        !isMountedRef.current
      ) {
        handleBusy(false, target);
        return;
      }
      await startAudioRecording();
      if (!isMountedRef.current) {
        await stopAudioRecording();
        return;
      }
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (error) {
      handleBusy(false, target);
      if (isMountedRef.current)
        Alert.alert(
          '녹음 시작 실패',
          error instanceof Error ? error.message : '다시 녹음해 주세요.',
        );
    }
  };
  return { isBusy, isRecording, handleAddPhoto, handleAudio };
};
