# Prioria — Contexto para futuras sesiones

## Qué es

App Android que intercepta notificaciones del sistema, las puntúa con un agente IA y muestra las críticas en un widget sin que el usuario tenga que mirar el teléfono. Pensada para choferes, supervisores de logística y personas que trabajan con las manos.

Flujo central: notificación llega → `NotificationListenerService` (Kotlin) la captura → POST al backend → SQS → Lambda Python con Strands Agent (Bedrock Claude Haiku) la clasifica → prioridad guardada en DynamoDB → app UI y widget actualizados. El usuario puede enseñarle reglas en lenguaje natural ("Instagram es crítica para mí") desde el tab Entrenar.

---

## Stack

| Capa | Tecnología |
|---|---|
| App | Expo SDK 57, React Native, Android-only |
| Estilos | NativeWind (Tailwind), tokens Material 3 |
| Auth | Amazon Cognito SRP, JWT en AsyncStorage |
| Backend | AWS SAM: Lambda Node 24 (CRUD) + Python 3.13 (agente) |
| Agente IA | Strands Agents SDK + Amazon Bedrock (Claude Haiku 4.5) |
| DB | DynamoDB: NotificationsTable, UsersTable, RulesTable |
| Cola | SQS: NotificationsQueue (ingest→agente), PushQueue (agente→FCM) |
| TTS | Amazon Polly (Lucia neural, Enrique standard) |
| Push widget | Firebase Cloud Messaging (FCM HTTP v1) |
| Nativo | NotificationListenerService + AppWidgetProvider + NativeModules bridge (Kotlin) |
| Audio | expo-audio (useAudioPlayer) para reproducir URLs de Polly |
| Landing | Next.js 16 App Router, output export estático, S3 + CloudFront |

---

## Infraestructura desplegada

### Backend (AWS SAM)
- **Stack**: `prioria-dev` — `us-east-1`
- **API**: `https://8lmjsd9rc9.execute-api.us-east-1.amazonaws.com/dev`
- **User Pool ID**: `us-east-1_McNa9MqHh`
- **Client ID**: `1ei1ta3vp0g2sbormecg1h2qkt`
- **Bucket voz**: `prioria-voice-clips-dev-493735739644`
- **Tabla notificaciones**: `prioria-notifications-dev`
- **Redesplegar**: `cd backend && PATH="~/.local/share/mise/installs/python/3.13.14/bin:$PATH" sam build && sam deploy`
  (Python 3.13 viene de mise, no del PATH por defecto — siempre agregar ese prefijo)

### Landing
- **URL**: `https://dbc92xng0o5d8.cloudfront.net` ← URL ACTUALIZADA (la anterior `d1c6xk2jegfebf` fue borrada)
- **Bucket S3**: `prioria-landing-493735739644`
- **CloudFront distribution**: `E1QORVKT1N4RHA`
- **OAC**: `ESSX2B90LB8WF`
- **Redesplegar**:
  ```bash
  cd landing && npm run build
  aws s3 sync out/ s3://prioria-landing-493735739644 --delete
  aws cloudfront create-invalidation --distribution-id E1QORVKT1N4RHA --paths "/*"
  ```

### Firebase (FCM)
- **Project ID**: `prioria-e8068`
- **google-services.json**: en `android/app/google-services.json` (gitignored — nunca commitear)
- **Service account**: en AWS Secrets Manager `prioria/fcm-service-account`
- **Estado**: activo, el backend puede enviar pushes al dispositivo

---

## APK / CI

- **CI**: GitHub Actions (`release.yml`) buildea en cada push a `main`
- **Versión**: `1.0.<run_number>` automático (run_number de GitHub Actions)
- **Descarga**: https://github.com/LorenGrz/Prioria/releases/latest/download/prioria.apk
- **Nota importante**: el CI **no** tiene `google-services.json` — `PrioriaFcmService.kt` se excluye del build via `sourceSets.exclude()` cuando el archivo no existe. El APK de CI funciona sin FCM (widget se actualiza solo cuando la app está en primer plano o background reciente). Para FCM completo hay que hacer un build local con el `google-services.json` en su lugar.

---

## Estructura del proyecto

```
/                          Raíz Expo (React Native)
  App.tsx                  Entry point, fuentes, NavigationContainer
  .env                     Credenciales (gitignored) — ver nota abajo
  android/                 Código nativo Android (commiteado, tiene módulos custom)
    app/
      google-services.json  Firebase config (gitignored)
      build.gradle          condicional hasFcm para FCM
      src/main/java/com/lorengrz/prioria/
        NotificationModule.kt         Bridge RN↔Kotlin (events + native calls)
        PrioriaNotificationListener.kt NotificationListenerService
        PrioriaWidgetProvider.kt      AppWidgetProvider con scoring local + updateFromBackend
        PrioriaFcmService.kt          FCM receiver (excluido si no hay google-services.json)
        MainActivity.kt               onNewIntent para widget boost
  src/
    context/
      AuthContext.tsx       Cognito SRP, JWT en AsyncStorage + SharedPreferences
      NotificationContext.tsx Estado central: notifs, boostPriority, TTS, widget bridge
    screens/
      OnboardingScreen.tsx  4 pasos: bienvenida, permisos, prefs, features
      InicioScreen.tsx      Status escucha, última notif, resumen del día
      FiltersScreen.tsx     GET/PUT /preferences (sensibilidad, categorías, umbral)
      HistorialScreen.tsx   Lista con chips feedback → POST /feedback y /boost
      TrainScreen.tsx       Chat → POST /train → guarda regla en RulesTable
      AjustesScreen.tsx     Voice settings + test Polly via expo-audio
    services/api.ts         apiCall helper con Cognito JWT
    navigation/             RootNavigator (stack) + MainTabs (5 tabs)

/backend                   AWS SAM
  template.yaml            Toda la infra (Cognito, DynamoDB, SQS, API, Lambdas)
  samconfig.toml           Parámetros de deploy (Stage, BedrockModelId, FcmProjectId, etc.)
  src/handlers/            Lambdas Node.js
    notifications/         ingest, list, open, feedback, boost, delete
    preferences/           get, update
    voice/                 synthesize (Polly → S3 presigned URL)
    push/                  sendPush (FCM HTTP v1)
    devices/               register (guarda fcmToken en UsersTable)
  src/agent/               Lambdas Python
    process_notification.py  Strands Agent clasifica notif, escribe DynamoDB, encola push
    train.py               Procesa mensaje del usuario, guarda regla en RulesTable

/landing                   Next.js 16 sitio estático
  app/page.tsx             Landing completa (hero + features + stack + descarga APK)
  components/previews/     Recreaciones estáticas de pantallas para portfolio
```

---

## .env (gitignored — nunca commitear)

```
EXPO_PUBLIC_API_URL=https://8lmjsd9rc9.execute-api.us-east-1.amazonaws.com/dev
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_McNa9MqHh
EXPO_PUBLIC_COGNITO_CLIENT_ID=1ei1ta3vp0g2sbormecg1h2qkt
EXPO_PUBLIC_COGNITO_USERNAME=lorenzograizzaro55@gmail.com
EXPO_PUBLIC_COGNITO_PASSWORD="Prioria2026!App#"
```

**Importante**: la contraseña tiene `#` — DEBE ir entre comillas en el `.env` o Metro la trunca y Cognito rechaza el login. El GitHub Secret `APP_ENV` también debe tener la contraseña entre comillas.

---

## Endpoints del backend

| Método | Path | Qué hace |
|---|---|---|
| POST | `/notifications` | Ingest → SQS → agente |
| GET | `/notifications` | Lista las notificaciones del usuario |
| POST | `/notifications/{id}/open` | Marca como abierta (señal débil) |
| POST | `/notifications/{id}/feedback` | ±15 pts al score (chips Urgente/Normal/Info) |
| POST | `/notifications/{id}/boost` | +8 pts (tap en card del Historial) |
| DELETE | `/notifications/{id}` | Borra del historial |
| GET | `/preferences` | Lee prefs del usuario (sensibilidad, categorías, voz) |
| PUT | `/preferences` | Actualiza prefs |
| POST | `/train` | Procesa mensaje → regla guardada en RulesTable |
| POST | `/voice/synthesize` | Texto → Polly → S3 presigned URL |
| POST | `/devices/register` | Guarda fcmToken del dispositivo |

---

## Flujos críticos

### Notificación llega → UI actualizada
1. `PrioriaNotificationListener.onNotificationPosted()` → `NotificationModule.sendNotificationEvent()`
2. `DeviceEventEmitter` → `NotificationContext` agrega la notif localmente
3. `POST /notifications` (ingest) → DynamoDB `status=pending`
4. SQS → `ProcessNotificationFunction` (Python/Strands) → escribe `priorityLabel`, `priorityScore`, `status=processed`
5. `setTimeout(refreshFromBackend, 8000)` → `GET /notifications` → sincroniza con DynamoDB
6. Si priorityLabel cambió: `NativeModules.updateWidgetPriority()` → widget actualizado

### Widget tap → boost
1. `PrioriaWidgetProvider` click intent → `ACTION_WIDGET_BOOST` → `MainActivity.onNewIntent()`
2. Lee `last_backend_id` de SharedPreferences
3. `NotificationModule.sendBoostEvent(backendId)` → `DeviceEventEmitter`
4. `NotificationContext` listener → `boostByBackendId()` → `POST /notifications/{id}/boost`

### Entrenamiento
1. Usuario escribe en TrainScreen → `POST /train` con `{ message }`
2. `TrainAgentFunction` (Python) procesa el mensaje → extrae regla → guarda en RulesTable
3. Las próximas notificaciones del usuario leen esa regla via `rules_table.query(userId)`

---

## Cosas importantes para no olvidar

1. **Python en SAM**: `sam build` necesita Python 3.13 en PATH. Usar siempre:
   `PATH="~/.local/share/mise/installs/python/3.13.14/bin:$PATH" sam build && sam deploy`

2. **Metro hot reload**: `adb shell input text` puede disparar reloads si el texto contiene caracteres que Metro interpreta como comandos. Para interactuar con la app desde scripts, mejor llamar directamente a los endpoints del backend con curl/node.

3. **PrioriaFcmService en CI**: excluido condicionalmente de la compilación cuando no hay `google-services.json`. Si se agregan más clases que usen Firebase, también hay que excluirlas o usar el mismo patrón condicional.

4. **Campo DynamoDB**: el agente escribe `priorityLabel` (no `priority`). El campo `status` pasa de `pending` a `processed` cuando el agente termina.

5. **Bedrock model ID**: `us.anthropic.claude-haiku-4-5-20251001-v1:0` (con el prefijo `us.` para cross-region inference). Si da error de acceso, verificar en Bedrock console → Model access.

6. **URL CloudFront**: cambió cuando se recreó la distribución. La URL actual es `https://dbc92xng0o5d8.cloudfront.net`. Actualizar si alguien tiene la anterior guardada.

---

## Estado del MVP (completado)

- [x] App Expo con 5 tabs: Inicio, Filtros, Chat (Entrenar), Historial, Ajustes
- [x] Cognito SRP auth, auto-refresh cada 50 min
- [x] NotificationListenerService nativo → backend → agente IA
- [x] Widget Android con scoring local inmediato + update con veredicto del agente
- [x] FiltersScreen ↔ `/preferences` (sensibilidad, categorías, umbral auto-read)
- [x] Historial: chips feedback → `/feedback`, tap card → `/boost`
- [x] TrainScreen: mensaje → regla guardada → agente la aplica en clasificaciones futuras
- [x] AjustesScreen: voice settings → Polly, test de voz con expo-audio
- [x] TTS automática (expo-speech) para notificaciones críticas con autoRead
- [x] Widget tap → boost signal en backend via onNewIntent
- [x] FCM: backend puede pushear veredicto al widget cuando app está cerrada
- [x] CI: build automático en cada push, release `v1.0.<N>`
- [x] Landing con botón de descarga del APK

## Pendiente / mejoras futuras

- [ ] Actualizar GitHub Secret `APP_ENV` con la contraseña entre comillas (ver sección .env)
- [ ] Polly TTS automática para críticas (hoy usa expo-speech como fallback; para Polly real necesita un PreferencesContext compartido con NotificationContext)
- [ ] Feedback loop: re-inyectar historial de boost/open al prompt del agente para aprendizaje continuo (hoy solo lee RulesTable)
- [ ] Theming claro/oscuro del sistema operativo (hoy solo Entrenar tiene paleta fija)
- [ ] Tests E2E
