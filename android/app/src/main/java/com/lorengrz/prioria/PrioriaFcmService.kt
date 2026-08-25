package com.lorengrz.prioria

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class PrioriaFcmService : FirebaseMessagingService() {

    // No server-side registration anymore — classify.py is stateless and gets
    // the current fcmToken straight from the client on each classify request
    // (see NotificationModule.getFcmToken / src/services/classify.ts). Just
    // cache the latest token locally so JS can read it on demand.
    override fun onNewToken(token: String) {
        applicationContext.getSharedPreferences("prioria_fcm", MODE_PRIVATE)
            .edit().putString("fcm_token", token).apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data          = message.data
        val title         = data["title"]         ?: message.notification?.title ?: return
        val body          = data["body"]           ?: message.notification?.body  ?: ""
        val priorityLabel = data["priorityLabel"]  ?: "aviso"

        PrioriaWidgetProvider.updateFromBackend(
            context   = applicationContext,
            title     = title,
            body      = body,
            appName   = "Notificación",
            priority  = priorityLabel,
            timestamp = System.currentTimeMillis(),
        )
    }
}
