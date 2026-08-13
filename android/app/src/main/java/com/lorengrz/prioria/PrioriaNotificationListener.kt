package com.lorengrz.prioria

import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class PrioriaNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // Ignore Prioria's own notifications to avoid loops
        if (sbn.packageName == packageName) return

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

    override fun onNotificationRemoved(sbn: StatusBarNotification) {}
}
