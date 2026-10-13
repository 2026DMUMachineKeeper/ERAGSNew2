import React from 'react';
import { View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import tailwindConfig from '../../tailwind.config';
import { HomeScreen } from '../screens/HomeScreen';
import { KakaoMapScreen } from '../screens/KakaoMapScreen';
import { MedicineMemoScreen } from '../screens/MedicineMemoScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  MedicinesTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const { colors } = tailwindConfig;

const tabItems = {
  HomeTab: { label: '홈' },
  MapTab: { label: '지도' },
  MedicinesTab: { label: '약품' },
  SettingsTab: { label: '마이페이지' },
} as const;

type TabRouteName = keyof typeof tabItems;

const centeredTabBarButtonStyle = {
  justifyContent: 'center' as const,
  padding: 0,
};

const CenteredTabBarButton = ({
  style,
  ...props
}: BottomTabBarButtonProps): React.JSX.Element => (
  <PlatformPressable
    {...props}
    style={[style, centeredTabBarButtonStyle]}
  />
);

const HomeTabIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4.5 10.5L12 4L19.5 10.5V19C19.5 19.55 19.05 20 18.5 20H14.5V14H9.5V20H5.5C4.95 20 4.5 19.55 4.5 19V10.5Z"
      fill={color}
      stroke={color}
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
  </Svg>
);

const MapTabIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4.5 5.5L9.5 3.5L14.5 5.5L19.5 3.5V18.5L14.5 20.5L9.5 18.5L4.5 20.5V5.5Z"
      stroke={color}
      strokeLinejoin="round"
      strokeWidth={1.7}
    />
    <Path
      d="M9.5 3.5V18.5M14.5 5.5V20.5"
      stroke={color}
      strokeWidth={1.7}
    />
    <Path
      d="M12 7.25C10.48 7.25 9.25 8.48 9.25 10C9.25 12.13 12 15.25 12 15.25C12 15.25 14.75 12.13 14.75 10C14.75 8.48 13.52 7.25 12 7.25Z"
      fill={color}
    />
    <Circle cx={12} cy={10} r={1} fill={colors.white} />
  </Svg>
);

const MedicineTabIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
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
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
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

  if (routeName === 'MapTab') {
    return (
      <View className="items-center justify-center">
        <MapTabIcon color={iconColor} />
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
  const insets = useSafeAreaInsets();

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
          height: 70 + insets.bottom,
          marginBottom: 0,
          paddingBottom: insets.bottom,
          paddingHorizontal: 0,
          borderTopWidth: 0,
          backgroundColor: colors.white,
          elevation: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'SUIT-Bold',
          fontSize: 10,
          lineHeight: 14,
        },
        tabBarButton: CenteredTabBarButton,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen
        name="MapTab"
        component={KakaoMapScreen}
        options={{ lazy: false }}
      />
      <Tab.Screen name="MedicinesTab" component={MedicineMemoScreen} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
