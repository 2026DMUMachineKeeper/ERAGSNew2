import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { MedicinesStockScreen } from '../screens/MedicinesStockScreen';

export type RootStackParamList = {
  Home: undefined;
  MedicinesStock: undefined;
  TestFont: undefined;
  FirstAid: undefined;
  FirstAidDetail: { mainId?: string; mainLabel?: string } | undefined;
  EmergencyGuide: { mainLabel?: string; subtypeLabel?: string } | undefined;
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
