import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import aedUsageGuideImage from '@/assets/icons/aed-usage-guide.png';

type AedUsageModalProps = {
  visible: boolean;
  onClose: () => void;
};

const styles = StyleSheet.create({
  aedGuideScrollContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  aedGuideNotice: {
    marginTop: 16,
  },
});

export const AedUsageModal = ({
  visible,
  onClose,
}: AedUsageModalProps): React.JSX.Element => {
  const { width: windowWidth } = useWindowDimensions();
  const aedUsageGuideImageSize = React.useMemo(() => {
    const imageWidth = Math.max(windowWidth - 40, 1);

    return {
      height: imageWidth * (1491 / 1055),
      width: imageWidth,
    };
  }, [windowWidth]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="h-[92%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-title2 font-suitBold text-black">
                AED 사용법
              </Text>
              <Text className="mt-1 text-coment text-textDim">
                자동심장충격기의 음성 안내를 따라 사용하세요.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="AED 사용법 닫기"
              accessibilityRole="button"
              className="rounded-full bg-background px-3 py-2"
              hitSlop={8}
              onPress={onClose}
            >
              <Text className="text-coment font-suitBold text-gray">닫기</Text>
            </Pressable>
          </View>

          <ScrollView
            className="mt-5 flex-1"
            contentContainerStyle={styles.aedGuideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Image
              accessibilityLabel="자동심장충격기 AED 사용 방법 안내 이미지"
              resizeMode="contain"
              source={aedUsageGuideImage}
              style={aedUsageGuideImageSize}
            />

            <View
              className="rounded-xl border border-red bg-red/10 px-4 py-3"
              style={styles.aedGuideNotice}
            >
              <Text className="text-coment font-suitBold leading-5 text-red">
                주의: AED는 반응과 정상 호흡이 없는 심정지 환자에게
                사용합니다. 기기 음성 안내를 우선하고, 119 구급대가 도착할
                때까지 심폐소생술과 AED 사용을 계속하세요.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default AedUsageModal;
