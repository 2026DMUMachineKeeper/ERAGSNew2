package com.eragsnew2

import android.media.MediaRecorder
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class VoiceRecorderModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private var recorder: MediaRecorder? = null
  private var outputFile: File? = null
  private var recordingStartedAtMs: Long = 0

  override fun getName(): String = "VoiceRecorder"

  @ReactMethod
  fun start(promise: Promise) {
    if (recorder != null) {
      promise.reject("ALREADY_RECORDING", "Voice recording is already in progress.")
      return
    }

    try {
      val recordingsDir = File(reactContext.cacheDir, "voice-recordings")
      if (!recordingsDir.exists()) {
        recordingsDir.mkdirs()
      }

      val file = File(recordingsDir, "voice-${System.currentTimeMillis()}.m4a")
      val mediaRecorder = MediaRecorder().apply {
        setAudioSource(MediaRecorder.AudioSource.MIC)
        setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        setAudioEncodingBitRate(128000)
        setAudioSamplingRate(44100)
        setOutputFile(file.absolutePath)
        prepare()
        start()
      }

      recorder = mediaRecorder
      outputFile = file
      recordingStartedAtMs = System.currentTimeMillis()
      promise.resolve(Uri.fromFile(file).toString())
    } catch (error: Exception) {
      recorder?.release()
      recorder = null
      outputFile = null
      recordingStartedAtMs = 0
      promise.reject("START_RECORDING_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    val mediaRecorder = recorder
    val file = outputFile

    if (mediaRecorder == null || file == null) {
      promise.reject("NOT_RECORDING", "Voice recording is not in progress.")
      return
    }

    try {
      if (System.currentTimeMillis() - recordingStartedAtMs < 1000) {
        runCatching { mediaRecorder.stop() }
        mediaRecorder.release()
        file.delete()
        promise.reject("RECORDING_TOO_SHORT", "Recording is too short.")
        return
      }

      mediaRecorder.stop()
      mediaRecorder.release()
      promise.resolve(Uri.fromFile(file).toString())
    } catch (error: Exception) {
      file.delete()
      promise.reject("STOP_RECORDING_FAILED", error.message, error)
    } finally {
      recorder = null
      outputFile = null
      recordingStartedAtMs = 0
    }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    val mediaRecorder = recorder
    val file = outputFile

    try {
      mediaRecorder?.run {
        stop()
        release()
      }
      file?.delete()
      promise.resolve(null)
    } catch (error: Exception) {
      file?.delete()
      promise.reject("CANCEL_RECORDING_FAILED", error.message, error)
    } finally {
      recorder = null
      outputFile = null
      recordingStartedAtMs = 0
    }
  }
}
