import React from 'react';
import { Text, TextInput, View } from 'react-native';

import tailwindConfig from '../../../../tailwind.config';

interface MedicineSearchInputProps {
  searchQuery: string;
  onChangeText: (query: string) => void;
}
export const MedicineSearchInput = ({
  searchQuery,
  onChangeText,
}: MedicineSearchInputProps): React.JSX.Element => {
  const { colors } = tailwindConfig;
  return (
    <View className="mt-5 h-12 flex-row items-center rounded-2xl bg-memoCard px-4">
      <Text className="mr-2 text-base text-memoSubText">⌕</Text>
      <TextInput
        accessibilityLabel="약품 이름 검색"
        autoCorrect={false}
        className="flex-1 text-sm font-suitRegular text-memoText"
        onChangeText={onChangeText}
        placeholder="약품 이름으로 검색"
        placeholderTextColor={colors.memoSubText}
        returnKeyType="search"
        value={searchQuery}
      />
    </View>
  );
};
export default MedicineSearchInput;
