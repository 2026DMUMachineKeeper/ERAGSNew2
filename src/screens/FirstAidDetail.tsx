import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackIcon } from '../assets';
import { GuideActionButton } from '../components/EmergencyGuide/GuideActionButton';
import { useTreatment } from '../erags-sm1/context/TreatmentContext';
import type {
  AccidentType,
  BleedingLevel,
  PatientContext,
} from '../erags-sm1/machine/types';

type DetailProps = NativeStackScreenProps<RootStackParamList, 'FirstAidDetail'>;

const defaultPatientContext: PatientContext = {
  bleedingLevel: 'MEDIUM',
  consciousness: 'UNKNOWN',
  ageGroup: 'ADULT',
};

const getAccidentType = (mainLabel: string): AccidentType => {
  if (mainLabel.includes('화상')) {
    return 'BURN';
  }
  if (mainLabel.includes('골절')) {
    return 'FRACTURE';
  }
  if (mainLabel.includes('심폐')) {
    return 'CPR';
  }
  return 'BLEEDING';
};

const getBleedingLevel = (selectedId: string | null): BleedingLevel => {
  if (selectedId === 'a') {
    return 'LOW';
  }
  if (selectedId === 'c') {
    return 'HIGH';
  }
  return 'MEDIUM';
};

export function FirstAidDetail({ navigation, route }: DetailProps) {
  const treatment = useTreatment();
  const handledSessionIdRef = React.useRef<string | null>(null);
  const startedManualRef = React.useRef(false);
  const main = route.params?.mainLabel ?? '항목';
  const subtypes = [
    { id: 'a', label: `${main} - 경미한 출혈` },
    { id: 'b', label: `${main} - 일반 출혈` },
    { id: 'c', label: `${main} - 대량 출혈` },
  ];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selectedLabel =
    subtypes.find(item => item.id === selectedId)?.label ?? subtypes[0].label;
  const subtypeLabel = selectedLabel.replace(`${main} - `, '');
  const isStarting = treatment.state === 'loadingSession';

  React.useEffect(() => {
    if (!startedManualRef.current) {
      return;
    }

    const session = treatment.context.session;
    if (treatment.state !== 'showStep' || !session) {
      return;
    }

    if (handledSessionIdRef.current === session.sessionId) {
      return;
    }

    handledSessionIdRef.current = session.sessionId;
    navigation.navigate('EmergencyGuide', {
      mainLabel: main,
      subtypeLabel,
      source: 'machine',
    });
  }, [
    main,
    navigation,
    subtypeLabel,
    treatment.context.session,
    treatment.state,
  ]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="px-4 pt-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <BackIcon width={24} height={24} />
          </TouchableOpacity>

          <Text className="ml-3 text-body text-white tracking-erags font-suitBold">
            {main} 세부 유형 선택
          </Text>
        </View>

        <Text className="mt-2 text-lightGray text-body tracking-erags font-suitBold">
          해당되는 상태를 선택하세요.
        </Text>

        <View className="h-[1px] bg-lightGray rounded-full mt-2" />
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ marginTop: 12 }}>
          <FlatList
            data={subtypes}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`${
                  selectedId === item.id
                    ? 'border-[#12B76A]'
                    : 'border-[#363C46]'
                } py-4 px-3 bg-[#22262E] rounded-lg mb-3 border`}
                onPress={() => {
                  setSelectedId(item.id);
                }}
              >
                <Text className="text-white font-suitBold">{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={{ marginTop: 16, marginBottom: 20 }}>
          <GuideActionButton
            title={isStarting ? '가이드 준비 중...' : '다음 단계'}
            disabled={!selectedId || isStarting}
            onPress={() => {
              startedManualRef.current = true;
              treatment.manualInput(getAccidentType(main), {
                ...defaultPatientContext,
                bleedingLevel: getBleedingLevel(selectedId),
              });
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
