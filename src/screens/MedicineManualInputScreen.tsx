import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { postMedicineManual } from '../services/medicineApi';
import tailwindConfig from '../../tailwind.config';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineManualInput'>;

const { colors } = tailwindConfig;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});

export function MedicineManualInputScreen({ navigation }: Props) {
  const [name, setName] = React.useState('');
  const [efficacy, setEfficacy] = React.useState('');
  const [usage, setUsage] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);
  const [isSaving, setIsSaving] = React.useState(false);

  const closeToMedicineMemo = React.useCallback(() => {
    navigation.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'MedicineMemo' }],
    });
  }, [navigation]);

  const saveMedicine = async () => {
    const trimmedName = name.trim();
    const trimmedEfficacy = efficacy.trim();
    const trimmedUsage = usage.trim();

    if (!trimmedName) {
      Alert.alert('입력 필요', '약 이름을 입력해 주세요.');
      return;
    }

    if (!trimmedEfficacy) {
      Alert.alert('입력 필요', '효능을 입력해 주세요.');
      return;
    }

    if (!trimmedUsage) {
      Alert.alert('입력 필요', '사용 방법을 입력해 주세요.');
      return;
    }

    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const result = await postMedicineManual({
        name: trimmedName,
        efficacy: trimmedEfficacy,
        usage: trimmedUsage,
        quantityToAdd: quantity,
      });

      console.log('[MedicineManualInputScreen] medicine manually registered', {
        result,
      });

      Alert.alert('등록 완료', '약품이 등록되었습니다.', [
        {
          text: '확인',
          onPress: () =>
            navigation.reset({
              index: 1,
              routes: [{ name: 'Home' }, { name: 'MedicineMemo' }],
            }),
        },
      ]);
    } catch (error) {
      console.error('[MedicineManualInputScreen] saveMedicine failed', error);
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '약품을 등록하지 못했습니다.';

      Alert.alert('등록 실패', message);
    } finally {
      setIsSaving(false);
    }
  };

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
            <Text className="text-base font-extrabold text-memoText">
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
                <Text className="text-sm font-extrabold text-memoRed">
                  저장
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text className="text-base font-extrabold text-memoText">
              기본 정보
            </Text>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-bold text-memoText">
                약 이름 <Text className="text-memoRed">*</Text>
              </Text>
              <TextInput
                className="h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText"
                placeholder="예: 타이레놀"
                placeholderTextColor={colors.memoSubText}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 text-sm font-bold text-memoText">
                수량 <Text className="text-memoRed">*</Text>
              </Text>
              <View className="h-12 flex-row overflow-hidden rounded-xl border border-memoLine">
                <TouchableOpacity
                  className="w-16 items-center justify-center border-r border-memoLine"
                  onPress={() => setQuantity(value => Math.max(1, value - 1))}
                >
                  <Text className="text-xl font-bold text-memoSubText">-</Text>
                </TouchableOpacity>
                <View className="flex-1 items-center justify-center">
                  <Text className="text-base font-extrabold text-memoText">
                    {quantity}
                  </Text>
                </View>
                <TouchableOpacity
                  className="w-16 items-center justify-center border-l border-r border-memoLine"
                  onPress={() => setQuantity(value => value + 1)}
                >
                  <Text className="text-xl font-bold text-memoText">+</Text>
                </TouchableOpacity>
                <View className="w-12 items-center justify-center">
                  <Text className="text-sm font-bold text-memoText">개</Text>
                </View>
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-bold text-memoText">
                효능 <Text className="text-memoRed">*</Text>
              </Text>
              <View className="min-h-[92px] rounded-xl border border-memoLine px-4 py-3">
                <TextInput
                  multiline
                  className="min-h-[56px] text-sm text-memoText"
                  placeholder="예: 해열진통제"
                  placeholderTextColor={colors.memoSubText}
                  textAlignVertical="top"
                  maxLength={200}
                  value={efficacy}
                  onChangeText={setEfficacy}
                />
                <Text className="self-end text-xs text-memoSubText">
                  {efficacy.length}/200
                </Text>
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-bold text-memoText">
                사용 방법 <Text className="text-memoRed">*</Text>
              </Text>
              <View className="min-h-[104px] rounded-xl border border-memoLine px-4 py-3">
                <TextInput
                  multiline
                  className="min-h-[68px] text-sm text-memoText"
                  placeholder="예: 식후 30분"
                  placeholderTextColor={colors.memoSubText}
                  textAlignVertical="top"
                  maxLength={300}
                  value={usage}
                  onChangeText={setUsage}
                />
                <Text className="self-end text-xs text-memoSubText">
                  {usage.length}/300
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
