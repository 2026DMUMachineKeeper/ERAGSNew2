import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';
import { invalidateMedicines } from '../query';
import {
  deleteMedicine,
  fetchMedicineById,
  updateMedicine,
  type MedicineItem,
} from '../services/medicineApi';
import { isAuthSessionExpiredError } from '../services/auth.service';
import { getApiErrorUserMessage } from '../services/apiError.service';
import { redirectToLoginForExpiredSession } from '../utils/authSessionNavigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineDetail'>;

interface MedicineEditValues {
  name: string;
  efficacy: string;
  usage: string;
  quantity: string;
}

interface MedicineEditValidationErrors {
  name: string | null;
  efficacy: string | null;
  usage: string | null;
  quantity: string | null;
}

const EMPTY_MEDICINE_EDIT_ERRORS: MedicineEditValidationErrors = {
  name: null,
  efficacy: null,
  usage: null,
  quantity: null,
};
const MEDICINE_UPDATE_ERROR_MESSAGE =
  '약품 정보를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const MEDICINE_DELETE_ERROR_MESSAGE =
  '약품을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const MEDICINE_LOAD_ERROR_MESSAGE =
  '약품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const getMedicineEditValidationErrors = ({
  name,
  efficacy,
  usage,
  quantity,
}: MedicineEditValues): MedicineEditValidationErrors => {
  const trimmedQuantity = quantity.trim();
  const parsedQuantity = Number(trimmedQuantity);
  const isQuantityInvalid =
    !/^\d+$/.test(trimmedQuantity) || !Number.isSafeInteger(parsedQuantity);

  return {
    name: name.trim() ? null : '약 이름을 입력해 주세요.',
    quantity: isQuantityInvalid
      ? '수량은 0 이상의 정수로 입력해 주세요.'
      : null,
    efficacy: efficacy.trim() ? null : '효능을 입력해 주세요.',
    usage: usage.trim() ? null : '사용 방법을 입력해 주세요.',
  };
};

export function MedicineDetailScreen({ navigation, route }: Props) {
  const [medicine, setMedicine] = React.useState<MedicineItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [name, setName] = React.useState('');
  const [efficacy, setEfficacy] = React.useState('');
  const [usage, setUsage] = React.useState('');
  const [quantity, setQuantity] = React.useState('0');
  const [editErrors, setEditErrors] =
    React.useState<MedicineEditValidationErrors>(EMPTY_MEDICINE_EDIT_ERRORS);

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(navigation);
  }, [navigation]);

  React.useEffect(() => {
    let isActive = true;

    const loadMedicine = async (): Promise<void> => {
      try {
        const nextMedicine = await fetchMedicineById(route.params.medicineId);

        if (isActive) {
          setMedicine(nextMedicine);
          setName(nextMedicine.name);
          setEfficacy(nextMedicine.efficacy);
          setUsage(nextMedicine.usage);
          setQuantity(String(nextMedicine.qty));
        }
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        if (isAuthSessionExpiredError(error)) {
          handleAuthSessionExpired();
          return;
        }

        console.error('[MedicineDetailScreen] load failed', error);
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

  const openEdit = () => {
    if (!medicine) {
      return;
    }

    setName(medicine.name);
    setEfficacy(medicine.efficacy);
    setUsage(medicine.usage);
    setQuantity(String(medicine.qty));
    setEditErrors(EMPTY_MEDICINE_EDIT_ERRORS);
    setIsEditOpen(true);
  };

  const closeEdit = (): void => {
    setIsEditOpen(false);
  };

  const handleNameChange = (nextName: string): void => {
    setName(nextName);
    setEditErrors(currentErrors => ({ ...currentErrors, name: null }));
  };

  const handleQuantityChange = (nextQuantity: string): void => {
    setQuantity(nextQuantity);
    setEditErrors(currentErrors => ({ ...currentErrors, quantity: null }));
  };

  const handleEfficacyChange = (nextEfficacy: string): void => {
    setEfficacy(nextEfficacy);
    setEditErrors(currentErrors => ({ ...currentErrors, efficacy: null }));
  };

  const handleUsageChange = (nextUsage: string): void => {
    setUsage(nextUsage);
    setEditErrors(currentErrors => ({ ...currentErrors, usage: null }));
  };

  const saveEdit = async () => {
    if (!medicine) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedEfficacy = efficacy.trim();
    const trimmedUsage = usage.trim();
    const nextEditErrors = getMedicineEditValidationErrors({
      name,
      efficacy,
      usage,
      quantity,
    });
    const hasValidationError = Boolean(
      nextEditErrors.name ||
        nextEditErrors.quantity ||
        nextEditErrors.efficacy ||
        nextEditErrors.usage,
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
      });
      invalidateMedicines();

      setMedicine(current =>
        current
          ? {
              ...current,
              name: trimmedName,
              efficacy: trimmedEfficacy,
              usage: trimmedUsage,
              qty: parsedQuantity,
            }
          : current,
      );
      setIsEditOpen(false);
      Alert.alert('수정 완료', '약품 정보가 수정되었습니다.');
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        console.warn('[MedicineDetailScreen] auth session expired:', error);
        handleAuthSessionExpired();
        return;
      }

      console.error('[MedicineDetailScreen] update failed', error);
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

  const confirmDelete = () => {
    Alert.alert('약품 삭제', '이 약품을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: deleteCurrentMedicine,
      },
    ]);
  };

  const deleteCurrentMedicine = async () => {
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
        console.warn('[MedicineDetailScreen] auth session expired:', error);
        handleAuthSessionExpired();
        return;
      }

      console.error('[MedicineDetailScreen] delete failed', error);
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

  const nameInputClassName = editErrors.name
    ? 'mt-2 h-12 rounded-xl border border-red px-4 text-sm text-memoText'
    : 'mt-2 h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText';
  const quantityInputClassName = editErrors.quantity
    ? 'mt-2 h-12 rounded-xl border border-red px-4 text-sm text-memoText'
    : 'mt-2 h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText';
  const efficacyInputClassName = editErrors.efficacy
    ? 'mt-2 min-h-[76px] rounded-xl border border-red px-4 py-3 text-sm text-memoText'
    : 'mt-2 min-h-[76px] rounded-xl border border-memoLine px-4 py-3 text-sm text-memoText';
  const usageInputClassName = editErrors.usage
    ? 'mt-2 min-h-[76px] rounded-xl border border-red px-4 py-3 text-sm text-memoText'
    : 'mt-2 min-h-[76px] rounded-xl border border-memoLine px-4 py-3 text-sm text-memoText';

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!medicine) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-5">
        <Text className="text-center text-body font-suitBold text-memoText">
          {loadError ?? MEDICINE_LOAD_ERROR_MESSAGE}
        </Text>
        <TouchableOpacity
          className="mt-5 h-12 items-center justify-center rounded-xl bg-red px-6"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-body font-suitBold text-white">돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-3">
        <View className="h-10 flex-row items-center justify-between">
          <TouchableOpacity
            className="h-9 w-9 justify-center"
            onPress={() => navigation.goBack()}
          >
            <BackIcon width={24} height={24} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-sm font-suitBold text-memoText">
            약품 상세
          </Text>
          <View className="h-9 w-9" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="pb-4">
            <View className="mt-5 rounded-2xl bg-white p-4 shadow-md">
              <View className="flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-red">
                  <Text className="text-lg text-white">약</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-suitBold text-memoText">
                    {medicine.name}
                  </Text>
                  <Text className="mt-1 text-sm font-suitBold text-red">
                    {medicine.qty}개
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-3 rounded-2xl bg-white p-4 shadow-md">
              <Text className="text-sm font-suitBold text-memoText">효능</Text>
              <Text className="mt-3 text-sm leading-6 text-memoSubText">
                {medicine.efficacy}
              </Text>
            </View>

            <View className="mt-3 rounded-2xl bg-white p-4 shadow-md">
              <Text className="text-sm font-suitBold text-memoText">
                사용 방법
              </Text>
              <Text className="mt-3 text-sm leading-6 text-memoSubText">
                {medicine.usage}
              </Text>
            </View>

          </View>
        </ScrollView>
      </View>

      <View className="bg-background px-4 pb-5">
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="h-12 flex-1 items-center justify-center rounded-xl border border-memoLine bg-white"
            disabled={isDeleting}
            onPress={openEdit}
          >
            <Text className="font-suitBold text-memoText">수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="h-12 flex-1 items-center justify-center rounded-xl border border-red bg-white"
            disabled={isDeleting}
            onPress={confirmDelete}
          >
            {isDeleting ? (
              <ActivityIndicator />
            ) : (
              <Text className="font-suitBold text-red">삭제</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isEditOpen}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <KeyboardAvoidingView
          className="flex-1 bg-black/50"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="min-h-full justify-center px-5 py-6">
              <View className="rounded-2xl bg-white p-5">
                <Text className="text-base font-suitBold text-memoText">
                  약품 수정
                </Text>

                <View className="mt-4">
                  <Text className="text-sm font-suitBold text-memoText">
                    약 이름 <Text className="text-memoRed">*</Text>
                  </Text>
                  <TextInput
                    className={nameInputClassName}
                    value={name}
                    onChangeText={handleNameChange}
                    placeholder="약 이름"
                  />
                  {editErrors.name ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      className="mt-2 text-sm font-suitMedium text-red"
                    >
                      {editErrors.name}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-4">
                  <Text className="text-sm font-suitBold text-memoText">
                    수량 <Text className="text-memoRed">*</Text>
                  </Text>
                  <TextInput
                    className={quantityInputClassName}
                    value={quantity}
                    onChangeText={handleQuantityChange}
                    keyboardType="number-pad"
                    placeholder="수량"
                  />
                  {editErrors.quantity ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      className="mt-2 text-sm font-suitMedium text-red"
                    >
                      {editErrors.quantity}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-4">
                  <Text className="text-sm font-suitBold text-memoText">
                    효능 <Text className="text-memoRed">*</Text>
                  </Text>
                  <TextInput
                    className={efficacyInputClassName}
                    value={efficacy}
                    onChangeText={handleEfficacyChange}
                    multiline
                    textAlignVertical="top"
                    placeholder="효능"
                  />
                  {editErrors.efficacy ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      className="mt-2 text-sm font-suitMedium text-red"
                    >
                      {editErrors.efficacy}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-4">
                  <Text className="text-sm font-suitBold text-memoText">
                    사용 방법 <Text className="text-memoRed">*</Text>
                  </Text>
                  <TextInput
                    className={usageInputClassName}
                    value={usage}
                    onChangeText={handleUsageChange}
                    multiline
                    textAlignVertical="top"
                    placeholder="사용 방법"
                  />
                  {editErrors.usage ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      className="mt-2 text-sm font-suitMedium text-red"
                    >
                      {editErrors.usage}
                    </Text>
                  ) : null}
                </View>

                <View className="flex-row gap-3 pt-5">
                  <TouchableOpacity
                    className="h-12 flex-1 items-center justify-center rounded-xl border border-memoLine"
                    disabled={isSaving}
                    onPress={closeEdit}
                  >
                    <Text className="font-suitBold text-memoText">취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="h-12 flex-1 items-center justify-center rounded-xl bg-red"
                    disabled={isSaving}
                    onPress={saveEdit}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-suitBold text-white">저장</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
