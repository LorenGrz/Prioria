package com.lorengrz.prioria

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class PrioriaFcmService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = applicationContext.getSharedPreferences("prioria_auth", MODE_PRIVATE)
                val jwt   = prefs.getString("cognito_token", null) ?: return@launch
                val apiUrl = applicationContext.resources.getString(R.string.api_base_url)

                val body = JSONObject().put("fcmToken", token).toString()
                    .toRequestBody("application/json".toMediaType())
                val req = Request.Builder()
                    .url("$apiUrl/devices/register")
                    .post(body)
                    .addHeader("Authorization", "Bearer $jwt")
                    .build()
                OkHttpClient().newCall(req).execute()
            } catch (e: Exception) {
                Log.w("PrioriaFcm", "FCM token registration failed", e)
            }
        }
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
