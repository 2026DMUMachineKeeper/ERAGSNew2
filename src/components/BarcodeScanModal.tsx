import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';

export default function BarcodeScanModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}) {
  const lastScannedValue = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!visible) {
      lastScannedValue.current = null;
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '92%',
            backgroundColor: '#111827',
            borderRadius: 24,
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>
              바코드 인식
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#9CA3AF', fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              height: 320,
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: '#050816',
              marginBottom: 18,
            }}
          >
            {visible && (
              <>
                <Camera
                  style={StyleSheet.absoluteFill}
                  cameraType={CameraType.Back}
                  scanBarcode
                  onReadCode={event => {
                    const value = event.nativeEvent.codeStringValue;
                    if (!value || value === lastScannedValue.current) return;
                    lastScannedValue.current = value;
                    onScanned(value);
                    onClose();
                  }}
                />
                <View style={styles.scanOverlay}>
                  <View style={styles.scanFrame}>
                    <View style={styles.cornerTopLeft} />
                    <View style={styles.cornerTopRight} />
                    <View style={styles.cornerBottomLeft} />
                    <View style={styles.cornerBottomRight} />
                  </View>
                  <Text style={styles.scanHint}>
                    바코드를 가운데에 맞춰주세요
                  </Text>
                </View>
              </>
            )}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{ marginTop: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#9CA3AF' }}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  scanFrame: {
    width: '72%',
    height: 170,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2ECC71',
    padding: 14,
  },
  scanHint: {
    color: 'white',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    left: -2,
    top: -2,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2ECC71',
    borderTopLeftRadius: 20,
  },
  cornerTopRight: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2ECC71',
    borderTopRightRadius: 20,
  },
  cornerBottomLeft: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#2ECC71',
    borderBottomLeftRadius: 20,
  },
  cornerBottomRight: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#2ECC71',
    borderBottomRightRadius: 20,
  },
});
