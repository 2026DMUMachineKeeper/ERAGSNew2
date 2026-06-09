import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

type SubtypeItem = {
  id: string;
  label: string;
};

type SubtypeOptionListProps = {
  items: SubtypeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function SubtypeOptionList({
  items,
  selectedId,
  onSelect,
}: SubtypeOptionListProps) {
  return (
    <View className="px-4 mt-3 flex-1">
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            className={`py-4 px-3 bg-surface border rounded-lg mb-3 ${
              selectedId === item.id ? 'border-red' : 'border-borderMuted'
            }`}
            onPress={() => onSelect(item.id)}
          >
            <Text className="text-white">{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
