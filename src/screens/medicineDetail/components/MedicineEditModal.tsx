import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { MedicineEditor } from '@/types';
import { MedicineFormField } from '@/components/medicine';
import { MEDICINE_EDIT_FIELDS } from '@/constants/medicineFormData';

interface MedicineEditModalProps {
  editor: MedicineEditor;
}

export const MedicineEditModal = ({ editor }: MedicineEditModalProps): React.JSX.Element => {
  const { isEditOpen, isSaving, values, errors, onChange, onClose, onSave } = editor;

  return (
    <Modal visible={isEditOpen} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-black/50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="min-h-full justify-center px-5 py-6">
            <View className="rounded-2xl bg-white p-5">
              <Text className="text-base font-suitBold text-memoText">약품 수정</Text>

              <MedicineFormField
                config={MEDICINE_EDIT_FIELDS.name}
                value={values.name}
                error={errors.name}
                onChangeText={(nextText: string): void => onChange('name', nextText)}
              />

              <MedicineFormField
                config={MEDICINE_EDIT_FIELDS.quantity}
                value={values.quantity}
                error={errors.quantity}
                onChangeText={(nextText: string): void => onChange('quantity', nextText)}
              />

              <MedicineFormField
                config={MEDICINE_EDIT_FIELDS.efficacy}
                value={values.efficacy}
                error={errors.efficacy}
                onChangeText={(nextText: string): void => onChange('efficacy', nextText)}
              />

              <MedicineFormField
                config={MEDICINE_EDIT_FIELDS.usage}
                value={values.usage}
                error={errors.usage}
                onChangeText={(nextText: string): void => onChange('usage', nextText)}
              />

              <View className="flex-row gap-3 pt-5">
                <TouchableOpacity
                  className="h-12 flex-1 items-center justify-center rounded-xl border border-memoLine"
                  disabled={isSaving}
                  onPress={onClose}>
                  <Text className="font-suitBold text-memoText">취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="h-12 flex-1 items-center justify-center rounded-xl bg-red"
                  disabled={isSaving}
                  onPress={onSave}>
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
  );
};

export default MedicineEditModal;
