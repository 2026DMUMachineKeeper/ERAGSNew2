import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Pressable,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  launchCamera,
  type Asset,
  type CameraOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import tailwindConfig from '../../../tailwind.config';
import { postMedicineVision } from '../../services';

const { colors } = tailwindConfig;

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
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  medicines: MedicineItem[];
  onSave?: () => void;
}) {
  const [expiryDate, setExpiryDate] = React.useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [name, setName] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [qty, setQty] = React.useState('1');
  const [uploading, setUploading] = React.useState(false);

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
        backgroundColor: `${colors.black}B3`,
        justifyContent: 'flex-end',
      }}
    >
      <View
        onStartShouldSetResponder={() => true}
        style={{
          backgroundColor: colors.sheetBg,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 30,
          height: 600,
          shadowColor: colors.black,
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
            backgroundColor: colors.placeholder,
            alignSelf: 'center',
            marginTop: 4,
            marginBottom: 28,
          }}
        />
        <View className="bg-gray border border-white rounded-lg p-3 mb-3">
          <TextInput
            placeholder="약품 이름"
            placeholderTextColor={colors.placeholder}
            className="text-white"
            value={name}
            onChangeText={setName}
          />
        </View>
        <View className="bg-gray border border-white rounded-lg p-3 mb-3">
          <TextInput
            placeholder="바코드"
            placeholderTextColor={colors.placeholder}
            className="text-white"
            value={barcode}
            onChangeText={setBarcode}
          />
        </View>
        <View className="bg-gray border border-white rounded-lg p-3 mb-3">
          <TextInput
            placeholder="수량"
            placeholderTextColor={colors.placeholder}
            className="text-white"
            value={qty}
            onChangeText={setQty}
            keyboardType="number-pad"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
          className="bg-gray border border-white rounded-lg p-3 mb-6"
        >
          <Text style={{ color: expiryDate ? colors.white : colors.placeholder }}>
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
          onPress={async () => {
            if (uploading) return;

            // eslint-disable-next-line no-console
            console.log('[AddMedicineBottomSheet] 촬영하기 눌림', {
              visible,
              name,
              barcode,
              qty,
              expiryDate: expiryDate?.toISOString?.() ?? null,
            });

            // Android 권한 요청
            if (Platform.OS === 'android') {
              // eslint-disable-next-line no-console
              console.log('[AddMedicineBottomSheet] 카메라 권한 요청 시작');
              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
                {
                  title: '카메라 권한 필요',
                  message: '약품 사진을 촬영하려면 카메라 권한이 필요합니다.',
                  buttonPositive: '허용',
                  buttonNegative: '취소',
                },
              );

              // eslint-disable-next-line no-console
              console.log('[AddMedicineBottomSheet] 카메라 권한 결과', {
                granted,
              });

              if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                Alert.alert('권한 필요', '카메라 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
                return;
              }
            }

            const options: CameraOptions = {
              mediaType: 'photo',
              includeBase64: true,
              saveToPhotos: false,
              quality: 0.35,
              maxWidth: 1024,
              maxHeight: 1024,
              cameraType: 'back',
            };

            try {
              setUploading(true);
              // eslint-disable-next-line no-console
              console.log('[AddMedicineBottomSheet] 카메라 실행');
              const response: ImagePickerResponse = await launchCamera(options);

              // eslint-disable-next-line no-console
              console.log('[AddMedicineBottomSheet] 카메라 응답 수신', {
                didCancel: response.didCancel,
                errorCode: response.errorCode ?? null,
                assetCount: response.assets?.length ?? 0,
              });

              if (response.didCancel) {
                // eslint-disable-next-line no-console
                console.log('[AddMedicineBottomSheet] 사용자가 촬영을 취소함');
                return;
              }

              if (response.errorCode) {
                // eslint-disable-next-line no-console
                console.log('[AddMedicineBottomSheet] 카메라 오류', {
                  errorCode: response.errorCode,
                  errorMessage: response.errorMessage ?? null,
                });
                Alert.alert('촬영 실패', response.errorMessage ?? response.errorCode);
                return;
              }

              const asset: Asset | undefined = response.assets?.[0];
              if (!asset || !asset.base64) {
                // eslint-disable-next-line no-console
                console.log('[AddMedicineBottomSheet] base64 누락', {
                  hasAsset: Boolean(asset),
                  hasBase64: Boolean(asset?.base64),
                });
                Alert.alert('업로드 실패', '촬영한 사진에서 데이터를 가져오지 못했습니다.');
                return;
              }

              // eslint-disable-next-line no-console
              console.log('[AddMedicineBottomSheet] 비전 API 전송 시작', {
                fileName: asset.fileName ?? null,
                type: asset.type ?? null,
                width: asset.width ?? null,
                height: asset.height ?? null,
                base64Length: asset.base64.length,
              });

              const quantityToAdd = Number(qty);
              const payload = await postMedicineVision({
                imageBase64: asset.base64,
                quantityToAdd: Number.isFinite(quantityToAdd) && quantityToAdd > 0 ? quantityToAdd : 1,
              });

              // eslint-disable-next-line no-console
              console.log('[AddMedicineBottomSheet] 비전 API 응답 수신', payload);

              // 가능한 여러 필드명에 대해 안전하게 읽어서 폼을 채움
              const pickString = (obj: any, keys: string[]) => {
                for (const k of keys) {
                  const v = obj?.[k];
                  if (typeof v === 'string' && v.trim().length > 0) return v;
                }
                return '';
              };

              const pickNumber = (obj: any, keys: string[]) => {
                for (const k of keys) {
                  const v = obj?.[k];
                  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
                  if (typeof v === 'string') {
                    const n = Number(v);
                    if (Number.isFinite(n)) return String(n);
                  }
                }
                return '';
              };

              const result = payload as Record<string, unknown>;

              const detectedName = pickString(result, ['name', 'medicineName', 'itemName', 'title']);
              const detectedBarcode = pickString(result, ['barcode', 'code', 'barcodeValue']);
              const detectedQty = pickNumber(result, ['qty', 'quantity', 'count', 'stock']);
              const detectedExpiry = pickString(result, ['expiry', 'expire_date', 'expiryDate', 'expirationDate', 'expiredAt']);

              // eslint-disable-next-line no-console
              console.log('[AddMedicineBottomSheet] 자동 채움 값', {
                detectedName,
                detectedBarcode,
                detectedQty,
                detectedExpiry,
              });

              if (detectedName) setName(detectedName);
              if (detectedBarcode) setBarcode(detectedBarcode);
              if (detectedQty) setQty(detectedQty || '1');
              if (detectedExpiry) setExpiryDate(new Date(detectedExpiry));

              Alert.alert('완료', '사진을 전송하고 정보를 채웠습니다.');
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('[AddMedicineBottomSheet] vision upload failed', e);
              Alert.alert('전송 실패', '사진을 서버로 전송하지 못했습니다.');
            } finally {
              setUploading(false);
            }
          }}
          style={{
            backgroundColor: colors.success,
            height: 58,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          {uploading ? (
            <ActivityIndicator color={colors.sheetBg} />
          ) : (
            <Text
              style={{
                color: colors.white,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              촬영하기
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (onSave) onSave();
            else onClose();
          }}
          style={{
            backgroundColor: colors.white,
            height: 58,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text
            style={{
              color: colors.sheetBg,
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
