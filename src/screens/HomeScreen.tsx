import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Sound from 'react-native-nitro-sound';
import {
  CameraIcon,
  MedicinesIcon,
  MicIcon,
  MainIcon,
  MainIcon2,
  EragsLogo,
} from '../assets/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPath, setRecordedPath] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const isRecordingRef = useRef(false);

  const requestMicrophonePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startRecording = async () => {
    try {
      setIsRequestingPermission(true);
      const granted = await requestMicrophonePermission();

      if (!granted) {
        Alert.alert('권한 필요', '마이크 권한을 허용해야 음성 녹음을 시작할 수 있습니다.');
        return;
      }

      const filePath = await Sound.startRecorder(undefined, undefined, true);
      setRecordedPath(filePath);
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (error) {
      console.error('[HomeScreen] 녹음 시작 실패:', error);
      Alert.alert('녹음 실패', '음성 녹음을 시작하지 못했습니다.');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const stopRecording = async () => {
    try {
      const filePath = await Sound.stopRecorder();
      setRecordedPath(filePath);
      isRecordingRef.current = false;
    } catch (error) {
      console.error('[HomeScreen] 녹음 종료 실패:', error);
      Alert.alert('녹음 실패', '음성 녹음을 종료하지 못했습니다.');
    } finally {
      setIsRecording(false);
    }
  };

  const handleVoicePress = async () => {
    if (isRequestingPermission) {
      return;
    }

    if (isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  };

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        Sound.stopRecorder().catch(() => {});
      }
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className=" mt-15 px-4 pt-6">
        <View className="flex-row items-center mt-3 relative overflow-visible">
          <View className="z-10 flex-1">
            <EragsLogo />
            <Text className="text-coment text-[#7F8389] mt-1 z-10">
              EMERGENCY RESPONSE AID GUIDANCE
            </Text>
            <View className=" mt-10 z-10"></View>
          </View>

          <View className="absolute right-[-18px] top-2 z-0 pointer-events-none">
            <MainIcon width={200} height={100} />
          </View>
        </View>
      </View>

      <View className="px-4 mt-6">
        <TouchableOpacity
          className="h-[120px] rounded-2xl bg-[#AF2E26] overflow-hidden flex-row items-center px-4"
          onPress={() => navigation.navigate('FirstAid')}
        >
          <View className="w-24 items-start justify-center">
            <MainIcon2 width={72} height={72} />
          </View>

          <View className="flex-1 pl-2">
            <Text className="text-title text-white font-suitBold">
              응급 처치 시작
            </Text>
            <Text className="text-coment text-white mt-2">
              사고 유형 선택 후 맞춤형 가이드를 시작합니다.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-5">
        <View className="flex-row justify-between gap-x-3">
          <TouchableOpacity
            className={`flex-1 h-[170px] border rounded-2xl px-2 py-4 overflow-hidden ${
              isRecording ? 'bg-[#3A1616] border-[#FF6B6B]' : 'bg-[#22262E] border-[#363C46]'
            }`}
            onPress={handleVoicePress}
            activeOpacity={0.85}
          >
            <View className="items-center mt-2">
              <MicIcon width={40} height={40} />
            </View>
            <View className="mt-4 items-center">
              <Text className="text-body text-white text-center font-suitBold">
                {isRecording ? '녹음 중지' : '음성으로 설명'}
              </Text>
            </View>
            <View className="mt-2 items-center w-full px-4">
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                className="text-coment text-gray text-center"
              >
                {isRecording
                  ? '다시 누르면 녹음이 종료됩니다.'
                  : '다친 부분을 음성으로 설명해주세요.'}
              </Text>
            </View>
            {recordedPath ? (
              <View className="mt-3 px-4">
                <Text
                  numberOfLines={1}
                  ellipsizeMode="middle"
                  className="text-[10px] text-[#9CA3AF] text-center"
                >
                  저장 경로: {recordedPath}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 h-[170px] bg-[#22262E] border border-[#363C46] rounded-2xl px-2 py-4 overflow-hidden"
            onPress={() => console.log('photo')}
          >
            <View className="items-center mt-2">
              <CameraIcon width={40} height={40} />
            </View>
            <View className="mt-4 items-center">
              <Text className="text-body text-white text-center font-suitBold">
                사진 촬영
              </Text>
            </View>

            <View className="mt-2 items-center w-full px-4">
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                className="text-coment text-gray text-center"
              >
                다친 부분을 촬영해주세요.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="h-[110px] bg-[#22262E] border border-[#363C46] rounded-2xl justify-center mt-4 px-4"
          onPress={() => navigation.navigate('MedicinesStock')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center flex-1">
              <MedicinesIcon width={40} height={40} />
              <View className="ml-3 flex-1">
                <Text className="text-title2 text-white font-sultBold">
                  약품 재고 확인
                </Text>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  className="mt-1 text-coment text-gray"
                >
                  보유중인 약품목록과 재고 현황을 확인합니다.
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
