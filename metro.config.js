const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },

  resolver: {
    unstable_enablePackageExports: false,

    blockList: /(?:android[\\/]app[\\/]\.cxx[\\/].*|android[\\/]\.cxx[\\/].*)$/,

    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),

    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
