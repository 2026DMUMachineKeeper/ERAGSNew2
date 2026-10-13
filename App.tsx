import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { queryClient } from './src/query';
import { initializeTts } from './src/services/tts.service';
import tailwindConfig from './tailwind.config';

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: tailwindConfig.colors.background },
};

const App = (): React.JSX.Element => {
  React.useEffect(() => {
    initializeTts().catch((error: unknown) => {
      console.warn('[App] TTS 초기화 실패:', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider className="bg-background">
        <StatusBar barStyle="dark-content" />
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
};

export default App;
