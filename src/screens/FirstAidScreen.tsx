import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
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

const styles = StyleSheet.create({
  optionCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

const accidentTypes = [
  { id: '1', label: '화재 / 화염', icon: 'med' },
  { id: '2', label: '약물 / 중독', icon: 'med2' },
  { id: '3', label: '호흡 곤란', icon: 'mic' },
  { id: '4', label: '골절 / 타박', icon: 'cam' },
  { id: '5', label: '출혈 / 저상', icon: 'med' },
  { id: '6', label: '심정 / CPR', icon: 'med2' },
];

export function FirstAidScreen({ navigation }: FirstAidProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = React.useState<string | null>(null);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="px-5 pt-8">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <BackIcon width={24} height={24} />
        </TouchableOpacity>

        <Text className="mt-8 text-title text-black font-suitBold font-black">
          <Text className="text-red font-suitBold font-black">사고 유형</Text>을
          선택하세요
        </Text>

        <Text className="mt-2 text-body text-textDim">
          해당하는 유형을 선택해주세요.
        </Text>
      </View>

      <View className="px-5 mt-6 flex-1">
        <FlatList
          scrollEnabled={false}
          data={accidentTypes}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, marginBottom: 10 }}
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
                className={`h-[112px] flex-1 bg-white rounded-xl items-center justify-center border ${
                  selected ? 'border-red' : 'border-memoLine'
                }`}
                style={styles.optionCard}
                onPress={() => {
                  setSelectedId(item.id === selectedId ? null : item.id);
                  setSelectedLabel(item.id === selectedId ? null : item.label);
                }}
              >
                <View className="mb-4">
                  <Icon width={40} height={40} />
                </View>
                <Text
                  className={`text-coment font-suitBold ${
                    selected ? 'text-red' : 'text-black'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View className="bg-background px-5 pb-5">
        <TouchableOpacity
          className={`h-14 rounded-lg justify-center items-center ${
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
          <Text className="text-white font-bold">다음 - AI 분석 시작</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
