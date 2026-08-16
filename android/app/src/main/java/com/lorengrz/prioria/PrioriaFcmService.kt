package com.lorengrz.prioria

/*
 * FCM push receiver — updates the home-screen widget with the agent's priority verdict.
 *
 * HOW TO ACTIVATE (one-time setup, requires a Firebase project):
 *
 * 1. Create (or open) your Firebase project at https://console.firebase.google.com
 * 2. Add an Android app with package name "com.lorengrz.prioria"
 * 3. Download google-services.json → place it at  android/app/google-services.json
 *    (it is already in .gitignore — never commit it)
 *
 * 4. In android/build.gradle  (top-level), add to buildscript.dependencies:
 *      classpath 'com.google.gms:google-services:4.4.2'
 *
 * 5. In android/app/build.gradle, add at the top (after existing plugins):
 *      if (file("google-services.json").exists()) {
 *          apply plugin: 'com.google.gms.google-services'
 *      }
 *    And in dependencies { … }:
 *      if (file("google-services.json").exists()) {
 *          implementation 'com.google.firebase:firebase-messaging:24.1.0'
 *      }
 *
 * 6. In AndroidManifest.xml, add inside <application>:
 *      <service
 *        android:name=".PrioriaFcmService"
 *        android:exported="false">
 *        <intent-filter>
 *          <action android:name="com.google.firebase.MESSAGING_EVENT" />
 *        </intent-filter>
 *      </service>
 *
 * 7. Store the Firebase service-account JSON in AWS Secrets Manager and set the
 *    FcmServiceAccountSecretArn + FcmProjectId parameters in samconfig.toml,
 *    then run: cd backend && sam build && sam deploy
 *
 * 8. Rebuild the APK: push to main → CI produces prioria.apk automatically.
 *
 * WHAT IT DOES:
 * - onNewToken: registers the FCM token with the backend (POST /devices/register)
 *   so the backend can push notifications to this device.
 * - onMessageReceived: receives data messages from sendPush.js Lambda and updates
 *   the home-screen widget with the agent's authoritative priority label (critica /
 *   aviso / info) instead of the locally-scored one.
 *
 * The class is compiled but the Firebase SDK is not linked until the steps above
 * are completed, so the build will fail until then. Comment out this file (or
 * remove it from the source set) if you need to build without Firebase.
 */

// import com.google.firebase.messaging.FirebaseMessagingService
// import com.google.firebase.messaging.RemoteMessage
// import kotlinx.coroutines.CoroutineScope
// import kotlinx.coroutines.Dispatchers
// import kotlinx.coroutines.launch
// import okhttp3.MediaType.Companion.toMediaType
// import okhttp3.OkHttpClient
// import okhttp3.Request
// import okhttp3.RequestBody.Companion.toRequestBody
// import org.json.JSONObject
// import android.util.Log
//
// class PrioriaFcmService : FirebaseMessagingService() {
//
//     override fun onNewToken(token: String) {
//         // Register the FCM token with the backend so it can push to this device.
//         // The backend reads the token from the UsersTable (field: fcmToken).
//         CoroutineScope(Dispatchers.IO).launch {
//             try {
//                 val prefs = applicationContext.getSharedPreferences("prioria_auth", MODE_PRIVATE)
//                 val jwt   = prefs.getString("cognito_token", null) ?: return@launch
//                 val apiUrl = applicationContext.getString(R.string.api_base_url)  // set in strings.xml
//
//                 val body = JSONObject().put("fcmToken", token).toString()
//                     .toRequestBody("application/json".toMediaType())
//                 val req = Request.Builder()
//                     .url("$apiUrl/devices/register")
//                     .post(body)
//                     .addHeader("Authorization", "Bearer $jwt")
//                     .build()
//                 OkHttpClient().newCall(req).execute()
//             } catch (e: Exception) {
//                 Log.w("PrioriaFcm", "FCM token registration failed", e)
//             }
//         }
//     }
//
//     override fun onMessageReceived(message: RemoteMessage) {
//         // Backend sendPush.js sends: notificationId, priorityLabel, title, body (data message)
//         val data          = message.data
//         val title         = data["title"]         ?: message.notification?.title ?: return
//         val body          = data["body"]           ?: message.notification?.body  ?: ""
//         val priorityLabel = data["priorityLabel"]  ?: "aviso"
//         val notifId       = data["notificationId"] ?: ""
//
//         // Update the widget with the agent's authoritative priority
//         PrioriaWidgetProvider.updateFromBackend(
//             context    = applicationContext,
//             title      = title,
//             body       = body,
//             appName    = "Notificación",
//             priority   = priorityLabel,
//             timestamp  = System.currentTimeMillis(),
//         )
//
//         // Emit to RN if app is foregrounded (handles TTS + UI update)
//         NotificationModule.getInstance()?.let { module ->
//             // Re-use the widget boost event to refresh the RN context with the
//             // backend's verdict. The context will call boostByBackendId which
//             // correctly dispatches the boost only once (the user opening via widget).
//             // Here we only want a priority update, not a score bump — call
//             // NotificationModule.updateWidgetPriority via a dedicated RN event
//             // if you later want a separate "agentUpdate" signal.
//         }
//     }
// }
