package com.lorengrz.prioria

import android.content.Intent
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(null)
    }

    override fun getMainComponentName(): String = "main"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {}
        )

    /**
     * Handles the widget tap: the widget sends ACTION_WIDGET_BOOST which opens the app
     * (or brings it to foreground) via FLAG_ACTIVITY_SINGLE_TOP, landing here.
     * We read the last stored backendId from SharedPreferences and emit a boost event to RN.
     */
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent?.action == PrioriaWidgetProvider.ACTION_WIDGET_BOOST) {
            val backendId = getSharedPreferences("prioria_widget", MODE_PRIVATE)
                .getString("last_backend_id", null)
            if (backendId != null) {
                NotificationModule.getInstance()?.sendBoostEvent(backendId)
            }
        }
    }

    override fun invokeDefaultOnBackPressed() {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
            if (!moveTaskToBack(false)) {
                super.invokeDefaultOnBackPressed()
            }
            return
        }
        super.invokeDefaultOnBackPressed()
    }
}
