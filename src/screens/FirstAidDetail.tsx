import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';

type DetailProps = NativeStackScreenProps<RootStackParamList, 'FirstAidDetail'>;

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
});

const levels = [
  {
    id: 'mild',
    name: '경미한 출혈',
    description: '간단한 압박으로 지혈 가능',
    icon: '●',
    color: '#FBBF24',
    bg: '#FFFBEB',
    message: '침착하게 압박 지혈을 시작하세요.',
  },
  {
    id: 'normal',
    name: '일반 출혈',
    description: '지속적인 압박 필요',
    icon: '●',
    color: '#F97316',
    bg: '#FFF7ED',
    message: '출혈 부위를 계속 압박해주세요.',
  },
  {
    id: 'severe',
    name: '대량 출혈',
    description: '즉시 강한 압박 및 119 신고 필요',
    icon: '●',
    color: '#EF4444',
    bg: '#FEF2F2',
    message: '즉각적인 응급처치가 필요합니다.',
  },
];

export function FirstAidDetail({ navigation, route }: DetailProps) {
  const main = route.params?.mainLabel ?? 'CPR';
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = levels.find(item => item.id === selectedId);

  const handleStartPress = React.useCallback(() => {
    if (!selected) {
      return;
    }

    navigation.navigate('EmergencyGuide', {
      mainLabel: main,
      subtypeLabel: selected.name,
      source: 'manual',
    });
  }, [main, navigation, selected]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 px-5 pt-8 pb-5">
        <TouchableOpacity
          className="h-10 w-10 justify-center"
          onPress={() => navigation.goBack()}
        >
          <BackIcon width={24} height={24} />
        </TouchableOpacity>

        <Text className="mt-7 text-title2 text-black font-suitBold">
          {main} 응급상황
        </Text>
        <Text className="mt-2 text-coment text-textDim">
          현재 상태와 가장 가까운 항목을 선택해주세요.
        </Text>

        <View className="mt-7">
          {levels.map(item => {
            const isSelected = selectedId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                className="mb-4 min-h-[102px] overflow-hidden rounded-[22px] bg-white"
                style={[
                  styles.cardShadow,
                  isSelected ? { backgroundColor: item.bg } : null,
                ]}
                onPress={() => setSelectedId(item.id)}
              >
                {isSelected ? (
                  <View
                    className="absolute bottom-0 left-0 top-0 w-1.5"
                    style={{ backgroundColor: item.color }}
                  />
                ) : null}

                <View className="flex-1 flex-row items-center px-5 py-4">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${item.color}18` }}
                  >
                    <Text style={{ color: item.color }} className="text-title2">
                      {item.icon}
                    </Text>
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="text-body text-black font-suitBold">
                      {item.name}
                    </Text>
                    <Text className="mt-1 text-coment text-textDim">
                      {item.description}
                    </Text>
                  </View>

                  {isSelected ? (
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: item.color }}
                    >
                      <Text className="text-coment text-white font-suitBold">
                        ✓
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          className="mt-auto rounded-[22px] bg-white px-5 py-4"
          style={styles.cardShadow}
        >
          <Text className="text-coment text-textDim">선택된 상태</Text>
          <Text className="mt-1 text-body text-black font-suitBold">
            {selected ? selected.name : '아직 선택되지 않음'}
          </Text>
          <Text className="mt-2 text-coment text-textDim">
            {selected ? selected.message : '현재 상태를 선택하면 안내가 표시됩니다.'}
          </Text>
        </View>

        <TouchableOpacity
          className={`mt-5 h-14 rounded-lg items-center justify-center ${
            selectedId ? 'bg-red' : 'bg-disabled'
          }`}
          disabled={!selectedId}
          onPress={handleStartPress}
        >
          <Text className="text-white font-bold">다음 단계로 이동</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
