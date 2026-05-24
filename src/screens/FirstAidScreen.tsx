import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackIcon,
  MedicinesIcon,
  MedicinesIcon2,
  MicIcon,
  CameraIcon,
} from '../assets';

type FirstAidProps = NativeStackScreenProps<RootStackParamList, 'FirstAid'>;

export function FirstAidScreen({ navigation }: FirstAidProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = React.useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-background px-4 justify-between">
      <View className="mt-15" />
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <BackIcon width={24} height={24} />
      </TouchableOpacity>
      <View className="mt-2">
        <Text className=" tracking-erags text-title text-white">
          응급처치 시작
        </Text>
        <Text className="tracking-erags text-body text-gray mt-2">
          해당되는 유형을 선택해주세요
        </Text>
      </View>
      <View className="h-[1px] bg-lightGray rounded-full mt-2" />
      <View className="mt-3 flex-1">
        <FlatList
          style={{ flex: 1 }}
          data={[
            { id: '1', label: '화상', icon: 'med' },
            { id: '2', label: '화상(오른쪽)', icon: 'med2' },
            { id: '3', label: '화상', icon: 'mic' },
            { id: '4', label: '화상(오른쪽)', icon: 'cam' },
            { id: '5', label: '화상', icon: 'med' },
            { id: '6', label: '화상(오른쪽)', icon: 'med2' },
          ]}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
          renderItem={({ item }) => {
            const iconMap: Record<string, any> = {
              med: MedicinesIcon,
              med2: MedicinesIcon2,
              mic: MicIcon,
              cam: CameraIcon,
            };
            const Icon = iconMap[item.icon] ?? MedicinesIcon;
            const selected = selectedId === item.id;
            return (
              <TouchableOpacity
                className={`h-[140px] w-[176px] bg-[#22262E] rounded-2xl items-center justify-center border-2 ${
                  selected ? 'border-[#2ECC71]' : 'border-[#363C46]'
                }`}
                style={{ marginBottom: 0 }}
                onPress={() => {
                  setSelectedId(item.id === selectedId ? null : item.id);
                  setSelectedLabel(item.id === selectedId ? null : item.label);
                }}
              >
                <View className="mb-3">
                  <Icon width={40} height={40} />
                </View>
                <Text className="text-body text-white">{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <View className="mt-4 mb-5">
        <TouchableOpacity
          className="h-16 bg-[#2ECC71] rounded-lg justify-center items-center"
          onPress={() => {
            if (selectedId && selectedLabel) {
              navigation.navigate('FirstAidDetail', {
                mainId: selectedId,
                mainLabel: selectedLabel,
              });
            } else {
              navigation.navigate('FirstAidDetail', {
                mainId: '1',
                mainLabel: '화상',
              });
            }
          }}
        >
          <Text className="text-white font-bold">다음 단계</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
