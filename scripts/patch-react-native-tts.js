const fs = require('fs');
const path = require('path');

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
