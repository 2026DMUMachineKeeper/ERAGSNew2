module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // 전체 병렬 실행 시 화면 테스트가 기본 5초를 넘겨 실패하고,
  // 멈추지 않은 이전 테스트의 비동기 작업이 다음 테스트를 오염시키는 문제를 막습니다.
  testTimeout: 20000,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation/routers)/)',
  ],
};
