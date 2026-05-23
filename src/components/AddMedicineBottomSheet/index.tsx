import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type MedicineItem = {
  id: string;
  name: string;
  info: string;
  qty: number;
  expiry: string;
};

export default function AddMedicineBottomSheet({
  visible,
  onClose,
  medicines,
  onOpenScanModal,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  medicines: MedicineItem[];
  onOpenScanModal: () => void;
  onSave?: () => void;
}) {
  const [expiryDate, setExpiryDate] = React.useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };
  React.useEffect(() => {
    console.log('[AddMedicineBottomSheet] visible changed:', visible);
  }, [visible]);

  if (!visible) return null;

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        elevation: 999,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
      }}
    >
      <View
        onStartShouldSetResponder={() => true}
        style={{
          backgroundColor: '#0F172A',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 30,
          height: 600,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -6 },
          elevation: 16,
        }}
      >
        <View
          style={{
            width: 60,
            height: 5,
            borderRadius: 999,
            backgroundColor: '#9CA3AF',
            alignSelf: 'center',
            marginTop: 4,
            marginBottom: 28,
          }}
        />
        <View className="bg-gray border border-white rounded-lg p-3 mb-3">
          <TextInput
            placeholder="약품 이름"
            placeholderTextColor="#9CA3AF"
            className="text-white"
          />
        </View>
        <View className="bg-gray border border-white rounded-lg p-3 mb-3">
          <TextInput
            placeholder="바코드"
            placeholderTextColor="#9CA3AF"
            className="text-white"
          />
        </View>
        <View className="bg-gray border border-white rounded-lg p-3 mb-3">
          <TextInput
            placeholder="수량"
            placeholderTextColor="#9CA3AF"
            className="text-white"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
          className="bg-gray border border-white rounded-lg p-3 mb-6"
        >
          <Text style={{ color: expiryDate ? '#FFFFFF' : '#9CA3AF' }}>
            {expiryDate ? expiryDate.toLocaleDateString('ko-KR') : '유통기한 선택'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={expiryDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
            maximumDate={new Date(2100, 12, 31)}
          />
        )}
        <TouchableOpacity
          onPress={onOpenScanModal}
          style={{
            backgroundColor: '#2ECC71',
            height: 58,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            + 약품 코드 스캔
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (onSave) onSave();
            else onClose();
          }}
          style={{
            backgroundColor: '#ffffff',
            height: 58,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: '#0F172A',
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            저장하기
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}
