import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TreatmentProvider } from './src/erags-sm1/context/TreatmentContext';

enableScreens(false);

function App() {
  return (
    <SafeAreaProvider>
      <TreatmentProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </TreatmentProvider>
    </SafeAreaProvider>
  );
}

export default App;
