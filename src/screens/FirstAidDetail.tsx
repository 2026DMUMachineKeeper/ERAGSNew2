import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';

type DetailProps = NativeStackScreenProps<RootStackParamList, 'FirstAidDetail'>;

export function FirstAidDetail({ navigation, route }: DetailProps) {
  const main = route.params?.mainLabel ?? '항목';
  const subtypes = [
    { id: 'a', label: `${main} - 경미한` },
    { id: 'b', label: `${main} - 중간` },
    { id: 'c', label: `${main} - 심한` },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background px-4">
      <View className="mt-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <BackIcon width={24} height={24} />
        </TouchableOpacity>
      </View>

      <View className="mt-4">
        <Text className="text-title text-white">{main} 세부 유형 선택</Text>
        <Text className="text-body text-gray mt-2">
          해당되는 상태를 선택하세요.
        </Text>
      </View>

      <View className="mt-6 flex-1">
        <FlatList
          data={subtypes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="py-4 px-3 bg-[#22262E] border border-[#363C46] rounded-lg mb-3"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-white">{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
