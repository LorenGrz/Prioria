package com.lorengrz.prioria

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class NotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NotificationModule"

    companion object {
        private var instance: NotificationModule? = null

        fun getInstance() = instance

        const val EVENT_NAME = "onSystemNotificationReceived"
    }

    init {
        instance = this
    }

    fun sendNotificationEvent(packageName: String, appName: String, title: String, body: String) {
        if (!reactContext.hasActiveReactInstance()) return
        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("appName", appName)
            putString("title", title)
            putString("body", body)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_NAME, params)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
