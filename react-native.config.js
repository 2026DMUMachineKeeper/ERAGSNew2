const path = require('path');

module.exports = {
  assets: ['./src/assets/fonts'],
  dependencies: {
    '@react-native-community/javascriptcore': {
      root: path.join(__dirname, 'node_modules/@react-native-community/javascriptcore'),
      platforms: {
        android: {
          sourceDir: path.join(
            __dirname,
            'node_modules/@react-native-community/javascriptcore/android',
          ),
          packageImportPath:
            'io.github.reactnativecommunity.javascriptcore.JSCPackage',
          packageInstance:
            'new io.github.reactnativecommunity.javascriptcore.JSCPackage()',
        },
      },
    },
  },
};
