/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: process.env,
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  StackActions: {
    replace: jest.fn((name, params) => ({ type: 'REPLACE', payload: { name, params } })),
  },
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('react-native-camera-kit', () => ({
  Camera: 'Camera',
  CameraType: {
    Back: 'back',
    Front: 'front',
  },
}));
