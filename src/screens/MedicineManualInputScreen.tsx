import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import tailwindConfig from '../../tailwind.config';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineManualInput'>;

const { colors } = tailwindConfig;

export function MedicineManualInputScreen({ navigation }: Props) {
  const [quantity, setQuantity] = React.useState(0);

  return (
    <SafeAreaView className="flex-1 bg-memoCard" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-3">
        <View className="h-10 flex-row items-center justify-between">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-2xl text-memoText">×</Text>
          </TouchableOpacity>
          <Text className="text-base font-extrabold text-memoText">
            임시로 수동 입력
          </Text>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-xl font-extrabold text-memoRed">⌄</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5">
          <Text className="text-base font-extrabold text-memoText">
            기본 정보
          </Text>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-memoText">
              약품 이름 <Text className="text-memoRed">*</Text>
            </Text>
            <TextInput
              className="h-12 rounded-xl border border-memoLine px-4 text-sm text-memoText"
              placeholder="예) 타이레놀 정 500mg"
              placeholderTextColor={colors.memoSubText}
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-bold text-memoText">
              수량 <Text className="text-memoSubText"></Text>
            </Text>
            <View className="h-12 flex-row overflow-hidden rounded-xl border border-memoLine">
              <TouchableOpacity
                className="w-16 items-center justify-center border-r border-memoLine"
                onPress={() => setQuantity(value => Math.max(0, value - 1))}
              >
                <Text className="text-xl font-bold text-memoSubText">−</Text>
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
                <Text className="text-xl font-bold text-memoText">＋</Text>
              </TouchableOpacity>
              <View className="w-12 items-center justify-center">
                <Text className="text-sm font-bold text-memoText">개</Text>
              </View>
            </View>
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-sm font-bold text-memoText">효능</Text>
            <View className="min-h-[92px] rounded-xl border border-memoLine px-4 py-3">
              <TextInput
                multiline
                className="min-h-[56px] text-sm text-memoText"
                placeholder="약물의 효능을 입력하세요"
                placeholderTextColor={colors.memoSubText}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text className="self-end text-xs text-memoSubText">0/200</Text>
            </View>
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-sm font-bold text-memoText">
              사용 방법
            </Text>
            <View className="min-h-[104px] rounded-xl border border-memoLine px-4 py-3">
              <TextInput
                multiline
                className="min-h-[68px] text-sm text-memoText"
                placeholder="복용 방법과 주의사항을 입력하세요"
                placeholderTextColor={colors.memoSubText}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text className="self-end text-xs text-memoSubText">0/300</Text>
            </View>
          </View>
        </View>

        <View className="mt-7 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
          <Text className="text-sm font-bold text-memoBlue">
            ⓘ 임시 정보로 저장됩니다.
          </Text>
          <Text className="mt-1 text-xs leading-5 text-memoBlue">
            사진을 등록하면 정보가 자동으로 업데이트돼요.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
