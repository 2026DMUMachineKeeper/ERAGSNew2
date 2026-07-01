import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'QRCode'>;

export function QRCodeScreen({ navigation }: Props) {
  const incidentType = '출혈 / 상처';
  const totalTime = '07분 03초';
  const completed = 4;
  const total = 4;
  const items = ['멸균붕대 x1', '의료용 테이프 x1', '소독솜 x2', '일회용 장갑 x1'];

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="mt-10" />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-4">
          <Text className="text-black text-body text-center">
            구조대원에게 QR 코드를 보여주세요.
          </Text>

          <View className="bg-white rounded-2xl p-6 items-center mt-3">
            <View className="w-full aspect-square bg-black rounded-xl items-center justify-center">
              <Text className="text-white">QR CODE</Text>
            </View>
            <Text className="text-placeholder text-xs mt-3 text-center">
              T:07:03|TYPE:출혈|STEPS:4/4|ITEMS:4
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mt-5">
            <Text className="text-warning text-sm mb-3">
              처치 요약
            </Text>

            <View className="flex-row justify-between py-2 border-b border-memoLine">
              <Text className="text-black">사고 유형</Text>
              <Text className="text-black">{incidentType}</Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-memoLine">
              <Text className="text-black">총 처치 시간</Text>
              <Text className="text-black">{totalTime}</Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-memoLine">
              <Text className="text-black">완료 단계</Text>
              <Text className="text-success font-medium">
                {`${completed} / ${total} 완료`}
              </Text>
            </View>

            <View className="mt-3">
              <Text className="text-black mb-2">사용된 약품/물품</Text>
              <View className="flex-row flex-wrap">
                {items.map((it, idx) => (
                  <View
                    key={idx}
                    className="bg-memoBg px-3 py-2 rounded-full mr-2 mb-2"
                  >
                    <Text className="text-warning text-sm">{it}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="bg-background px-5 pb-5">
        <Pressable
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          }
          className="h-14 bg-red rounded-2xl items-center justify-center"
        >
          <Text className="text-white font-bold">홈으로</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
