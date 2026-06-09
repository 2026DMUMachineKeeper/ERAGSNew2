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
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="px-4 pt-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <BackIcon width={24} height={24} />
          </TouchableOpacity>

          <Text className="ml-3 text-body text-white tracking-erags font-suitBold">
            응급처치 시작
          </Text>
        </View>

        <Text className="mt-2 text-lightGray text-body tracking-erags font-suitBold">
          해당되는 유형을 선택해주세요
        </Text>

        <View className="h-[1px] bg-lightGray rounded-full mt-2" />
      </View>

      <View className="px-4 mt-3 flex-1">
        <FlatList
          style={{ flex: 1 }}
          data={[
            { id: '1', label: '출혈', icon: 'med' },
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
                className={`h-[140px] w-[176px] bg-surface rounded-2xl items-center justify-center border-2 ${
                  selected ? 'border-successStrong' : 'border-borderMuted'
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
                <Text className="text-body text-white font-suitBold">
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <View className="mt-4 mb-5">
        <TouchableOpacity
          className={`mx-4 h-16 rounded-lg justify-center items-center ${
            selectedId ? 'bg-red' : 'bg-disabled'
          }`}
          disabled={!selectedId}
          onPress={() => {
            if (!selectedId || !selectedLabel) {
              return;
            }

            navigation.navigate('FirstAidDetail', {
              mainId: selectedId,
              mainLabel: selectedLabel,
            });
          }}
        >
          <Text className="text-white font-bold">다음 단계</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
