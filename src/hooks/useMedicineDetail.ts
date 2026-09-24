import React from 'react';
import { Alert } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  MedicineDetailState,
  MedicineItem,
  MedicineEditValidationErrors,
  MedicineEditValues,
} from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { invalidateMedicines } from '@/query';
import { deleteMedicine, fetchMedicineById, updateMedicine } from '@/services/medicineApi';
import { isAuthSessionExpiredError } from '@/services/auth.service';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';
import {
  EMPTY_MEDICINE_EDIT_ERRORS,
  getMedicineEditValidationErrors,
} from '@/utils/medicine/medicineEditValidation';

const MEDICINE_UPDATE_ERROR_MESSAGE =
  '약품 정보를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const MEDICINE_DELETE_ERROR_MESSAGE = '약품을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const MEDICINE_LOAD_ERROR_MESSAGE = '약품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const useMedicineDetail = ({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'MedicineDetail'>): MedicineDetailState => {
  const [medicine, setMedicine] = React.useState<MedicineItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  // 상세 정보는 저장 성공 후에만 바꾸고, 취소한 입력은 다음 편집에 남기지 않습니다.
  const [editValues, setEditValues] = React.useState<MedicineEditValues>({
    name: '',
    efficacy: '',
    usage: '',
    quantity: '0',
    expireDate: '',
  });
  const [editErrors, setEditErrors] = React.useState<MedicineEditValidationErrors>(
    EMPTY_MEDICINE_EDIT_ERRORS,
  );

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(navigation);
  }, [navigation]);

  React.useEffect(() => {
    // 화면을 떠난 뒤 도착한 응답이 현재 화면의 상태나 이동을 바꾸지 않게 합니다.
    let isActive = true;

    const loadMedicine = async (): Promise<void> => {
      try {
        const nextMedicine = await fetchMedicineById(route.params.medicineId);

        if (isActive) {
          setMedicine(nextMedicine);
          setEditValues({
            name: nextMedicine.name,
            efficacy: nextMedicine.efficacy,
            usage: nextMedicine.usage,
            quantity: String(nextMedicine.qty),
            expireDate: nextMedicine.expireDate ?? '',
          });
        }
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        if (isAuthSessionExpiredError(error)) {
          handleAuthSessionExpired();
          return;
        }

        console.error('[useMedicineDetail] 약품 조회 실패:', error);
        setLoadError(
          getApiErrorUserMessage(error, {
            codeMessages: {
              MEDICINE_NOT_FOUND: '약품 정보를 찾을 수 없습니다.',
            },
            fallbackMessage: MEDICINE_LOAD_ERROR_MESSAGE,
            statusMessages: { 404: '약품 정보를 찾을 수 없습니다.' },
          }),
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadMedicine();

    return () => {
      isActive = false;
    };
  }, [handleAuthSessionExpired, route.params.medicineId]);

  const handleOpenEdit = (): void => {
    if (!medicine) {
      return;
    }

    setEditValues({
      name: medicine.name,
      efficacy: medicine.efficacy,
      usage: medicine.usage,
      quantity: String(medicine.qty),
      expireDate: medicine.expireDate ?? '',
    });
    setEditErrors(EMPTY_MEDICINE_EDIT_ERRORS);
    setIsEditOpen(true);
  };

  const handleCloseEdit = (): void => {
    setIsEditOpen(false);
  };

  const handleFieldChange = React.useCallback(
    (field: keyof MedicineEditValues, nextText: string): void => {
      setEditValues(currentValues => ({ ...currentValues, [field]: nextText }));
      // 다시 입력하는 항목의 오류만 지워 나머지 필수 입력 안내는 유지합니다.
      setEditErrors(currentErrors => ({ ...currentErrors, [field]: null }));
    },
    [],
  );

  const handleSaveEdit = async (): Promise<void> => {
    if (!medicine) {
      return;
    }

    const { name, efficacy, usage, quantity, expireDate } = editValues;
    const trimmedName = name.trim();
    const trimmedEfficacy = efficacy.trim();
    const trimmedUsage = usage.trim();
    const nextEditErrors = getMedicineEditValidationErrors(editValues);
    const hasValidationError = Boolean(
      nextEditErrors.name ||
        nextEditErrors.quantity ||
        nextEditErrors.efficacy ||
        nextEditErrors.usage ||
        nextEditErrors.expireDate,
    );

    setEditErrors(nextEditErrors);

    if (hasValidationError) {
      return;
    }

    const parsedQuantity = Number(quantity.trim());

    try {
      setIsSaving(true);
      await updateMedicine(medicine.id, {
        name: trimmedName,
        efficacy: trimmedEfficacy,
        usage: trimmedUsage,
        quantity: parsedQuantity,
        ...(expireDate.trim()
          ? { expire_date: expireDate.trim() }
          : medicine.expireDate
            ? { expire_date: null }
            : {}),
      });
      // 목록은 별도 조회 결과를 사용하므로 상세 수정과 함께 갱신을 요청합니다.
      invalidateMedicines();

      setMedicine(current =>
        current
          ? {
              ...current,
              name: trimmedName,
              efficacy: trimmedEfficacy,
              usage: trimmedUsage,
              qty: parsedQuantity,
              expireDate: expireDate.trim() || null,
            }
          : current,
      );
      setIsEditOpen(false);
      Alert.alert('수정 완료', '약품 정보가 수정되었습니다.');
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        console.warn('[useMedicineDetail] 인증 만료:', error);
        handleAuthSessionExpired();
        return;
      }

      console.error('[useMedicineDetail] 약품 수정 실패:', error);
      Alert.alert(
        '수정 실패',
        getApiErrorUserMessage(error, {
          codeMessages: {
            INVALID_REQUEST: '입력한 약품 정보를 다시 확인해 주세요.',
            MEDICINE_NOT_FOUND: '수정할 약품을 찾을 수 없습니다.',
          },
          fallbackMessage: MEDICINE_UPDATE_ERROR_MESSAGE,
          statusMessages: { 404: '수정할 약품을 찾을 수 없습니다.' },
        }),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = (): void => {
    Alert.alert('약품 삭제', '이 약품을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: handleDeleteMedicine,
      },
    ]);
  };

  const handleDeleteMedicine = async (): Promise<void> => {
    if (!medicine) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteMedicine(medicine.id);
      invalidateMedicines();
      Alert.alert('삭제 완료', '약품이 삭제되었습니다.', [
        {
          text: '확인',
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', params: { screen: 'MedicinesTab' } }],
            }),
        },
      ]);
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        console.warn('[useMedicineDetail] 인증 만료:', error);
        handleAuthSessionExpired();
        return;
      }

      console.error('[useMedicineDetail] 약품 삭제 실패:', error);
      Alert.alert(
        '삭제 실패',
        getApiErrorUserMessage(error, {
          codeMessages: {
            MEDICINE_NOT_FOUND: '삭제할 약품을 찾을 수 없습니다.',
          },
          fallbackMessage: MEDICINE_DELETE_ERROR_MESSAGE,
          statusMessages: { 404: '삭제할 약품을 찾을 수 없습니다.' },
        }),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    medicine,
    isLoading,
    loadError: loadError ?? MEDICINE_LOAD_ERROR_MESSAGE,
    isDeleting,
    handleOpenEdit,
    handleConfirmDelete,
    editor: {
      isEditOpen,
      isSaving,
      values: editValues,
      errors: editErrors,
      onChange: handleFieldChange,
      onClose: handleCloseEdit,
      onSave: handleSaveEdit,
    },
  };
};
