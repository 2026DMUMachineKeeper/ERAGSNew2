// 상태머신 결과를 화면으로 전달하기 위해 화면 이름과 params 타입을 한곳에서 관리합니다.
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { restoreAuthSession } from '@/services';
import type { EmergencyGuideResponse } from '@/types';

import { MainTabNavigator } from './MainTabNavigator';
import type { MedicineItem } from '../services/medicineApi';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  MedicineMemo: undefined;
  MedicineDetail: { medicine: MedicineItem };
  MedicineAdd: undefined;
  MedicineManualInput: undefined;
  PasswordReset: undefined;
  TestFont: undefined;
  FirstAid: undefined;
  FirstAidDetail: { mainId?: string; mainLabel?: string } | undefined;
  EmergencyGuide:
    | {
        mainLabel?: string;
        subtypeLabel?: string;
        source?: 'manual' | 'machine';
        guide?: EmergencyGuideResponse;
      }
    | undefined;
  QRCode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = (): React.JSX.Element => {
  const [initialRouteName, setInitialRouteName] = React.useState<
    keyof RootStackParamList | null
  >(null);

  React.useEffect(() => {
    let isActive = true;

    const loadInitialRoute = async (): Promise<void> => {
      try {
        await restoreAuthSession();

        if (isActive) {
          setInitialRouteName('Home');
        }
      } catch {
        if (isActive) {
          setInitialRouteName('Login');
        }
      }
    };

    loadInitialRoute();

    return () => {
      isActive = false;
    };
  }, []);

  if (initialRouteName === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Home" component={MainTabNavigator} />
      <Stack.Screen
        name="MedicineMemo"
        component={require('../screens/MedicineMemoScreen').MedicineMemoScreen}
      />
      <Stack.Screen
        name="MedicineDetail"
        component={
          require('../screens/MedicineDetailScreen').MedicineDetailScreen
        }
      />
      <Stack.Screen
        name="MedicineAdd"
        component={require('../screens/MedicineAddScreen').MedicineAddScreen}
      />
      <Stack.Screen
        name="MedicineManualInput"
        component={
          require('../screens/MedicineManualInputScreen')
            .MedicineManualInputScreen
        }
      />
      <Stack.Screen
        name="PasswordReset"
        component={
          require('../screens/PasswordResetScreen').PasswordResetScreen
        }
      />
      <Stack.Screen
        name="FirstAid"
        component={require('../screens/FirstAidScreen').FirstAidScreen}
      />
      <Stack.Screen
        name="FirstAidDetail"
        component={require('../screens/FirstAidDetail').FirstAidDetail}
      />
      <Stack.Screen
        name="EmergencyGuide"
        component={
          require('../screens/EmergencyGuideScreen').EmergencyGuideScreen
        }
      />
      <Stack.Screen
        name="QRCode"
        component={require('../screens/QRCodeScreen').QRCodeScreen}
      />
    </Stack.Navigator>
  );
};
