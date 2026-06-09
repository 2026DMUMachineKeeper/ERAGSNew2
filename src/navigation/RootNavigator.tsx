// 상태머신 결과를 어떤 화면으로 보낼지 연결하려고 화면 이름/params 타입을 한 곳에 정리한 것 (상태머신->화면 전환)
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { MedicinesStockScreen } from '../screens/MedicinesStockScreen';

export type RootStackParamList = {
  Home: undefined;
  MedicinesStock: undefined;
  MedicineMemo: undefined;
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
  EmergencyComplete:
    | {
        mainLabel?: string;
        subtypeLabel?: string;
        elapsedLabel?: string;
        completedSteps?: number;
        totalSteps?: number;
      }
    | undefined;
  QRCode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />

      <Stack.Screen name="MedicinesStock" component={MedicinesStockScreen} />
      <Stack.Screen
        name="MedicineMemo"
        component={require('../screens/MedicineMemoScreen').MedicineMemoScreen}
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
        name="EmergencyComplete"
        component={
          require('../screens/EmergencyCompleteScreen').EmergencyCompleteScreen
        }
      />
      <Stack.Screen
        name="QRCode"
        component={require('../screens/QRCodeScreen').QRCodeScreen}
      />
    </Stack.Navigator>
  );
}
