import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { invalidateMedicines } from '../query';
import { postMedicineManual } from '../services/medicineApi';
import { getApiErrorUserMessage } from '../services/apiError.service';
import { isAuthSessionExpiredError } from '../services/auth.service';
import { redirectToLoginForExpiredSession } from '../utils/authSessionNavigation';
import tailwindConfig from '../../tailwind.config';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineManualInput'>;

const { colors } = tailwindConfig;

interface MedicineManualInputValues {
  name: string;
  efficacy: string;
  usage: string;
}

interface MedicineManualInputErrors {
  name: string | null;
  efficacy: string | null;
  usage: string | null;
}

const EMPTY_MEDICINE_MANUAL_INPUT_ERRORS: MedicineManualInputErrors = {
  name: null,
  efficacy: null,
  usage: null,
};
const MEDICINE_REGISTER_ERROR_MESSAGE =
  '약품을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const getMedicineManualInputErrors = ({
  name,
  efficacy,
  usage,
}: MedicineManualInputValues): MedicineManualInputErrors => ({
  name: name.trim() ? null : '약 이름을 입력해 주세요.',
  efficacy: efficacy.trim() ? null : '효능을 입력해 주세요.',
  usage: usage.trim() ? null : '사용 방법을 입력해 주세요.',
});

export function MedicineManualInputScreen({ navigation }: Props) {
  const [name, setName] = React.useState('');
  const [efficacy, setEfficacy] = React.useState('');
  const [usage, setUsage] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);
  const [isSaving, setIsSaving] = React.useState(false);
  const [inputErrors, setInputErrors] =
    React.useState<MedicineManualInputErrors>(
      EMPTY_MEDICINE_MANUAL_INPUT_ERRORS,
    );

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(navigation);
  }, [navigation]);

  const closeToMedicineMemo = React.useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home', params: { screen: 'MedicinesTab' } }],
    });
  }, [navigation]);

  const handleNameChange = (nextName: string): void => {
    setName(nextName);
    setInputErrors(currentErrors => ({ ...currentErrors, name: null }));
  };

  const handleEfficacyChange = (nextEfficacy: string): void => {
    setEfficacy(nextEfficacy);
    setInputErrors(currentErrors => ({ ...currentErrors, efficacy: null }));
  };

  const handleUsageChange = (nextUsage: string): void => {
    setUsage(nextUsage);
    setInputErrors(currentErrors => ({ ...currentErrors, usage: null }));
  };

  const saveMedicine = async () => {
    const trimmedName = name.trim();
    const trimmedEfficacy = efficacy.trim();
    const trimmedUsage = usage.trim();
    const nextInputErrors = getMedicineManualInputErrors({
      name,
      efficacy,
      usage,
    });
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
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', params: { screen: 'MedicinesTab' } }],
            }),
        },
      ]);
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        console.warn(
          '[MedicineManualInputScreen] auth session expired:',
          error,
        );
        handleAuthSessionExpired();
        return;
      }

      console.error('[MedicineManualInputScreen] saveMedicine failed', error);
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

  const nameInputClassName = inputErrors.name
    ? 'h-12 rounded-xl border border-red px-4 text-sm text-memoText'
    : 'h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText';
  const efficacyInputContainerClassName = inputErrors.efficacy
    ? 'min-h-[92px] rounded-xl border border-red px-4 py-3'
    : 'min-h-[92px] rounded-xl border border-memoLine px-4 py-3';
  const usageInputContainerClassName = inputErrors.usage
    ? 'min-h-[104px] rounded-xl border border-red px-4 py-3'
    : 'min-h-[104px] rounded-xl border border-memoLine px-4 py-3';

  return (
    <SafeAreaView className="flex-1 bg-memoCard" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="px-5 pt-3">
          <View className="h-10 flex-row items-center justify-between">
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center"
              onPress={closeToMedicineMemo}
            >
              <Text className="text-2xl text-memoText">x</Text>
            </TouchableOpacity>
            <Text className="text-base font-suitBold text-memoText">
              수동 입력
            </Text>
            <TouchableOpacity
              className="h-9 min-w-[48px] items-center justify-center"
              disabled={isSaving}
              onPress={saveMedicine}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.memoRed} />
              ) : (
                <Text className="text-sm font-suitBold text-memoRed">저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pb-8 pt-5">
            <Text className="text-base font-suitBold text-memoText">
              기본 정보
            </Text>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-suitBold text-memoText">
                약 이름 <Text className="text-memoRed">*</Text>
              </Text>
              <TextInput
                className={nameInputClassName}
                placeholder="예: 타이레놀"
                placeholderTextColor={colors.memoSubText}
                value={name}
                onChangeText={handleNameChange}
              />
              {inputErrors.name ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 text-sm font-suitMedium text-red"
                >
                  {inputErrors.name}
                </Text>
              ) : null}
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-suitBold text-memoText">
                수량 <Text className="text-memoRed">*</Text>
              </Text>
              <View className="h-12 flex-row overflow-hidden rounded-xl border border-memoLine">
                <TouchableOpacity
                  className="w-16 items-center justify-center border-r border-memoLine"
                  onPress={() => setQuantity(value => Math.max(1, value - 1))}
                >
                  <Text className="text-xl font-suitBold text-memoSubText">
                    -
                  </Text>
                </TouchableOpacity>
                <View className="flex-1 items-center justify-center">
                  <Text className="text-base font-suitBold text-memoText">
                    {quantity}
                  </Text>
                </View>
                <TouchableOpacity
                  className="w-16 items-center justify-center border-l border-r border-memoLine"
                  onPress={() => setQuantity(value => value + 1)}
                >
                  <Text className="text-xl font-suitBold text-memoText">+</Text>
                </TouchableOpacity>
                <View className="w-12 items-center justify-center">
                  <Text className="text-sm font-suitBold text-memoText">
                    개
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-suitBold text-memoText">
                효능 <Text className="text-memoRed">*</Text>
              </Text>
              <View className={efficacyInputContainerClassName}>
                <TextInput
                  multiline
                  className="min-h-[56px] text-sm text-memoText"
                  placeholder="예: 해열진통제"
                  placeholderTextColor={colors.memoSubText}
                  textAlignVertical="top"
                  maxLength={200}
                  value={efficacy}
                  onChangeText={handleEfficacyChange}
                />
                <Text className="self-end text-xs text-memoSubText">
                  {efficacy.length}/200
                </Text>
              </View>
              {inputErrors.efficacy ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 text-sm font-suitMedium text-red"
                >
                  {inputErrors.efficacy}
                </Text>
              ) : null}
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-suitBold text-memoText">
                사용 방법 <Text className="text-memoRed">*</Text>
              </Text>
              <View className={usageInputContainerClassName}>
                <TextInput
                  multiline
                  className="min-h-[68px] text-sm text-memoText"
                  placeholder="예: 식후 30분"
                  placeholderTextColor={colors.memoSubText}
                  textAlignVertical="top"
                  maxLength={300}
                  value={usage}
                  onChangeText={handleUsageChange}
                />
                <Text className="self-end text-xs text-memoSubText">
                  {usage.length}/300
                </Text>
              </View>
              {inputErrors.usage ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="mt-2 text-sm font-suitMedium text-red"
                >
                  {inputErrors.usage}
                </Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
