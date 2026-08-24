package com.lorengrz.prioria

import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class PrioriaNotificationListener : NotificationListenerService() {

    // Notifications already forwarded to JS, keyed by StatusBarNotification.key.
    // Android replays onNotificationPosted for every currently active notification
    // whenever the listener (re)connects — e.g. on every app relaunch — so without
    // this, each restart re-ingests every still-visible notification as brand new.
    private val forwardedKeys = mutableSetOf<String>()

    override fun onListenerConnected() {
        super.onListenerConnected()
        forwardedKeys.clear()
        activeNotifications?.forEach { forwardedKeys.add(it.key) }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        forwardedKeys.remove(sbn.key)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // Ignore Prioria's own notifications to avoid loops
        if (sbn.packageName == packageName) return

        // Already forwarded — either an update to a known notification, or a
        // replay of a pre-existing one from onListenerConnected. Skip it.
        if (!forwardedKeys.add(sbn.key)) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getString("android.title") ?: return
        val body = extras.getCharSequence("android.text")?.toString() ?: ""

        val appName = try {
            val pm = applicationContext.packageManager
            pm.getApplicationLabel(pm.getApplicationInfo(sbn.packageName, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            sbn.packageName
        }

        NotificationModule.getInstance()?.sendNotificationEvent(
            packageName = sbn.packageName,
            appName = appName,
            title = title,
            body = body,
        )

        // Update home screen widget with the latest notification
        PrioriaWidgetProvider.pushUpdate(
            context = applicationContext,
            title = title,
            body = body,
            appName = appName,
            timestamp = sbn.postTime,
        )
    }
}
