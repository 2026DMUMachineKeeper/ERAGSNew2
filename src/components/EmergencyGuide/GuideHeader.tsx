import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BackIcon } from '../../assets';
import { GuideProgressBar } from './GuideProgressBar';

type GuideHeaderProps = {
  centerLabel: string;
  centerValue: string;
  elapsedLabel: string;
  progress: number;
  showBackButton?: boolean;
  onBackPress: () => void;
};

export function GuideHeader({
  centerLabel,
  centerValue,
  elapsedLabel,
  progress,
  showBackButton = true,
  onBackPress,
}: GuideHeaderProps) {
  return (
    <View className="px-4 pt-10">
      <View className="flex-row items-center">
        <View className="w-6">
          {showBackButton ? (
            <TouchableOpacity onPress={onBackPress}>
              <BackIcon width={24} height={24} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-1 items-center px-2">
          <Text className="text-xs text-lightGray tracking-erags">
            {centerLabel}
          </Text>
          <Text
            className="mt-1 text-body text-black tracking-erags text-center font-suitBold"
            numberOfLines={1}
          >
            {centerValue}
          </Text>
        </View>

        <Text className="text-sm text-red tracking-erags">
          {elapsedLabel}
        </Text>
      </View>

      <GuideProgressBar progress={progress} />
    </View>
  );
}
