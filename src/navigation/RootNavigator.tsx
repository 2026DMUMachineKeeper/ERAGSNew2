// 상태머신 결과를 화면으로 전달하기 위해 화면 이름과 params 타입을 한곳에서 관리합니다.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';

import { EmergencyGuideScreen } from '../screens/EmergencyGuideScreen';
import { FirstAidDetail } from '../screens/FirstAidDetail';
import { FirstAidScreen } from '../screens/FirstAidScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MedicineAddScreen } from '../screens/MedicineAddScreen';
import { MedicineDetailScreen } from '../screens/MedicineDetailScreen';
import { MedicineManualInputScreen } from '../screens/MedicineManualInputScreen';
import { MedicineMemoScreen } from '../screens/MedicineMemoScreen';
import { MedicinesStockScreen } from '../screens/MedicinesStockScreen';
import { QRCodeScreen } from '../screens/QRCodeScreen';
import type { MedicineItem } from '../services/medicineApi';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
  MedicinesStock: undefined;
  MedicineMemo: undefined;
  MedicineDetail: { medicine: MedicineItem };
  MedicineAdd: undefined;
  MedicineManualInput: undefined;
  TestFont: undefined;
  FirstAid: undefined;
  FirstAidDetail: { mainId?: string; mainLabel?: string } | undefined;
  EmergencyGuide:
    | {
        mainLabel?: string;
        subtypeLabel?: string;
        source?: 'manual' | 'machine';
      }
    | undefined;
  QRCode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = (): React.JSX.Element => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />

      <Stack.Screen name="MedicinesStock" component={MedicinesStockScreen} />
      <Stack.Screen name="MedicineMemo" component={MedicineMemoScreen} />
      <Stack.Screen name="MedicineDetail" component={MedicineDetailScreen} />
      <Stack.Screen name="MedicineAdd" component={MedicineAddScreen} />
      <Stack.Screen
        name="MedicineManualInput"
        component={MedicineManualInputScreen}
      />
      <Stack.Screen name="FirstAid" component={FirstAidScreen} />
      <Stack.Screen name="FirstAidDetail" component={FirstAidDetail} />
      <Stack.Screen name="EmergencyGuide" component={EmergencyGuideScreen} />
      <Stack.Screen name="QRCode" component={QRCodeScreen} />
    </Stack.Navigator>
  );
};
