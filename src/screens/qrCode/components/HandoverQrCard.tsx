import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface Props {
  isIssuingQr: boolean;
  qrSvg: string | null;
  handoverError: string | null;
  onRenderError: (error: Error) => void;
}

export function HandoverQrCard({
  isIssuingQr,
  qrSvg,
  handoverError,
  onRenderError,
}: Props): React.JSX.Element {
  return (
    <View className="mt-5 items-center rounded-2xl bg-white p-6">
      {isIssuingQr ? (
        <>
          <ActivityIndicator color="#FF3A3A" />
          <Text className="mt-3 text-sm text-textDim">
            QR을 발급하고 있습니다.
          </Text>
        </>
      ) : qrSvg ? (
        <>
          <Text className="mb-3 text-sm text-black">
            구조대원에게 QR 코드를 보여주세요.
          </Text>
          <View className="aspect-square w-full items-center justify-center rounded-xl bg-white">
            <SvgXml
              height="92%"
              onError={onRenderError}
              testID="emergency-handover-qr"
              width="92%"
              xml={qrSvg}
            />
          </View>
          <Text className="mt-3 text-center text-xs text-placeholder">
            QR은 발급 후 30분 동안 조회할 수 있습니다.
          </Text>
        </>
      ) : (
        <Text className="text-center text-sm leading-6 text-red">
          {handoverError ?? 'QR을 발급하지 못했습니다.'}
          {'\n'}위 인계 요약을 직접 보여주세요.
        </Text>
      )}
    </View>
  );
}
