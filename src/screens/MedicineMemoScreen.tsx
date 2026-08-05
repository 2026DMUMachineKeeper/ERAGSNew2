import React from 'react';
import {
  FlatList,
  Text,
  TextInput,
  type ListRenderItem,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  type CompositeScreenProps,
  useFocusEffect,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { BackIcon } from '@/assets';
import type { MainTabParamList } from '@/navigation/MainTabNavigator';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { isAuthSessionExpiredError } from '@/services/auth.service';
import { fetchMedicines, type MedicineItem } from '@/services/medicineApi';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';

import { MedicineListItem } from './medicineMemo/components';
import tailwindConfig from '../../tailwind.config';

interface MedicineMemoScreenProps
  extends CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'MedicinesTab'>,
    NativeStackScreenProps<RootStackParamList, 'MedicineMemo'>
  > {}

const { colors } = tailwindConfig;
const MEDICINE_LIST_LOAD_ERROR_MESSAGE =
  '약품 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

export const filterMedicinesByName = (
  medicines: MedicineItem[],
  searchQuery: string,
): MedicineItem[] => {
  const normalizedSearchQuery = searchQuery
    .trim()
    .normalize('NFC')
    .toLocaleLowerCase('ko-KR');

  if (normalizedSearchQuery.length === 0) {
    return medicines;
  }

  return medicines.filter(medicine =>
    medicine.name
      .normalize('NFC')
      .toLocaleLowerCase('ko-KR')
      .includes(normalizedSearchQuery),
  );
};

export const MedicineMemoScreen = ({
  navigation,
}: MedicineMemoScreenProps): React.JSX.Element => {
  const [medicines, setMedicines] = React.useState<MedicineItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const rootNavigation = React.useMemo(
    () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>(),
    [navigation],
  );
  const filteredMedicines = React.useMemo(
    () => filterMedicinesByName(medicines, searchQuery),
    [medicines, searchQuery],
  );

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(rootNavigation);
  }, [rootNavigation]);

  useFocusEffect(
    React.useCallback((): (() => void) => {
      let isActive = true;

      const loadMedicines = async (): Promise<void> => {
        try {
          setIsLoading(true);
          setLoadError(null);
          const nextMedicines = await fetchMedicines();

          if (isActive) {
            setMedicines(nextMedicines);
          }
        } catch (error: unknown) {
          if (!isActive) {
            return;
          }

          if (isAuthSessionExpiredError(error)) {
            console.warn('[MedicineMemoScreen] 인증 세션 만료:', error);
            handleAuthSessionExpired();
            return;
          }

          console.error('[MedicineMemoScreen] 약품 조회 실패:', error);
          setLoadError(MEDICINE_LIST_LOAD_ERROR_MESSAGE);
          setMedicines([]);
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
    }, [handleAuthSessionExpired]),
  );

  const handleHomePress = React.useCallback((): void => {
    navigation.navigate('HomeTab');
  }, [navigation]);

  const handleMedicinePress = React.useCallback(
    (medicine: MedicineItem): void => {
      navigation.navigate('MedicineDetail', { medicine });
    },
    [navigation],
  );

  const handleMedicineAddPress = React.useCallback((): void => {
    navigation.navigate('MedicineAdd');
  }, [navigation]);

  const renderMedicineItem = React.useCallback<ListRenderItem<MedicineItem>>(
    ({ item }): React.JSX.Element => (
      <MedicineListItem medicine={item} onPress={handleMedicinePress} />
    ),
    [handleMedicinePress],
  );

  const renderEmptyContent = React.useCallback((): React.JSX.Element => {
    if (isLoading) {
      return (
        <View className="mt-12 items-center">
          <Text className="text-sm font-suitBold text-memoSubText">
            약품 목록을 불러오는 중...
          </Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View className="mt-12 items-center">
          <Text className="text-sm font-suitBold text-memoRed">
            {loadError}
          </Text>
        </View>
      );
    }

    const emptyMessage =
      searchQuery.trim().length > 0
        ? '검색 결과가 없습니다.'
        : '등록된 약품이 없습니다.';

    return (
      <View className="mt-12 items-center">
        <Text className="text-sm font-suitBold text-memoSubText">
          {emptyMessage}
        </Text>
      </View>
    );
  }, [isLoading, loadError, searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-memoBg" edges={['top', 'bottom']}>
      <View className="flex-1 px-4 pt-3">
        <View className="h-10 flex-row items-center">
          <TouchableOpacity
            accessibilityLabel="홈으로 이동"
            accessibilityRole="button"
            className="h-9 w-9 items-center justify-center"
            onPress={handleHomePress}
          >
            <BackIcon width={24} height={24} />
          </TouchableOpacity>
        </View>

        <View className="mt-4">
          <Text className="text-[30px] font-suitBold text-memoText">
            약품 메모
          </Text>
          <Text className="mt-1 text-sm font-suitRegular text-memoSubText">
            내가 등록한 약품을 관리하세요
          </Text>
        </View>

        <View className="mt-5 h-12 flex-row items-center rounded-2xl bg-memoCard px-4">
          <Text className="mr-2 text-base text-memoSubText">⌕</Text>
          <TextInput
            accessibilityLabel="약품 이름 검색"
            autoCorrect={false}
            className="flex-1 text-sm font-suitRegular text-memoText"
            onChangeText={setSearchQuery}
            placeholder="약품 이름으로 검색"
            placeholderTextColor={colors.memoSubText}
            returnKeyType="search"
            value={searchQuery}
          />
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-sm font-suitBold text-memoText">
              {searchQuery.trim().length > 0 ? '검색 결과 ' : '전체 '}
            </Text>
            <Text className="text-sm font-suitBold text-memoRed">
              {filteredMedicines.length}개
            </Text>
          </View>
        </View>

        <FlatList
          className="mt-2 flex-1"
          data={isLoading || loadError ? [] : filteredMedicines}
          keyboardShouldPersistTaps="handled"
          keyExtractor={medicine => medicine.id}
          ListEmptyComponent={renderEmptyContent}
          ListFooterComponent={<View className="h-3" />}
          renderItem={renderMedicineItem}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <View className="border-t border-memoLine bg-memoBg px-4 pb-5 pt-3">
        <TouchableOpacity
          accessibilityLabel="약품 추가"
          accessibilityRole="button"
          activeOpacity={0.9}
          className="h-14 flex-row items-center justify-center rounded-2xl bg-memoRed"
          onPress={handleMedicineAddPress}
        >
          <Text className="text-base font-suitBold text-white">
            ＋ 약품 추가
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default MedicineMemoScreen;
