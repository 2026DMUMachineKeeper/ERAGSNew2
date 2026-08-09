package com.eragsnew2

import android.location.Address
import android.location.Geocoder
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class AddressModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AddressModule"

  @ReactMethod
  fun getAddress(latitude: Double, longitude: Double, promise: Promise) {
    if (!Geocoder.isPresent()) {
      promise.reject("GEOCODER_UNAVAILABLE", "이 기기에서는 주소 변환을 지원하지 않습니다.")
      return
    }

    val geocoder = Geocoder(reactApplicationContext, Locale.KOREA)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      geocoder.getFromLocation(
          latitude,
          longitude,
          1,
          object : Geocoder.GeocodeListener {
            override fun onGeocode(addresses: MutableList<Address>) {
              resolveAddress(addresses, promise)
            }

            override fun onError(errorMessage: String?) {
              promise.reject("GEOCODING_FAILED", errorMessage ?: "주소를 찾지 못했습니다.")
            }
          },
      )
      return
    }

    reactApplicationContext.runOnNativeModulesQueueThread {
      try {
        @Suppress("DEPRECATION")
        val addresses = geocoder.getFromLocation(latitude, longitude, 1).orEmpty()
        resolveAddress(addresses, promise)
      } catch (error: Exception) {
        promise.reject("GEOCODING_FAILED", "주소를 찾지 못했습니다.", error)
      }
    }
  }

  private fun resolveAddress(addresses: List<Address>, promise: Promise) {
    val address = addresses.firstOrNull()?.getAddressLine(0)
    if (address.isNullOrBlank()) {
      promise.reject("ADDRESS_NOT_FOUND", "주소를 찾지 못했습니다.")
      return
    }

    promise.resolve(address)
  }
}
