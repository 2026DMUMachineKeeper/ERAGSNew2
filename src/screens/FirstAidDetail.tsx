import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';
import { GuideActionButton } from '../components/EmergencyGuide/GuideActionButton';

type DetailProps = NativeStackScreenProps<RootStackParamList, 'FirstAidDetail'>;

export function FirstAidDetail({ navigation, route }: DetailProps) {
  const main = route.params?.mainLabel ?? '항목';
  const subtypes = [
    { id: 'a', label: `${main} - 경미한` },
    { id: 'b', label: `${main} - 중간` },
    { id: 'c', label: `${main} - 심한` },
  ];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <BackIcon width={24} height={24} />
          </TouchableOpacity>

          <Text className="ml-3 text-body text-white tracking-erags font-suitBold">
            {main} 세부 유형 선택
          </Text>
        </View>

        <Text className="mt-2 text-lightGray text-body tracking-erags font-suitBold">
          해당되는 상태를 선택하세요.
        </Text>

        <View className="h-[1px] bg-lightGray rounded-full mt-2" />
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ marginTop: 12 }}>
          <FlatList
            data={subtypes}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`${
                  selectedId === item.id
                    ? 'border-[#12B76A]'
                    : 'border-[#363C46]'
                } py-4 px-3 bg-[#22262E] rounded-lg mb-3 border`}
                onPress={() => {
                  setSelectedId(item.id);
                }}
              >
                <Text className="text-white font-suitBold">{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={{ marginTop: 16, marginBottom: 20 }}>
          <GuideActionButton
            title="다음 단계"
            disabled={!selectedId}
            onPress={() => {
              const selectedLabel =
                subtypes.find(item => item.id === selectedId)?.label ??
                subtypes[0].label;

              navigation.navigate('EmergencyGuide', {
                mainLabel: main,
                subtypeLabel: selectedLabel,
              });
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
