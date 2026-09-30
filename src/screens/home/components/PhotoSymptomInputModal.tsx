import React from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { PhotoInputStep } from '../useHomeEmergencyActions';

const styles = StyleSheet.create({
  photoListContent: { paddingRight: 4 },
});

interface PhotoSymptomInputModalProps {
  additionalText: string;
  isUploading: boolean;
  isVoiceRecording: boolean;
  isVoiceStarting: boolean;
  photoCount: number;
  photoUris: readonly string[];
  step: PhotoInputStep;
  onAddPhoto: () => void;
  onBack: () => void;
  onCancel: () => void;
  onChangeAdditionalText: (text: string) => void;
  onRemovePhoto: (index: number) => void;
  onSelectText: () => void;
  onSelectVoice: () => void;
  onStartVoice: () => void;
  onSendPhotosOnly: () => void;
  onSubmitText: () => void;
  onSubmitVoice: () => void;
}

interface ActionButtonProps {
  description?: string;
  isDisabled?: boolean;
  label: string;
  showsChevron?: boolean;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
}

const ActionButton = ({
  description,
  isDisabled = false,
  label,
  showsChevron = false,
  variant = 'secondary',
  onPress,
}: ActionButtonProps): React.JSX.Element => (
  <TouchableOpacity
    accessibilityRole="button"
    className={`mt-3 min-h-[64px] flex-row items-center rounded-2xl px-5 py-3 ${
      variant === 'primary' ? 'bg-red' : 'border border-memoLine bg-white'
    } ${isDisabled ? 'opacity-40' : ''}`}
    disabled={isDisabled}
    onPress={onPress}
  >
    <View className="flex-1">
      <Text
        className={`text-body font-suitBold ${
          variant === 'primary' ? 'text-white' : 'text-memoText'
        }`}
      >
        {label}
      </Text>
      {description ? (
        <Text
          className={`mt-1 text-coment font-suitRegular ${
            variant === 'primary' ? 'text-white/80' : 'text-memoSubText'
          }`}
        >
          {description}
        </Text>
      ) : null}
    </View>
    {showsChevron ? (
      <Text
        className={`ml-3 text-title2 font-suitRegular ${
          variant === 'primary' ? 'text-white' : 'text-memoSubText'
        }`}
      >
        ›
      </Text>
    ) : null}
  </TouchableOpacity>
);

const PhotoSymptomInputModal = ({
  additionalText,
  isUploading,
  isVoiceRecording,
  isVoiceStarting,
  photoCount,
  photoUris,
  step,
  onAddPhoto,
  onBack,
  onCancel,
  onChangeAdditionalText,
  onRemovePhoto,
  onSelectText,
  onSelectVoice,
  onStartVoice,
  onSendPhotosOnly,
  onSubmitText,
  onSubmitVoice,
}: PhotoSymptomInputModalProps): React.JSX.Element => (
  <Modal
    animationType="fade"
    onRequestClose={
      isUploading || isVoiceStarting
        ? (): void => undefined
        : step === 'options'
        ? onCancel
        : onBack
    }
    transparent
    visible={step !== null}
  >
    <View className="flex-1 justify-end bg-black/50">
      <View className="rounded-t-[32px] bg-white px-5 pb-8 pt-3">
        <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-memoLine" />
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-title2 font-suitBold text-black">
              사진으로 증상 입력
            </Text>
            <Text className="mt-2 text-coment leading-5 text-textDim">
              필요한 정보를 함께 보내면 더 정확한 안내를 받을 수 있어요.
            </Text>
          </View>
          <View className="min-w-[68px] items-center rounded-2xl bg-camera_bg px-3 py-2">
            <Text className="text-title2 font-suitBold text-red">
              {photoCount}
            </Text>
            <Text className="text-coment font-suitSemiBold text-textDim">
              최대 5장
            </Text>
          </View>
        </View>

        {photoUris.length > 0 ? (
          <ScrollView
            className="mt-5"
            contentContainerStyle={styles.photoListContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {photoUris.map((photoUri, index) => (
              <View
                className="relative mr-3 h-24 w-24 overflow-hidden rounded-2xl bg-memoLine"
                key={`${photoUri}-${index}`}
              >
                <Image
                  accessibilityLabel={`${index + 1}번째 촬영 사진`}
                  className="h-full w-full"
                  resizeMode="cover"
                  source={{ uri: photoUri }}
                />
                {!isUploading ? (
                  <TouchableOpacity
                    accessibilityLabel={`${index + 1}번째 사진 삭제`}
                    accessibilityRole="button"
                    className="absolute right-1.5 top-1.5 h-8 w-8 items-center justify-center rounded-full bg-black/70"
                    onPress={() => onRemovePhoto(index)}
                  >
                    <Text className="text-body font-suitBold text-white">
                      ×
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : null}

        {isUploading ? (
          <View className="mt-6 items-center">
            <ActivityIndicator color="#FF3A3A" />
            <Text className="mt-3 text-body font-suitSemiBold text-textDim">
              사진과 추가 설명을 전송하고 있습니다.
            </Text>
          </View>
        ) : null}

        {!isUploading && step === 'options' ? (
          <>
            <Text className="mt-5 text-body font-suitSemiBold text-black">
              사진을 더 촬영하거나 증상을 추가로 설명하시겠어요?
            </Text>
            <ActionButton
              description="다른 각도나 다친 부위의 사진을 추가해요."
              isDisabled={photoCount >= 5}
              label={photoCount >= 5 ? '사진 5장 선택 완료' : '사진 추가 촬영'}
              showsChevron={photoCount < 5}
              onPress={onAddPhoto}
            />
            <ActionButton
              description="통증, 출혈 정도, 다친 시점을 글로 적어요."
              label="텍스트로 추가 입력"
              showsChevron
              onPress={onSelectText}
            />
            <ActionButton
              description="말로 빠르게 상황을 설명해요."
              label="음성으로 추가 입력"
              showsChevron
              onPress={onSelectVoice}
            />
            <ActionButton
              description="현재 선택한 사진만 바로 보낼게요."
              label="추가 입력 없이 전송"
              showsChevron
              variant="primary"
              onPress={onSendPhotosOnly}
            />
          </>
        ) : null}

        {!isUploading && step === 'text' ? (
          <>
            <TextInput
              accessibilityLabel="사진 증상 추가 설명"
              className="mt-5 min-h-[120px] rounded-xl border border-memoLine px-4 py-3 text-body text-black"
              maxLength={1000}
              multiline
              onChangeText={onChangeAdditionalText}
              placeholder="통증, 출혈 정도, 다친 시점 등을 입력해 주세요."
              textAlignVertical="top"
              value={additionalText}
            />
            <ActionButton
              isDisabled={additionalText.trim().length === 0}
              label="사진과 텍스트 전송"
              variant="primary"
              onPress={onSubmitText}
            />
          </>
        ) : null}

        {!isUploading && step === 'voice' ? (
          <View className="mt-5">
            {isVoiceStarting ? (
              <>
                <ActivityIndicator color="#FF3A3A" />
                <Text className="mt-3 text-center text-body font-suitSemiBold text-textDim">
                  녹음을 준비하고 있습니다.
                </Text>
              </>
            ) : isVoiceRecording ? (
              <Text className="text-center text-body font-suitSemiBold text-red">
                녹음 중입니다. 설명을 마치면 아래 버튼을 눌러 주세요.
              </Text>
            ) : (
              <Text className="text-center text-body font-suitSemiBold text-textDim">
                준비가 되면 아래 버튼을 눌러 녹음을 시작해 주세요.
              </Text>
            )}
            <ActionButton
              isDisabled={isVoiceStarting}
              label={
                isVoiceStarting
                  ? '녹음 준비 중...'
                  : isVoiceRecording
                  ? '녹음 종료 및 함께 전송'
                  : '녹음 시작'
              }
              variant="primary"
              onPress={isVoiceRecording ? onSubmitVoice : onStartVoice}
            />
          </View>
        ) : null}

        <ActionButton
          isDisabled={isUploading || isVoiceStarting}
          label={
            isUploading
              ? '전송 중...'
              : step === 'options'
              ? '취소'
              : '뒤로 가기'
          }
          onPress={step === 'options' ? onCancel : onBack}
        />
      </View>
    </View>
  </Modal>
);

export default PhotoSymptomInputModal;
