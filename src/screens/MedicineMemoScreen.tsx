import React from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { MainTabParamList } from '../navigation/MainTabNavigator';
import { fetchMedicines, type MedicineItem } from '../services/medicineApi';
import { isAuthSessionExpiredError } from '../services/auth.service';
import { redirectToLoginForExpiredSession } from '../utils/authSessionNavigation';
import tailwindConfig from '../../tailwind.config';
import { BackIcon } from '../assets';
type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'MedicinesTab'>,
  NativeStackScreenProps<RootStackParamList, 'MedicineMemo'>
>;

const { colors } = tailwindConfig;

const memoColors = [
  colors.memoRed,
  colors.memoOrange,
  colors.memoGreen,
  colors.memoBlue,
  colors.memoPurple,
  colors.memoPink,
  colors.memoSubText,
];

const getMedicineColor = (id: string) => {
  const seed = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return memoColors[seed % memoColors.length];
};

export function MedicineMemoScreen({ navigation }: Props) {
  const [medicines, setMedicines] = React.useState<MedicineItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const rootNavigation = React.useMemo(
    () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>(),
    [navigation],
  );

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(rootNavigation);
  }, [rootNavigation]);

  React.useEffect(() => {
    let isActive = true;

    const loadMedicines = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const nextMedicines = await fetchMedicines();

        if (isActive) {
          setMedicines(nextMedicines);
        }
      } catch (error: unknown) {
        if (isActive) {
          if (isAuthSessionExpiredError(error)) {
            console.warn('[MedicineMemoScreen] auth session expired:', error);
            handleAuthSessionExpired();
            return;
          }

          const errorMessage =
            error instanceof Error
              ? error.message
              : '약품 목록을 불러오지 못했습니다.';

          console.error('[MedicineMemoScreen] 약품 조회 실패:', error);
          setLoadError(errorMessage);
          setMedicines([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadMedicines();

    return () => {
      isActive = false;
    };
  }, [handleAuthSessionExpired]);

  const goHome = React.useCallback(() => {
    navigation.navigate('HomeTab');
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-memoBg" edges={['top', 'bottom']}>
      <View className="flex-1 px-4 pt-3">
        <View className="h-10 flex-row items-center">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center"
            onPress={goHome}
          >
            <BackIcon width={24} height={24} />
          </TouchableOpacity>
        </View>

        <View className="mt-4">
          <Text className="text-[30px] font-extrabold text-memoText">
            약품 메모
          </Text>
          <Text className="mt-1 text-sm text-memoSubText">
            내가 등록한 약품을 관리하세요
          </Text>
        </View>

        <View className="mt-5 h-12 flex-row items-center rounded-2xl bg-memoCard px-4">
          <Text className="mr-2 text-base text-memoSubText">⌕</Text>
          <TextInput
            className="flex-1 text-sm text-memoText"
            placeholder="약품 이름으로 검색"
            placeholderTextColor={colors.memoSubText}
          />
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-sm font-bold text-memoText">전체 </Text>
            <Text className="text-sm font-bold text-memoRed">
              {medicines.length}개
            </Text>
          </View>
        </View>

        <ScrollView
          className="mt-2 flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {isLoading ? (
            <View className="mt-12 items-center">
              <Text className="text-sm font-bold text-memoSubText">
                약품 목록을 불러오는 중...
              </Text>
            </View>
          ) : loadError ? (
            <View className="mt-12 items-center">
              <Text className="text-sm font-bold text-memoRed">
                {loadError}
              </Text>
            </View>
          ) : medicines.length === 0 ? (
            <View className="mt-12 items-center">
              <Text className="text-sm font-bold text-memoSubText">
                등록된 약품이 없습니다.
              </Text>
            </View>
          ) : (
            medicines.map(item => {
              const itemColor = getMedicineColor(item.id);

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('MedicineDetail', { medicine: item })
                  }
                  className="mb-2 min-h-[58px] flex-row items-center rounded-2xl bg-memoCard px-3"
                >
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${itemColor}14` }}
                  >
                    <View
                      className="h-5 w-5 rotate-45 rounded-md border-2"
                      style={{ borderColor: itemColor }}
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-extrabold text-memoText">
                      {item.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-memoSubText">
                      {item.expiry}
                    </Text>
                  </View>

                  <View
                    className="rounded-full px-2 py-1"
                    style={{ backgroundColor: `${itemColor}14` }}
                  >
                    <Text
                      className="text-xs font-extrabold"
                      style={{ color: itemColor }}
                    >
                      {item.qty}개
                    </Text>
                  </View>
                  <Text className="ml-2 text-lg text-memoSubText">›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      <View className="border-t border-memoLine bg-memoBg px-4 pb-5 pt-3">
        <TouchableOpacity
          activeOpacity={0.9}
          className="h-14 flex-row items-center justify-center rounded-2xl bg-memoRed"
          onPress={() => navigation.navigate('MedicineAdd')}
        >
          <Text className="text-base font-extrabold text-white">
            ＋ 약품 추가
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
