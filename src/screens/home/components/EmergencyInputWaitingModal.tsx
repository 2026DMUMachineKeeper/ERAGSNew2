import React from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';

import tailwindConfig from '../../../../tailwind.config';

const { colors } = tailwindConfig;

interface EmergencyInputWaitingModalProps {
  isVisible: boolean;
  message: string;
}

const EmergencyInputWaitingModal = ({
  isVisible,
  message,
}: EmergencyInputWaitingModalProps): React.JSX.Element => (
  <Modal
    animationType="fade"
    onRequestClose={(): void => undefined}
    transparent
    visible={isVisible}
  >
    <View className="flex-1 items-center justify-center bg-black/50 px-6">
      <View
        accessibilityLabel="응급 증상 입력 처리 중"
        accessibilityLiveRegion="polite"
        className="w-full items-center rounded-3xl bg-white px-6 py-8"
      >
        <ActivityIndicator color={colors.red} size="large" />
        <Text className="mt-5 text-center text-body font-suitBold text-black">
          {message}
        </Text>
        <Text className="mt-2 text-center text-coment leading-5 text-textDim">
          결과가 나올 때까지 현재 화면을 유지해 주세요.
        </Text>
      </View>
    </View>
  </Modal>
);

export default EmergencyInputWaitingModal;
