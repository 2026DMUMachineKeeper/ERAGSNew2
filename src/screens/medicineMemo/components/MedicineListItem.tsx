import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { MedicineItem } from '@/services/medicineApi';

interface MedicineListItemProps {
  medicine: MedicineItem;
  onPress: (medicine: MedicineItem) => void;
}

interface MedicineColorClasses {
  backgroundClassName: string;
  borderClassName: string;
  textClassName: string;
}

const MEDICINE_COLOR_CLASSES: MedicineColorClasses[] = [
  {
    backgroundClassName: 'bg-memoRed/10',
    borderClassName: 'border-memoRed',
    textClassName: 'text-memoRed',
  },
  {
    backgroundClassName: 'bg-memoOrange/10',
    borderClassName: 'border-memoOrange',
    textClassName: 'text-memoOrange',
  },
  {
    backgroundClassName: 'bg-memoGreen/10',
    borderClassName: 'border-memoGreen',
    textClassName: 'text-memoGreen',
  },
  {
    backgroundClassName: 'bg-memoBlue/10',
    borderClassName: 'border-memoBlue',
    textClassName: 'text-memoBlue',
  },
  {
    backgroundClassName: 'bg-memoPurple/10',
    borderClassName: 'border-memoPurple',
    textClassName: 'text-memoPurple',
  },
  {
    backgroundClassName: 'bg-memoPink/10',
    borderClassName: 'border-memoPink',
    textClassName: 'text-memoPink',
  },
  {
    backgroundClassName: 'bg-memoSubText/10',
    borderClassName: 'border-memoSubText',
    textClassName: 'text-memoSubText',
  },
];

const getMedicineColorClasses = (medicineId: string): MedicineColorClasses => {
  const colorIndex =
    medicineId
      .split('')
      .reduce(
        (characterCodeSum, character) =>
          characterCodeSum + character.charCodeAt(0),
        0,
      ) % MEDICINE_COLOR_CLASSES.length;

  return MEDICINE_COLOR_CLASSES[colorIndex];
};

const MedicineListItem = React.memo(
  ({ medicine, onPress }: MedicineListItemProps): React.JSX.Element => {
    const colorClasses = getMedicineColorClasses(medicine.id);

    const handlePress = (): void => {
      onPress(medicine);
    };

    return (
      <TouchableOpacity
        accessibilityLabel={`${medicine.name}, 수량 ${medicine.qty}개`}
        accessibilityRole="button"
        activeOpacity={0.85}
        className="mb-2 min-h-[58px] flex-row items-center rounded-2xl bg-memoCard px-3"
        onPress={handlePress}
      >
        <View
          className={`h-9 w-9 items-center justify-center rounded-full ${colorClasses.backgroundClassName}`}
        >
          <View
            className={`h-5 w-5 rotate-45 rounded-md border-2 ${colorClasses.borderClassName}`}
          />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-sm font-suitBold text-memoText">
            {medicine.name}
          </Text>
        </View>

        <View
          className={`rounded-full px-2 py-1 ${colorClasses.backgroundClassName}`}
        >
          <Text
            className={`text-xs font-suitBold ${colorClasses.textClassName}`}
          >
            {medicine.qty}개
          </Text>
        </View>
        <Text className="ml-2 text-lg text-memoSubText">›</Text>
      </TouchableOpacity>
    );
  },
);

MedicineListItem.displayName = 'MedicineListItem';

export default MedicineListItem;
