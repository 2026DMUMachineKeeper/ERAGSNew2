import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useMedicineManualInput } from '@/hooks/useMedicineManualInput';
import type { RootStackParamList } from '@/navigation/RootNavigator';

import { MedicineManualForm } from './medicineManualInput/components';

import tailwindConfig from '../../tailwind.config';

const { colors } = tailwindConfig;
export const MedicineManualInputScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'MedicineManualInput'>): React.JSX.Element => {
  const { form, handleClose, handleSave, isSaving } = useMedicineManualInput(navigation);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <View className="px-5 pt-3">
          <View className="h-10 flex-row items-center justify-between">
            <TouchableOpacity className="h-9 w-9 items-center justify-center" onPress={handleClose}>
              <Text className="text-2xl text-memoText">x</Text>
            </TouchableOpacity>
            <Text className="text-base font-suitBold text-memoText">수동 입력</Text>
            <TouchableOpacity
              className="h-9 min-w-[48px] items-center justify-center"
              disabled={isSaving}
              onPress={handleSave}>
              {isSaving ? (
                <ActivityIndicator color={colors.memoRed} />
              ) : (
                <Text className="text-sm font-suitBold text-memoRed">저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <MedicineManualForm form={form} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MedicineManualInputScreen;
