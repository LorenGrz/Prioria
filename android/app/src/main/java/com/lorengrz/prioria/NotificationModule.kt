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

        const val EVENT_NOTIFICATION  = "onSystemNotificationReceived"
        const val EVENT_WIDGET_BOOST  = "onWidgetTapBoost"
    }

    init {
        instance = this
    }

    // Called by PrioriaNotificationListener when a system notification arrives
    fun sendNotificationEvent(packageName: String, appName: String, title: String, body: String) {
        if (!reactContext.hasActiveReactInstance()) return
        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("appName", appName)
            putString("title", title)
            putString("body", body)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        emit(EVENT_NOTIFICATION, params)
    }

    // Called by MainActivity.onNewIntent when the widget is tapped
    fun sendBoostEvent(notificationId: String) {
        if (!reactContext.hasActiveReactInstance()) return
        val params = Arguments.createMap().apply {
            putString("notificationId", notificationId)
        }
        emit(EVENT_WIDGET_BOOST, params)
    }

    // Stores the backend notificationId so the widget knows what to boost on tap
    @ReactMethod
    fun setLastBackendId(notificationId: String) {
        reactContext.getSharedPreferences("prioria_widget", android.content.Context.MODE_PRIVATE)
            .edit().putString("last_backend_id", notificationId).apply()
    }

    // Updates the widget with the agent's authoritative priority verdict
    @ReactMethod
    fun updateWidgetPriority(title: String, body: String, appName: String, priority: String, timestamp: Double) {
        PrioriaWidgetProvider.updateFromBackend(
            reactContext, title, body, appName, priority, timestamp.toLong()
        )
    }

    // Persists the Cognito JWT to SharedPreferences so PrioriaFcmService can read it
    @ReactMethod
    fun saveAuthToken(token: String) {
        reactContext.getSharedPreferences("prioria_auth", android.content.Context.MODE_PRIVATE)
            .edit().putString("cognito_token", token).apply()
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    private fun emit(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
