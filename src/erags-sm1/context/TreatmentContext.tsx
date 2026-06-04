// hook 결과를 앱 전체에서 공유하게 해주는 Context Provider
// HomeScreen.tsx / FirstAidDetail.tsx / EmergencyGuideScreen.tsx = useTreatment()으로 상태머신 사용
// 화면이 바뀌어도 같은 상태머신 상태를 유지하려면, 상태머신을 특정 화면 안에만 두면 안 되고 앱 위쪽 Provider에 올려야 함.
import React, { createContext, useContext, useMemo } from 'react';
import { useTreatmentMachine } from '../hooks/useTreatmentMachine';
import { createDefaultPortsWithStt } from '../ports';

type TreatmentHook = ReturnType<typeof useTreatmentMachine>;

const TreatmentCtx = createContext<TreatmentHook | null>(null);

export function TreatmentProvider({ children }: { children: React.ReactNode }) {
  const ports = useMemo(() => createDefaultPortsWithStt(), []);
  const treatment = useTreatmentMachine(ports);

  return (
    <TreatmentCtx.Provider value={treatment}>
      {children}
    </TreatmentCtx.Provider>
  );
}

export function useTreatment(): TreatmentHook {
  const ctx = useContext(TreatmentCtx);
  if (!ctx) {
    throw new Error('useTreatment must be used within TreatmentProvider');
  }
  return ctx;
}
