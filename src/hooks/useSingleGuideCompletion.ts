import React from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { invalidateMedicines } from '@/query';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { isAuthSessionExpiredError } from '@/services/auth.service';
import { postMedicineUse } from '@/services/medicineApi';
import { useEmergencyGuideStore } from '@/store';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';

type CompletionNavigation = Pick<
  NativeStackNavigationProp<RootStackParamList>,
  'replace' | 'reset'
>;

export const useSingleGuideCompletion = (navigation: CompletionNavigation) => {
  const isCompleting = useEmergencyGuideStore(
    state => state.isCompletingSingleGuide,
  );
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleComplete = async (): Promise<void> => {
    const store = useEmergencyGuideStore.getState();
    const guide = store.guide;
    if (store.isCompletingSingleGuide || guide?.compound) {
      return;
    }

    store.setIsCompletingSingleGuide(true);
    const isCurrentGuide = (): boolean =>
      useEmergencyGuideStore.getState().guide === guide;

    try {
      const quantities = new Map<number, number>();
      guide?.treatment.steps.forEach(step => {
        if (
          store.completedStepIds.includes(step.stepId) &&
          step.requiredItemId !== null &&
          step.requiredItemId > 0 &&
          step.requiredQuantity > 0
        ) {
          quantities.set(
            step.requiredItemId,
            (quantities.get(step.requiredItemId) ?? 0) + step.requiredQuantity,
          );
        }
      });

      for (const [id, quantity] of quantities) {
        if (!isCurrentGuide()) {
          return;
        }
        const quantityToUse =
          quantity -
          (useEmergencyGuideStore.getState().usedMedicineQuantities[id] ?? 0);
        if (quantityToUse <= 0) {
          continue;
        }
        await postMedicineUse({ id, quantityToUse });
        invalidateMedicines();
        if (!isCurrentGuide()) {
          return;
        }
        // 일부 물품만 차감된 뒤 실패해도 성공한 수량을 재전송하지 않습니다.
        store.recordMedicineUse(id, quantityToUse);
      }

      if (isCurrentGuide()) {
        store.setHandoverStatus('COMPLETED');
        if (isMountedRef.current) {
          navigation.replace('QRCode');
        }
      }
    } catch (error: unknown) {
      if (!isCurrentGuide() || !isMountedRef.current) {
        return;
      }
      if (isAuthSessionExpiredError(error)) {
        redirectToLoginForExpiredSession(navigation);
        return;
      }
      Alert.alert(
        '재고 차감 실패',
        getApiErrorUserMessage(error, {
          fallbackMessage:
            '사용한 물품의 재고를 차감하지 못했습니다. 완료 버튼을 눌러 다시 시도해 주세요.',
        }),
      );
    } finally {
      if (isCurrentGuide()) {
        store.setIsCompletingSingleGuide(false);
      }
    }
  };

  return { isCompleting, handleComplete };
};
