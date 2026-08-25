package com.lorengrz.prioria

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Spins up a background JS instance to run `PrioriaNotificationTask`
 * (src/tasks/notificationTask.ts) when a notification arrives and the app
 * has no live React instance (closed/killed) — see
 * PrioriaNotificationListener.onNotificationPosted(). If the app IS running
 * in foreground, that listener calls NotificationModule.sendNotificationEvent
 * instead and this service is never started, so there's no double-processing.
 */
class PrioriaHeadlessTaskService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras: Bundle = intent?.extras ?: return null
        return HeadlessJsTaskConfig(
            "PrioriaNotificationTask",
            Arguments.fromBundle(extras),
            30_000, // timeout ms — classify.py can take a few seconds (Bedrock + FCM)
            true, // allowedInForeground — harmless if app happens to already be starting up
        )
    }
}
