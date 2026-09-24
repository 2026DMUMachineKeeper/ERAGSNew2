import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MedicineAlert } from '@/types';

interface MedicineAlertsModalProps {
  isVisible: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  alerts: MedicineAlert[];
  onClose: () => void;
  onRetry: () => void;
  onPressMedicine: (medicine: MedicineAlert) => void;
}

export const MedicineAlertsModal = ({
  isVisible,
  isLoading,
  errorMessage,
  alerts,
  onClose,
  onRetry,
  onPressMedicine,
}: MedicineAlertsModalProps): React.JSX.Element => (
  <Modal visible={isVisible} animationType="fade" onRequestClose={onClose}>
    <SafeAreaView
      edges={['top', 'bottom']}
      className="flex-1 bg-white px-5 pt-5"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-suitBold text-memoText">약품 알림</Text>
        <TouchableOpacity
          accessibilityLabel="알림 닫기"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center"
          onPress={onClose}
        >
          <Text className="text-xl text-memoSubText">×</Text>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <ActivityIndicator className="py-10" color="#FF3A3A" />
      ) : errorMessage ? (
        <View className="items-center py-8">
          <Text className="text-center text-sm text-memoSubText">
            {errorMessage}
          </Text>
          <TouchableOpacity
            className="mt-4 rounded-xl bg-memoRed px-5 py-3"
            onPress={onRetry}
          >
            <Text className="font-suitBold text-white">다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : alerts.length === 0 ? (
        <Text className="py-10 text-center text-sm text-memoSubText">
          현재 약품 알림이 없습니다.
        </Text>
      ) : (
        <ScrollView
          className="mt-4 grow-0"
          showsVerticalScrollIndicator={false}
        >
          {alerts.map(alert => (
            <TouchableOpacity
              key={alert.id}
              accessibilityRole="button"
              className="mb-3 rounded-xl border border-memoLine bg-memoBg p-4"
              onPress={() => onPressMedicine(alert)}
            >
              <Text
                className="text-base font-suitBold text-memoText"
                numberOfLines={2}
              >
                {alert.name}
              </Text>
              <View className="mt-2 flex-row flex-wrap">
                {alert.isExpired ? (
                  <View className="mb-2 mr-2 rounded-full bg-memoRed/10 px-3 py-1">
                    <Text className="text-xs font-suitBold text-memoRed">
                      유통기한 지남
                    </Text>
                  </View>
                ) : alert.isExpiringSoon ? (
                  <View className="mb-2 mr-2 rounded-full bg-memoOrange/10 px-3 py-1">
                    <Text className="text-xs font-suitBold text-memoOrange">
                      유통기한 임박
                    </Text>
                  </View>
                ) : null}
                {alert.isLowStock ? (
                  <View className="mb-2 mr-2 rounded-full bg-memoBlue/10 px-3 py-1">
                    <Text className="text-xs font-suitBold text-memoBlue">
                      재고 부족
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-xs text-memoSubText">
                재고 {alert.qty}개
                {alert.expireDate ? ` · 유통기한 ${alert.expireDate}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  </Modal>
);

export default MedicineAlertsModal;
