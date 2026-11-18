import React from 'react';
import { Alert, AppState } from 'react-native';
import { requestTtsVoiceDataInstallation, speakTts, stopTts } from '@/services';

interface Params {
  instruction: string;
  stepKey?: string;
  shouldSkipRef?: React.RefObject<boolean>;
}

export const useEmergencyGuideTts = ({
  instruction,
  stepKey,
  shouldSkipRef,
}: Params): void => {
  // 같은 문구를 쓰는 별개의 복합 실행 단계도 각각 안내합니다.
  const speechKey = stepKey ? `${stepKey}:${instruction}` : instruction;
  const lastSpokenMessageRef = React.useRef('');
  const shouldRetryTtsAfterInstallationRef = React.useRef(false);
  const isTtsUnavailableRef = React.useRef(false);
  const hasShownTtsErrorAlertRef = React.useRef(false);
  const [ttsRetryCount, setTtsRetryCount] = React.useState(0);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && shouldRetryTtsAfterInstallationRef.current) {
        shouldRetryTtsAfterInstallationRef.current = false;
        isTtsUnavailableRef.current = false;
        lastSpokenMessageRef.current = '';
        setTtsRetryCount(count => count + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (
      shouldSkipRef?.current ||
      isTtsUnavailableRef.current ||
      !instruction ||
      lastSpokenMessageRef.current === speechKey
    ) {
      return undefined;
    }

    lastSpokenMessageRef.current = speechKey;
    const speechController = new AbortController();

    const speakCurrentStep = async (): Promise<void> => {
      try {
        await speakTts(instruction, speechController.signal);
      } catch (error) {
        if (speechController.signal.aborted) {
          return;
        }
        console.error('[EmergencyGuide TTS] TTS 자동 재생 실패:', error);
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'lang_missing_data'
        ) {
          // 음성 데이터가 없으면 설치 전까지는 실패가 반복되므로 자동 재생을 멈춥니다.
          isTtsUnavailableRef.current = true;
          Alert.alert(
            '한국어 음성 데이터가 필요해요',
            '한국어 음성 데이터를 설치한 뒤 돌아오면 음성 안내를 다시 시도합니다. 설치 전에도 화면의 처치 안내를 계속 확인할 수 있습니다.',
            [
              { text: '텍스트로 계속', style: 'cancel' },
              {
                text: '음성 데이터 설치',
                onPress: async (): Promise<void> => {
                  shouldRetryTtsAfterInstallationRef.current = true;
                  try {
                    await requestTtsVoiceDataInstallation();
                  } catch (installationError) {
                    shouldRetryTtsAfterInstallationRef.current = false;
                    console.warn(
                      '[EmergencyGuide TTS] 음성 데이터 설치 화면 열기 실패:',
                      installationError,
                    );
                    Alert.alert(
                      '음성 데이터 설치 안내',
                      '설치 화면을 열지 못했습니다. 기기의 설정에서 텍스트 음성 변환을 찾아 한국어 음성 데이터를 설치해 주세요.',
                    );
                  }
                },
              },
            ],
          );
          return;
        }
        // 일시적 오류(오디오 포커스 등)는 다음 단계에서 다시 시도하되, 안내 창은 한 번만 띄웁니다.
        if (!hasShownTtsErrorAlertRef.current) {
          hasShownTtsErrorAlertRef.current = true;
          Alert.alert(
            '음성 재생 실패',
            '기기의 음성 합성 설정을 확인해 주세요.',
          );
        }
      }
    };

    speakCurrentStep();

    return () => {
      speechController.abort();
      stopTts().catch(error => {
        console.warn('[EmergencyGuide TTS] TTS 정지 실패:', error);
      });
    };
  }, [instruction, speechKey, ttsRetryCount, shouldSkipRef]);
};
