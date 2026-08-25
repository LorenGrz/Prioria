package com.lorengrz.prioria

import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
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

        // PrioriaNotificationListener checks this to decide whether to emit
        // straight to the running app (fast path, updates UI immediately) or
        // start PrioriaHeadlessTaskService instead (app closed/killed — no
        // React instance to emit an event into).
        fun hasActiveReactInstance(): Boolean =
            instance?.reactContext?.hasActiveReactInstance() == true

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

    // Current FCM token, sent by JS with each classify request (see
    // src/services/classify.ts) so the backend can push without ever
    // persisting it server-side. Just reads the cache PrioriaFcmService
    // .onNewToken writes — no direct Firebase SDK call here on purpose:
    // this file compiles unconditionally (unlike PrioriaFcmService.kt,
    // which CI excludes when google-services.json is absent), so it can't
    // reference Firebase classes directly without breaking that build.
    // Null if onNewToken hasn't fired yet for this install (fine — the
    // caller just omits fcmToken from the request in that case).
    @ReactMethod
    fun getFcmToken(promise: Promise) {
        val cached = reactContext.getSharedPreferences("prioria_fcm", android.content.Context.MODE_PRIVATE)
            .getString("fcm_token", null)
        promise.resolve(cached)
    }

    // Battery optimization can kill the whole app process in the background
    // on aggressive OEM skins (Xiaomi/Samsung/OnePlus etc.) — taking
    // PrioriaNotificationListener down with it until Android gets around to
    // rebinding it. Exemption doesn't guarantee it never happens, but cuts
    // it down a lot. Asked once from OnboardingScreen, re-checkable from Ajustes.
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        val pm = reactContext.getSystemService(android.content.Context.POWER_SERVICE) as PowerManager
        promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        val pm = reactContext.getSystemService(android.content.Context.POWER_SERVICE) as PowerManager
        if (pm.isIgnoringBatteryOptimizations(reactContext.packageName)) return
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${reactContext.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactContext.startActivity(intent)
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    private fun emit(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
