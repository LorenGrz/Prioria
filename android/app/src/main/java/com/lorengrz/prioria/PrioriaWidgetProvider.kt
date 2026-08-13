package com.lorengrz.prioria

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PrioriaWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        updateWidgets(context, manager, ids)
    }

    companion object {
        private val CRITICA_KEYWORDS = listOf(
            "banco", "transferencia", "pago", "saldo", "crédito", "credito",
            "débito", "debito", "alerta", "contraseña", "contrasena", "código",
            "codigo", "verificación", "verificacion", "urgente", "fraude", "bloqueado",
        )
        private val AVISO_KEYWORDS = listOf(
            "cliente", "reunión", "reunion", "tarea", "entrega", "pedido",
            "trabajo", "plazo", "mensaje", "llamada",
        )

        fun scoreLocally(title: String, body: String): String {
            val text = "$title $body".lowercase()
            return when {
                CRITICA_KEYWORDS.any { text.contains(it) } -> "critica"
                AVISO_KEYWORDS.any { text.contains(it) } -> "aviso"
                else -> "info"
            }
        }

        fun pushUpdate(context: Context, title: String, body: String, appName: String, timestamp: Long) {
            val prefs = context.getSharedPreferences("prioria_widget", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("last_title", title)
                .putString("last_body", body)
                .putString("last_app", appName)
                .putLong("last_time", timestamp)
                .putString("last_priority", scoreLocally(title, body))
                .apply()

            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, PrioriaWidgetProvider::class.java))
            if (ids.isNotEmpty()) updateWidgets(context, manager, ids)
        }

        fun updateWidgets(context: Context, manager: AppWidgetManager, ids: IntArray) {
            val prefs = context.getSharedPreferences("prioria_widget", Context.MODE_PRIVATE)
            val title    = prefs.getString("last_title", null)
            val body     = prefs.getString("last_body", "")
            val appName  = prefs.getString("last_app", "")
            val time     = prefs.getLong("last_time", 0L)
            val priority = prefs.getString("last_priority", "info")

            val views = RemoteViews(context.packageName, R.layout.prioria_widget)

            if (title == null) {
                views.setTextViewText(R.id.widget_title, "Sin notificaciones")
                views.setTextViewText(R.id.widget_body, "Abrí Prioria para activar el servicio")
                views.setTextViewText(R.id.widget_priority_label, "")
                views.setTextViewText(R.id.widget_app_name, "")
                views.setTextViewText(R.id.widget_time, "")
            } else {
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_body, body ?: "")
                views.setTextViewText(R.id.widget_app_name, appName ?: "")
                views.setTextViewText(R.id.widget_time, if (time > 0) formatTime(time) else "")

                val (priorityText, priorityColor, dotColor) = when (priority) {
                    "critica" -> Triple("Crítica", 0xFFF87171.toInt(), 0xFFF87171.toInt())
                    "aviso"   -> Triple("Aviso",   0xFFFBBF24.toInt(), 0xFFFBBF24.toInt())
                    else      -> Triple("Info",    0xFF60A5FA.toInt(), 0xFF60A5FA.toInt())
                }
                views.setTextViewText(R.id.widget_priority_label, priorityText)
                views.setTextColor(R.id.widget_priority_label, priorityColor)
            }

            // Tap opens Prioria app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pendingIntent = PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_title, pendingIntent)

            for (id in ids) manager.updateAppWidget(id, views)
        }

        private fun formatTime(timestamp: Long): String {
            val diff = System.currentTimeMillis() - timestamp
            return when {
                diff < 60_000         -> "ahora"
                diff < 3_600_000      -> "hace ${diff / 60_000}min"
                diff < 86_400_000     -> "hace ${diff / 3_600_000}h"
                else -> SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
            }
        }
    }
}
