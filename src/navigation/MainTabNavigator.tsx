import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Circle, Path } from 'react-native-svg';

import tailwindConfig from '../../tailwind.config';
import { HomeScreen } from '../screens/HomeScreen';
import { MedicineMemoScreen } from '../screens/MedicineMemoScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  MedicinesTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const { colors } = tailwindConfig;

const tabItems = {
  HomeTab: { label: '홈' },
  MedicinesTab: { label: '약품' },
  SettingsTab: { label: '마이페이지' },
} as const;

type TabRouteName = keyof typeof tabItems;

const HomeTabIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4.5 10.5L12 4L19.5 10.5V19C19.5 19.55 19.05 20 18.5 20H14.5V14H9.5V20H5.5C4.95 20 4.5 19.55 4.5 19V10.5Z"
      fill={color}
      stroke={color}
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
  </Svg>
);

const MedicineTabIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 5.25C8 4.55964 8.55964 4 9.25 4H14.75C15.4404 4 16 4.55964 16 5.25V6.5H8V5.25Z"
      fill={color}
    />
    <Path
      d="M6.5 9C6.5 7.89543 7.39543 7 8.5 7H15.5C16.6046 7 17.5 7.89543 17.5 9V18C17.5 19.1046 16.6046 20 15.5 20H8.5C7.39543 20 6.5 19.1046 6.5 18V9Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M9.25 13.5H14.75M12 10.75V16.25"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

const MyPageTabIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={1.9} />
    <Path
      d="M5.25 20C5.9 16.55 8.35 14.5 12 14.5C15.65 14.5 18.1 16.55 18.75 20"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);

const renderTabIcon = (routeName: TabRouteName, focused: boolean) => {
  const iconColor = focused ? colors.red : colors.textDim;

  if (routeName === 'MedicinesTab') {
    return (
      <View className="items-center justify-center">
        <MedicineTabIcon color={iconColor} />
      </View>
    );
  }

  if (routeName === 'SettingsTab') {
    return (
      <View className="items-center justify-center">
        <MyPageTabIcon color={iconColor} />
      </View>
    );
  }

  return (
    <View className="items-center justify-center">
      <HomeTabIcon color={iconColor} />
    </View>
  );
};

export function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabel: tabItems[route.name as TabRouteName].label,
        tabBarIcon: ({ focused }) =>
          renderTabIcon(route.name as TabRouteName, focused),
        tabBarStyle: {
          height: 78,
          marginHorizontal: 16,
          marginBottom: 12,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 0,
          borderRadius: 24,
          backgroundColor: colors.white,
          elevation: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'SUIT-Bold',
          fontSize: 12,
          lineHeight: 16,
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="MedicinesTab" component={MedicineMemoScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
