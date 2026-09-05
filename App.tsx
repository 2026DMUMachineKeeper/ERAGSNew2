import 'react-native-gesture-handler';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { queryClient } from './src/query';
import { initializeTts } from './src/services/tts.service';

const App = (): React.JSX.Element => {
  React.useEffect(() => {
    initializeTts().catch((error: unknown) => {
      console.warn('[App] TTS 초기화 실패:', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

export default App;
