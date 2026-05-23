import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { MedicinesStockScreen } from '../screens/MedicinesStockScreen';

export type RootStackParamList = {
  Home: undefined;
  MedicinesStock: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="MedicinesStock" component={MedicinesStockScreen} />
    </Stack.Navigator>
  );
}
