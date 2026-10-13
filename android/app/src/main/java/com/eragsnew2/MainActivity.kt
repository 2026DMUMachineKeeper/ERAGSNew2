package com.eragsnew2

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "ERAGSNew2"

  /**
   * 카메라 등 외부 앱이 떠 있는 동안 프로세스가 종료된 뒤 돌아오면 Android가 저장된 Fragment
   * 상태를 복원하려 하는데, react-native-screens의 ScreenStackFragment는 이 복원을 지원하지
   * 않아 크래시가 납니다(알려진 이슈). 저장 상태를 넘기지 않아 React Native가 처음부터 다시
   * 그리게 합니다.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
