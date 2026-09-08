import React from 'react';
import { Alert } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  MedicineManualInputState,
  MedicineManualInputErrors,
  MedicineManualInputValues,
} from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { invalidateMedicines } from '@/query';
import { postMedicineManual } from '@/services/medicineApi';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { isAuthSessionExpiredError } from '@/services/auth.service';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';
import {
  EMPTY_MEDICINE_MANUAL_INPUT_ERRORS,
  getMedicineManualInputErrors,
} from '@/utils/medicine/medicineManualValidation';

const MEDICINE_REGISTER_ERROR_MESSAGE = '약품을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const useMedicineManualInput = (
  navigation: NativeStackScreenProps<RootStackParamList, 'MedicineManualInput'>['navigation'],
): MedicineManualInputState => {
  const [inputValues, setInputValues] = React.useState<MedicineManualInputValues>({
    name: '',
    efficacy: '',
    usage: '',
  });
  const [quantity, setQuantity] = React.useState(1);
  const [isSaving, setIsSaving] = React.useState(false);
  const [inputErrors, setInputErrors] = React.useState<MedicineManualInputErrors>(
    EMPTY_MEDICINE_MANUAL_INPUT_ERRORS,
  );

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(navigation);
  }, [navigation]);

  // 등록 화면을 이동 기록에서 지워 뒤로가기로 같은 약품을 다시 등록하지 않게 합니다.
  const handleClose = React.useCallback((): void => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home', params: { screen: 'MedicinesTab' } }],
    });
  }, [navigation]);

  const handleFieldChange = React.useCallback(
    (field: keyof MedicineManualInputValues, nextText: string): void => {
      setInputValues(currentValues => ({ ...currentValues, [field]: nextText }));
      setInputErrors(currentErrors => ({ ...currentErrors, [field]: null }));
    },
    [],
  );

  const handleIncreaseQuantity = React.useCallback((): void => {
    setQuantity(currentQuantity => currentQuantity + 1);
  }, []);

  const handleDecreaseQuantity = React.useCallback((): void => {
    // 신규 등록은 한 개 이상이어야 하므로 감소 버튼에서 하한을 지킵니다.
    setQuantity(currentQuantity => Math.max(1, currentQuantity - 1));
  }, []);

  const handleSave = async (): Promise<void> => {
    const { name, efficacy, usage } = inputValues;
    const trimmedName = name.trim();
    const trimmedEfficacy = efficacy.trim();
    const trimmedUsage = usage.trim();
    const nextInputErrors = getMedicineManualInputErrors(inputValues);
    const hasInputError = Boolean(
      nextInputErrors.name || nextInputErrors.efficacy || nextInputErrors.usage,
    );

    setInputErrors(nextInputErrors);

    if (hasInputError) {
      return;
    }

    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      await postMedicineManual({
        name: trimmedName,
        efficacy: trimmedEfficacy,
        usage: trimmedUsage,
        quantityToAdd: quantity,
      });
      invalidateMedicines();

      Alert.alert('등록 완료', '약품이 등록되었습니다.', [
        {
          text: '확인',
          onPress: handleClose,
        },
      ]);
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        console.warn('[useMedicineManualInput] 인증 만료:', error);
        handleAuthSessionExpired();
        return;
      }

      console.error('[useMedicineManualInput] 약품 등록 실패:', error);
      Alert.alert(
        '등록 실패',
        getApiErrorUserMessage(error, {
          codeMessages: {
            INVALID_REQUEST: '입력한 약품 정보를 다시 확인해 주세요.',
          },
          fallbackMessage: MEDICINE_REGISTER_ERROR_MESSAGE,
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleClose,
    handleSave,
    form: {
      values: inputValues,
      quantity,
      errors: inputErrors,
      onChange: handleFieldChange,
      onIncreaseQuantity: handleIncreaseQuantity,
      onDecreaseQuantity: handleDecreaseQuantity,
    },
  };
};
