import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';
import {
  deleteMedicine,
  getVisibleMedicineErrorMessage,
  updateMedicine,
  type MedicineItem,
} from '../services/medicineApi';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineDetail'>;

const styles = StyleSheet.create({
  card: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});

export function MedicineDetailScreen({ navigation, route }: Props) {
  const [medicine, setMedicine] = React.useState<MedicineItem>(
    route.params.medicine,
  );
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [name, setName] = React.useState(medicine.name);
  const [efficacy, setEfficacy] = React.useState(medicine.efficacy);
  const [usage, setUsage] = React.useState(medicine.usage);
  const [quantity, setQuantity] = React.useState(String(medicine.qty));

  const openEdit = () => {
    setName(medicine.name);
    setEfficacy(medicine.efficacy);
    setUsage(medicine.usage);
    setQuantity(String(medicine.qty));
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    const trimmedName = name.trim();
    const parsedQuantity = Number(quantity);

    if (!trimmedName) {
      Alert.alert('입력 필요', '약 이름을 입력해 주세요.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      Alert.alert('입력 확인', '수량은 0 이상의 숫자로 입력해 주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const result = await updateMedicine(medicine.id, {
        name: trimmedName,
        efficacy: efficacy.trim(),
        usage: usage.trim(),
        quantity: parsedQuantity,
      });

      console.log('[MedicineDetailScreen] medicine updated', { result });

      setMedicine(current => ({
        ...current,
        name: trimmedName,
        efficacy: efficacy.trim() || current.efficacy,
        usage: usage.trim() || current.usage,
        qty: parsedQuantity,
      }));
      setIsEditOpen(false);
      Alert.alert('수정 완료', '약품 정보가 수정되었습니다.');
    } catch (error) {
      console.error('[MedicineDetailScreen] update failed', error);
      Alert.alert(
        '수정 실패',
        getVisibleMedicineErrorMessage(error, 'update'),
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
    try {
      setIsDeleting(true);
      const result = await deleteMedicine(medicine.id);
      console.log('[MedicineDetailScreen] medicine deleted', { result });
      Alert.alert('삭제 완료', '약품이 삭제되었습니다.', [
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
      console.error('[MedicineDetailScreen] delete failed', error);
      Alert.alert(
        '삭제 실패',
        getVisibleMedicineErrorMessage(error, 'delete'),
      );
    } finally {
      setIsDeleting(false);
    }
  };

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
          <Text className="flex-1 text-sm font-extrabold text-memoText">
            약품 상세
          </Text>
          <Text className="text-xl text-memoText">...</Text>
        </View>

        <View className="mt-5 rounded-2xl bg-white p-4" style={styles.card}>
          <View className="flex-row items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-red">
              <Text className="text-white text-lg">약</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-extrabold text-memoText">
                {medicine.name}
              </Text>
              <Text className="mt-1 text-sm font-extrabold text-red">
                {medicine.qty}개
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-3 rounded-2xl bg-white p-4" style={styles.card}>
          <Text className="text-sm font-extrabold text-memoText">효능</Text>
          <Text className="mt-3 text-sm leading-6 text-memoSubText">
            {medicine.efficacy}
          </Text>
        </View>

        <View className="mt-3 rounded-2xl bg-white p-4" style={styles.card}>
          <Text className="text-sm font-extrabold text-memoText">
            사용 방법
          </Text>
          <Text className="mt-3 text-sm leading-6 text-memoSubText">
            {medicine.usage}
          </Text>
        </View>

        <View className="mt-3 rounded-2xl bg-white p-4" style={styles.card}>
          <Text className="text-sm font-extrabold text-memoText">
            추가 정보
          </Text>
          <View className="mt-3 flex-row">
            <Text className="w-20 text-sm font-bold text-memoText">메모</Text>
            <Text className="flex-1 text-sm text-memoSubText">
              {medicine.info}
            </Text>
          </View>
        </View>
      </View>

      <View className="bg-background px-4 pb-5">
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="h-12 flex-1 items-center justify-center rounded-xl border border-memoLine bg-white"
            disabled={isDeleting}
            onPress={openEdit}
          >
            <Text className="font-bold text-memoText">수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="h-12 flex-1 items-center justify-center rounded-xl border border-red bg-white"
            disabled={isDeleting}
            onPress={confirmDelete}
          >
            {isDeleting ? (
              <ActivityIndicator />
            ) : (
              <Text className="font-bold text-red">삭제</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={isEditOpen} transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/50 px-5">
          <View className="rounded-2xl bg-white p-5">
            <Text className="text-base font-extrabold text-memoText">
              약품 수정
            </Text>

            <TextInput
              className="mt-4 h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText"
              value={name}
              onChangeText={setName}
              placeholder="약 이름"
            />
            <TextInput
              className="mt-3 h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="수량"
            />
            <TextInput
              className="mt-3 min-h-[76px] rounded-xl border border-memoLine px-4 py-3 text-sm text-memoText"
              value={efficacy}
              onChangeText={setEfficacy}
              multiline
              textAlignVertical="top"
              placeholder="효능"
            />
            <TextInput
              className="mt-3 min-h-[76px] rounded-xl border border-memoLine px-4 py-3 text-sm text-memoText"
              value={usage}
              onChangeText={setUsage}
              multiline
              textAlignVertical="top"
              placeholder="사용 방법"
            />

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                className="h-12 flex-1 items-center justify-center rounded-xl border border-memoLine"
                disabled={isSaving}
                onPress={() => setIsEditOpen(false)}
              >
                <Text className="font-bold text-memoText">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 flex-1 items-center justify-center rounded-xl bg-red"
                disabled={isSaving}
                onPress={saveEdit}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-bold text-white">저장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
