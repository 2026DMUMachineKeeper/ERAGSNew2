import React from 'react';
import { Text, View } from 'react-native';

import { EragsLogo, MainIcon } from '@/assets/icons';

const HomeHeader = (): React.JSX.Element => (
  <View className="mt-15 px-4 pt-6">
    <View className="relative mt-3 flex-row items-center overflow-visible">
      <View className="z-10 flex-1">
        <EragsLogo />
        <Text className="z-10 mt-1 text-coment text-textDim">
          EMERGENCY RESPONSE AID GUIDANCE
        </Text>
        <View className="z-10 mt-10" />
      </View>

      <View className="pointer-events-none absolute right-[-18px] top-2 z-0">
        <MainIcon width={200} height={100} />
      </View>
    </View>
  </View>
);

export default HomeHeader;
