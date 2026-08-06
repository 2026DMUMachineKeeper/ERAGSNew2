const fs = require('fs');
const path = require('path');

const voiceRoot = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-voice',
  'voice',
);
const buildGradlePath = path.join(voiceRoot, 'android', 'build.gradle');
const indexJsPath = path.join(voiceRoot, 'dist', 'index.js');

if (!fs.existsSync(voiceRoot)) {
  process.exit(0);
}

if (fs.existsSync(buildGradlePath)) {
  fs.writeFileSync(
    buildGradlePath,
    `apply plugin: 'com.android.library'

repositories {
    mavenLocal()
    google()
    mavenCentral()
}

android {
    namespace 'com.wenkesj.voice'
    compileSdk rootProject.ext.has('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36

    defaultConfig {
        minSdk rootProject.ext.has('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
        targetSdk rootProject.ext.has('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
        versionCode 1
        versionName '1.0'
    }
}

dependencies {
    implementation 'com.facebook.react:react-android'
    implementation 'androidx.annotation:annotation:1.9.1'
}
`,
  );
}

if (fs.existsSync(indexJsPath)) {
  const indexJs = fs.readFileSync(indexJsPath, 'utf8');
  fs.writeFileSync(
    indexJsPath,
    indexJs.replace(
      'const Voice = react_native_1.NativeModules.Voice;',
      'const Voice = react_native_1.NativeModules.Voice || react_native_1.NativeModules.RCTVoice;',
    ),
  );
}

const ttsBuildGradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-tts',
  'android',
  'build.gradle',
);

if (fs.existsSync(ttsBuildGradlePath)) {
  fs.writeFileSync(
    ttsBuildGradlePath,
    `apply plugin: 'com.android.library'

android {
    namespace 'net.no_mad.tts'
    compileSdk rootProject.ext.has('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36

    defaultConfig {
        minSdk rootProject.ext.has('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
        targetSdk rootProject.ext.has('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation 'com.facebook.react:react-android'
}
`,
  );
}
