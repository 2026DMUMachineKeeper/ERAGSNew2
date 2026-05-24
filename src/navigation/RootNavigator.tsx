import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { MedicinesStockScreen } from '../screens/MedicinesStockScreen';

export type RootStackParamList = {
  Home: undefined;
  MedicinesStock: undefined;
  FirstAid: undefined;
  FirstAidDetail: { mainId?: string; mainLabel?: string } | undefined;
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
    </Stack.Navigator>
  );
}
