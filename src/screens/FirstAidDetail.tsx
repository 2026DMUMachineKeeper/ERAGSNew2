import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';
import { FIRST_AID_CATEGORIES } from '../constants';

type DetailProps = NativeStackScreenProps<RootStackParamList, 'FirstAidDetail'>;

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

const LEVEL_COLORS = ['#FBBF24', '#F97316', '#EF4444', '#DC2626'];
const LEVEL_BACKGROUNDS = ['#FFFBEB', '#FFF7ED', '#FEF2F2', '#FEF2F2'];

export const FirstAidDetail = ({
  navigation,
  route,
}: DetailProps): React.JSX.Element => {
  const mainId = route.params?.mainId ?? '';
  const main = route.params?.mainLabel ?? '응급';
  const category = FIRST_AID_CATEGORIES.find(item => item.id === mainId);
  const levels = (category?.subtypes ?? []).map((name, index) => ({
    id: `${mainId}-${index}`,
    name,
    icon: '●',
    color: LEVEL_COLORS[index] ?? LEVEL_COLORS[LEVEL_COLORS.length - 1],
    bg:
      LEVEL_BACKGROUNDS[index] ??
      LEVEL_BACKGROUNDS[LEVEL_BACKGROUNDS.length - 1],
  }));
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
      <ScrollView
        className="flex-1 px-5 pt-8"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                      {main} 상태에 맞는 항목입니다.
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
            {selected
              ? `${selected.name}에 맞는 응급처치 안내를 시작합니다.`
              : '현재 상태를 선택하면 안내가 표시됩니다.'}
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default FirstAidDetail;
