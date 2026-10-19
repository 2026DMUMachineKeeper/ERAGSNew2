// 화면 이동 파라미터를 한곳에서 관리해 기능 화면 간 객체 결합을 막습니다.
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { EmergencyGuideScreen } from '@/screens/EmergencyGuideScreen';
import { FirstAidDetail } from '@/screens/FirstAidDetail';
import { FirstAidScreen } from '@/screens/FirstAidScreen';
import { MedicineAddScreen } from '@/screens/MedicineAddScreen';
import { MedicineDetailScreen } from '@/screens/MedicineDetailScreen';
import { MedicineManualInputScreen } from '@/screens/MedicineManualInputScreen';
import { KakaoMapScreen } from '@/screens/KakaoMapScreen';
import { PasswordResetScreen } from '@/screens/PasswordResetScreen';
import { QRCodeScreen } from '@/screens/QRCodeScreen';
import { WasteGuideScreen } from '@/screens/WasteGuideScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { useAuthStore } from '@/store';
import type { EmergencyGuideInput } from '@/types';

import { MainTabNavigator, type MainTabParamList } from './MainTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: NavigatorScreenParams<MainTabParamList> | undefined;
  MedicineDetail: { medicineId: string };
  MedicineAdd: undefined;
  MedicineManualInput: undefined;
  PasswordReset: undefined;
  FirstAid: undefined;
  FirstAidDetail: {
    mainId?: string;
    mainLabel?: string;
    isCompoundIntake?: boolean;
    continuation?: EmergencyGuideInput;
  } | undefined;
  EmergencyGuide: undefined;
  QRCode: undefined;
  WasteGuide: undefined;
  KakaoMap: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = (): React.JSX.Element => {
  const restoreSession = useAuthStore(state => state.restoreSession);
  const [initialRouteName, setInitialRouteName] = React.useState<
    keyof RootStackParamList | null
  >(null);

  React.useEffect(() => {
    let isActive = true;

    const loadInitialRoute = async (): Promise<void> => {
      const isSessionRestored = await restoreSession();

      if (isActive) {
        setInitialRouteName(isSessionRestored ? 'Home' : 'Login');
      }
    };

    loadInitialRoute();

    return () => {
      isActive = false;
    };
  }, [restoreSession]);

  if (initialRouteName === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false, statusBarStyle: 'dark' }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Home" component={MainTabNavigator} />
      <Stack.Screen name="MedicineDetail" component={MedicineDetailScreen} />
      <Stack.Screen name="MedicineAdd" component={MedicineAddScreen} />
      <Stack.Screen
        name="MedicineManualInput"
        component={MedicineManualInputScreen}
      />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
      <Stack.Screen name="FirstAid" component={FirstAidScreen} />
      <Stack.Screen name="FirstAidDetail" component={FirstAidDetail} />
      <Stack.Screen name="EmergencyGuide" component={EmergencyGuideScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} />
      <Stack.Screen name="WasteGuide" component={WasteGuideScreen} />
      <Stack.Screen name="KakaoMap" component={KakaoMapScreen} />
    </Stack.Navigator>
  );
};
