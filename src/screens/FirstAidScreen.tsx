import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
} from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AirwayObstructionImage,
  BackIcon,
  BleedingIcon,
  BurnIcon,
  FeverIcon,
  FractureBruiseIcon,
  MedicinesIcon,
  SkinRashIcon,
} from '../assets';
import { FIRST_AID_CATEGORIES } from '../constants';

type FirstAidProps = NativeStackScreenProps<RootStackParamList, 'FirstAid'>;

const styles = StyleSheet.create({
  columnWrapper: {
    gap: 8,
    marginBottom: 10,
  },
  optionCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

const iconByCategoryId: Record<string, React.ComponentType<SvgProps>> = {
  bleeding: BleedingIcon,
  burn: BurnIcon,
  fractureBruise: FractureBruiseIcon,
  fever: FeverIcon,
  skinRash: SkinRashIcon,
};

export const FirstAidScreen = ({
  navigation,
}: FirstAidProps): React.JSX.Element => {
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="px-5 pt-8">
        <TouchableOpacity
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          className="h-11 w-11 items-start justify-center"
          hitSlop={10}
          onPress={() => navigation.goBack()}
        >
          <BackIcon width={26} height={26} />
        </TouchableOpacity>

        <Text className="mt-2 text-title text-black font-suitBold font-black">
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
          data={FIRST_AID_CATEGORIES}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => {
            const Icon = iconByCategoryId[item.id] ?? MedicinesIcon;
            const isAirwayObstruction = item.id === 'airwayObstruction';

            return (
              <TouchableOpacity
                className="h-[112px] flex-1 items-center justify-center rounded-xl border border-memoLine bg-white"
                style={styles.optionCard}
                onPress={() =>
                  navigation.navigate('FirstAidDetail', {
                    mainId: item.id,
                    mainLabel: item.label,
                  })
                }
              >
                <View className="mb-2">
                  {isAirwayObstruction ? (
                    <Image
                      className="h-12 w-12"
                      resizeMode="contain"
                      source={AirwayObstructionImage}
                    />
                  ) : (
                    <Icon width={48} height={48} />
                  )}
                </View>
                <Text className="text-coment font-suitBold text-black">
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View className="bg-background px-5 pb-5">
        <Text className="text-center text-coment font-suitMedium text-textDim">
          유형을 누르면 맞춤 질문이 시작됩니다.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default FirstAidScreen;
