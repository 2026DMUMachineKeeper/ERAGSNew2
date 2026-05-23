import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraIcon, MedicinesIcon, MicIcon } from '../assets/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background px-4">
      <View className="mt-15 items-center">
        <Text className="text-center tracking-erags text-display text-red">
          ERAGS
        </Text>
      </View>
      <View className="mt-14">
        <TouchableOpacity className="h-[132px] bg-red rounded-2xl">
          <Text className="text-white text-title text-center mt-8">
            응급처치 시작
          </Text>
          <Text className="text-white text-body text-center mt-4">
            유형을 선택해주세요!
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row mt-6 justify-betwee  gap-x-3">
        <TouchableOpacity className="h-[120px] bg-[#22262E] border-2 border-[#363C46] rounded-xl flex-1 items-center ">
          <View className="mt-7">
            <MicIcon />
          </View>
          <Text className="mt-3 text-body text-white">음성으로 입력</Text>
        </TouchableOpacity>

        <TouchableOpacity className="h-[120px] bg-[#22262E] border-2 border-[#363C46] rounded-xl flex-1 items-center">
          <View className="mt-7">
            <CameraIcon />
          </View>
          <Text className="mt-3 text-body text-white">사진으로 입력</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="h-[150px] bg-[#22262E] border-2 border-[#363C46] rounded-2xl items-center mt-6"
        onPress={() => navigation.navigate('MedicinesStock')}
      >
        <View className="mt-7">
          <MedicinesIcon height={40} width={40} />
        </View>
        <Text className="mt-3 text-title text-white">약품 재고</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
