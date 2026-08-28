import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';

import tailwindConfig from '../../../../tailwind.config';

const { colors } = tailwindConfig;

interface QuickActionCardProps {
  description: string;
  icon: React.ReactNode;
  isLoading: boolean;
  title: string;
  onPress: (event: GestureResponderEvent) => void;
}

const QuickActionCard = ({
  description,
  icon,
  isLoading,
  title,
  onPress,
}: QuickActionCardProps): React.JSX.Element => (
  <TouchableOpacity
    className="h-[180px] w-full items-center rounded-2xl border border-white bg-white px-2 py-4 shadow-lg"
    disabled={isLoading}
    onPress={onPress}
  >
    <View className="mt-2 w-full items-center">
      {isLoading ? <ActivityIndicator color={colors.red} /> : icon}
    </View>
    <View className="mt-4 w-full items-center">
      <Text className="text-center text-body font-suitBold text-black">
        {title}
      </Text>
    </View>
    <View className="mt-2 w-full items-center px-4">
      <Text
        className="text-center text-coment text-textDim"
        ellipsizeMode="tail"
        numberOfLines={2}
      >
        {description}
      </Text>
    </View>
  </TouchableOpacity>
);

export default QuickActionCard;
