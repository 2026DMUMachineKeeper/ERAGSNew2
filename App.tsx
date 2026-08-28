import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initializeTts } from './src/services/tts.service';

enableScreens(false);

const App = (): React.JSX.Element => {
  React.useEffect(() => {
    initializeTts().catch((error: unknown) => {
      console.warn('[App] TTS 초기화 실패:', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
