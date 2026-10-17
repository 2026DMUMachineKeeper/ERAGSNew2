import React from 'react';
import { AppState } from 'react-native';
import {
  ApiRequestError,
  completeCompoundGuideStep,
  getCompoundGuideErrorMessage,
  readCompoundGuideSession,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type { CompoundGuideSnapshot } from '@/types';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';

export const useCompoundGuideSession = (sessionId: string) => {
  const snapshot = useEmergencyGuideStore(state => state.compoundSnapshot);
  const pending = useEmergencyGuideStore(
    state => state.compoundPendingCompletion,
  );
  const [isBusy, setIsBusy] = React.useState(true);
  const [hasVerifiedSnapshot, setHasVerifiedSnapshot] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const controllerRef = React.useRef<AbortController | null>(null);
  const isMountedRef = React.useRef(false);

  const isCurrentSession = React.useCallback(
    (): boolean =>
      isMountedRef.current &&
      useEmergencyGuideStore.getState().guide?.sessionId === sessionId,
    [sessionId],
  );

  const applySnapshot = React.useCallback(
    (saved: CompoundGuideSnapshot): void => {
      if (!isCurrentSession()) {
        return;
      }
      const store = useEmergencyGuideStore.getState();
      store.applyCompoundSnapshot(saved);
      const attempt = store.compoundPendingCompletion;
      if (
        attempt?.sessionId === sessionId &&
        (attempt.command.planId !== saved.planId ||
          saved.progress?.completedStepIds.includes(
            attempt.command.executionStepId,
          ))
      ) {
        store.setCompoundPendingCompletion(null);
      }
      setHasVerifiedSnapshot(true);
    },
    [isCurrentSession, sessionId],
  );

  const handleRefresh = React.useCallback(async (): Promise<void> => {
    if (controllerRef.current) {
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsBusy(true);
    setHasVerifiedSnapshot(false);
    setErrorMessage('');
    try {
      const saved = await readCompoundGuideSession(
        sessionId,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        applySnapshot(saved);
      }
    } catch (error) {
      if (!controller.signal.aborted && isCurrentSession()) {
        setErrorMessage(getCompoundGuideErrorMessage(error));
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      if (isMountedRef.current && !controller.signal.aborted) {
        setIsBusy(false);
      }
    }
  }, [applySnapshot, isCurrentSession, sessionId]);

  React.useEffect(() => {
    isMountedRef.current = true;
    const store = useEmergencyGuideStore.getState();
    const guide = store.guide;
    if (
      !store.compoundSnapshot &&
      guide?.sessionId === sessionId &&
      guide.compound?.schemaVersion === '2'
    ) {
      try {
        // 생성 재전송 응답에도 기존 완료 기록이 있으므로 GET 실패 시에도 그 기록은 남깁니다.
        store.applyCompoundSnapshot(
          parseCompoundGuideSnapshot({
            ...guide,
            planId: guide.compound.planId,
          }),
        );
      } catch {
        // 저장 상태 조회에 성공하기 전에는 완료 버튼을 활성화하지 않습니다.
      }
    }
    handleRefresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        handleRefresh();
      }
    });
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
      subscription.remove();
    };
  }, [handleRefresh, sessionId]);

  const handleComplete = async (executionStepId: string): Promise<void> => {
    if (controllerRef.current || !hasVerifiedSnapshot || !isCurrentSession()) {
      return;
    }
    const store = useEmergencyGuideStore.getState();
    const saved = store.compoundSnapshot;
    if (
      saved?.sessionId !== sessionId ||
      !saved.planId ||
      saved.progress?.currentStepId !== executionStepId
    ) {
      return;
    }
    // 응답 유실 시 화면을 다시 열어도 같은 키와 본문을 유지해야 재고가 중복 차감되지 않습니다.
    const command =
      store.compoundPendingCompletion?.sessionId === sessionId
        ? store.compoundPendingCompletion.command
        : {
            planId: saved.planId,
            executionStepId: saved.progress.currentStepId,
            expectedRevision: saved.progress.revision,
            idempotencyKey: `complete-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
          };
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsBusy(true);
    setErrorMessage('');
    store.setCompoundPendingCompletion({ sessionId, command });
    try {
      const receipt = await completeCompoundGuideStep(
        sessionId,
        command,
        controller.signal,
      );
      if (!controller.signal.aborted && isCurrentSession()) {
        applySnapshot(receipt.snapshot);
        useEmergencyGuideStore.getState().setCompoundPendingCompletion(null);
      }
    } catch (error) {
      if (controller.signal.aborted || !isCurrentSession()) {
        return;
      }
      if (error instanceof ApiRequestError && error.status === 409) {
        useEmergencyGuideStore.getState().setCompoundPendingCompletion(null);
        setHasVerifiedSnapshot(false);
        try {
          applySnapshot(
            await readCompoundGuideSession(sessionId, controller.signal),
          );
          if (!controller.signal.aborted && isCurrentSession()) {
            setErrorMessage(
              '서버의 최신 진행 상태를 불러왔습니다. 현재 단계를 확인한 후 다시 시도해 주세요.',
            );
          }
        } catch (readError) {
          if (!controller.signal.aborted && isCurrentSession()) {
            setErrorMessage(getCompoundGuideErrorMessage(readError));
          }
        }
      } else {
        setErrorMessage(getCompoundGuideErrorMessage(error));
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      if (isMountedRef.current && !controller.signal.aborted) {
        setIsBusy(false);
      }
    }
  };

  return {
    snapshot: snapshot?.sessionId === sessionId ? snapshot : null,
    hasVerifiedSnapshot,
    hasPendingAttempt: pending?.sessionId === sessionId,
    canComplete:
      hasVerifiedSnapshot &&
      !isBusy &&
      snapshot?.sessionId === sessionId &&
      snapshot.progress?.currentStepId != null,
    isBusy,
    errorMessage,
    handleRefresh,
    handleComplete,
  };
};
