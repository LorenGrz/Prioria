# Prioria — Contexto para futuras sesiones

## Qué es

App Android que intercepta notificaciones del sistema, las puntúa con un agente IA y muestra las críticas en un widget sin que el usuario tenga que mirar el teléfono. Pensada para choferes, supervisores de logística y personas que trabajan con las manos.

Flujo central: notificación llega → `NotificationListenerService` (Kotlin) la captura → POST síncrono al backend → Lambda Python con Strands Agent (Bedrock Claude Haiku) la clasifica y responde en la misma request → UI y widget se actualizan con el veredicto. El usuario puede enseñarle reglas en lenguaje natural ("Instagram es crítica para mí") desde el tab Entrenar. **Todo lo que no es "iniciar sesión" vive en el dispositivo** — notificaciones, reglas y preferencias son local-only (AsyncStorage), no hay base de datos del lado del servidor.

**2026-08-25 — refactor grande**: el backend pasó de tener DynamoDB + SQS + 20 Lambdas a ser stateless — solo Cognito (login) + 3 Lambdas (clasificar, entrenar, voz). Se sacó también el usuario/contraseña hardcodeados del bundle de la app (vulnerabilidad crítica encontrada y corregida esa misma sesión) y se agregó una pantalla de login/registro real. Ver `/home/loren/.claude/projects/-home-loren-projects-prioria/memory/prioria-local-first-refactor.md` para el detalle fase por fase si hace falta el historial completo.

---

## Stack

| Capa | Tecnología |
|---|---|
| App | Expo SDK 57, React Native, Android-only |
| Estilos | NativeWind (Tailwind), tokens Material 3 |
| Auth | Amazon Cognito SRP — login y registro reales (email + código de verificación), JWT + refresh token en `expo-secure-store` (Keychain/Keystore encriptado, no AsyncStorage) |
| Almacenamiento local | AsyncStorage — notificaciones (TTL 60 días), reglas, preferencias. Todo vive en el dispositivo, nada en el backend salvo la cuenta de Cognito |
| Backend | AWS SAM: 2 Lambdas Python (Strands Agent + Bedrock) + 1 Lambda Node (Polly). Sin DynamoDB, sin SQS |
| Agente IA | Strands Agents SDK + Amazon Bedrock (Claude Haiku 4.5) |
| Push widget | Firebase Cloud Messaging (FCM HTTP v1), enviado inline por el mismo Lambda que clasifica — no hay cola ni registro de dispositivo server-side |
| Nativo | NotificationListenerService + AppWidgetProvider + NativeModules bridge (Kotlin) |
| Audio | expo-audio (useAudioPlayer) para reproducir URLs de Polly; expo-speech como fallback offline |
| Landing | Next.js 16 App Router, output export estático, GitHub Pages (repo separado `landing-prioria`) |

---

## Infraestructura desplegada

### Backend (AWS SAM)
- **Stack**: `prioria-dev` — `us-east-1` — **8 recursos** (`UserPool`, `UserPoolClient`, `HttpApi`, `ClassifyNotificationFunction`, `TrainAgentFunction`, `SynthesizeVoiceFunction`, `VoiceClipsBucket`, más el `CognitoAuthorizer` de la API). Nada de DynamoDB ni SQS — se borraron 21 recursos viejos el 2026-08-25 (3 tablas, 4 colas/DLQs, 14 Lambdas).
- **API**: `https://8lmjsd9rc9.execute-api.us-east-1.amazonaws.com/dev`
- **User Pool ID**: `us-east-1_McNa9MqHh`
- **Client ID**: `1ei1ta3vp0g2sbormecg1h2qkt`
- **Bucket voz**: `prioria-voice-clips-dev-493735739644`
- **Rate limiting**: `HttpApi` tiene `ThrottlingBurstLimit: 40` / `ThrottlingRateLimit: 20` (único techo contra abuso, no hay usage plan/WAF aparte).
- **Redesplegar**: `cd backend && PATH="~/.local/share/mise/installs/python/3.13.14/bin:$PATH" sam build && sam deploy`
  (Python 3.13 viene de mise, no del PATH por defecto — siempre agregar ese prefijo. Ver también la memoria `prioria-backend-deploy-tooling` para el PATH completo con esbuild/sam si `sam`/esbuild no están en PATH.)

### Landing
- **URL (real, la que usa Loren)**: `https://lorengrz.github.io/landing-prioria/` — vive en el repo **separado** `LorenGrz/landing-prioria` (checkout local en `~/projects/landing-prioria`, NO es el `landing/` de este repo, aunque comparten estructura de componentes).
- **Redesplegar**: `git push origin master` desde `~/projects/landing-prioria` — dispara `.github/workflows/*.yml` (build + `actions/deploy-pages`), 100% automático. Verificar con `gh run list --repo LorenGrz/landing-prioria --limit 1`.
- El `landing/` de **este** repo (`~/projects/prioria/landing`) sigue existiendo en el código como copia histórica, pero su infra de deploy (bucket, distribución CloudFront, OAC) fue **borrada de AWS el 2026-08-25** por no usarse.
- El botón de descarga de la landing apunta al APK que arma `release.yml` (ver abajo) — ese APK **ya no lleva ninguna credencial embebida**: cualquiera que lo instale ve la pantalla de login/registro real, no un auto-login.

### Firebase (FCM)
- **Project ID**: `prioria-e8068`
- **google-services.json**: en `android/app/google-services.json` (gitignored — nunca commitear)
- **Service account**: en AWS Secrets Manager `prioria/fcm-service-account`
- **Estado**: activo. El Lambda de clasificación manda el push inline en la misma invocación (sin cola, sin lookup server-side del token — el cliente lo manda en cada request, ver `src/services/classify.ts`).

---

## APK / CI

- **CI**: GitHub Actions (`release.yml`) buildea en cada push a `main`
- **Versión**: `1.0.<run_number>` automático (run_number de GitHub Actions)
- **Descarga**: https://github.com/LorenGrz/Prioria/releases/latest/download/prioria.apk
- **Nota importante**: el CI **no** tiene `google-services.json` — `PrioriaFcmService.kt` se excluye del build via `sourceSets`/task-filtering cuando el archivo no existe (`android/app/build.gradle`, `hasFcm`). El APK de CI funciona sin FCM (widget se actualiza solo cuando la app está en primer plano o background reciente). Para FCM completo hay que hacer un build local con el `google-services.json` en su lugar.
- **`NotificationModule.kt` compila siempre** (a diferencia de `PrioriaFcmService.kt`) — si se le agrega algo que importe clases de Firebase, el build de CI se rompe (`firebase-messaging` solo se agrega como dependencia `if (hasFcm)`). Verificado el 2026-08-25 con un build local sin `google-services.json` que sí compila limpio tal como quedó el código.
- **GitHub Secret `APP_ENV`**: todavía puede tener las líneas viejas `EXPO_PUBLIC_COGNITO_USERNAME`/`PASSWORD` de antes del refactor — ya no hacen nada (el código no las lee más) pero conviene sacarlas del secret por prolijidad. `.env` local ahora solo tiene `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_CLIENT_ID`.

---

## Estructura del proyecto

```
/                          Raíz Expo (React Native)
  App.tsx                  Entry point, fuentes, NavigationContainer
  .env                     Solo API_URL + UserPool/Client IDs (gitignored) — sin credenciales
  android/                 Código nativo Android (commiteado, tiene módulos custom)
    app/
      google-services.json  Firebase config (gitignored)
      build.gradle          condicional hasFcm para FCM
      src/main/java/com/lorengrz/prioria/
        NotificationModule.kt         Bridge RN↔Kotlin (events + native calls + getFcmToken + battery optimization). Compila siempre — nunca importarle nada de Firebase
        PrioriaNotificationListener.kt NotificationListenerService — enruta a JS directo (foreground) o a PrioriaHeadlessTaskService (app cerrada)
        PrioriaHeadlessTaskService.kt  Arranca PrioriaNotificationTask (JS) sin Activity cuando la app está cerrada/matada
        PrioriaWidgetProvider.kt      AppWidgetProvider con scoring local + updateFromBackend
        PrioriaFcmService.kt          FCM receiver (excluido si no hay google-services.json) — solo cachea el token localmente, no lo registra en ningún backend
        MainActivity.kt               onNewIntent para widget boost
  index.ts                  Entry point real — registerRootComponent + AppRegistry.registerHeadlessTask('PrioriaNotificationTask', ...)
  src/
    context/
      AuthContext.tsx       React state/timers sobre src/lib/authToken.ts — login/signup/confirm/refresh
      PreferencesContext.tsx Fuente única de preferencias, AsyncStorage, debounce compartido
      RulesContext.tsx      Fuente única de reglas (default+chat+manual), AsyncStorage
      NotificationContext.tsx Estado central: notifs (AsyncStorage), classify.ts, TTS, widget bridge
    tasks/
      notificationTask.ts    Tarea headless (sin árbol de React) — mismo classify+persist que NotificationContext pero standalone
    lib/
      authToken.ts            Todo Cognito (SRP, signup, confirm, refresh, getValidAccessToken) — usado por AuthContext Y por notificationTask, única fuente de verdad
      storage/{notifications,rules,preferences}.ts  Persistencia AsyncStorage pura
      scoring.ts             clampScore/labelForScore (puerto del backend)
      defaultRules.ts        4 reglas base, sembradas en el primer arranque
      localId.ts             generador de ids locales (sin crypto.randomUUID)
    services/
      api.ts                 apiCall helper con Cognito JWT
      classify.ts             Wrapper de POST /notifications con retry + límite de concurrencia
    screens/
      LoginScreen.tsx        Login / Crear cuenta / Confirmar código (3 modos)
      OnboardingScreen.tsx   4 pasos: bienvenida, permisos, prefs, features
      HomeScreen.tsx         Status escucha, última notif, resumen del día
      FiltersScreen.tsx      Preferencias (sensibilidad, categorías, umbral) vía PreferencesContext
      HistoryScreen.tsx      Lista con chips feedback (mutación local)
      TrainScreen.tsx        Chat → POST /train → persiste la regla local vía RulesContext
      AjustesScreen.tsx      Voice settings + test Polly + botón "Cerrar sesión"
    navigation/             RootNavigator (Login/Onboarding/Main según AuthContext.status) + SwipeTabNavigator (5 tabs, PagerView)

/backend                   AWS SAM
  template.yaml            Cognito + HttpApi + 3 Lambdas + bucket de voz (8 recursos)
  samconfig.toml           Parámetros de deploy (Stage, BedrockModelId, FcmProjectId, etc.)
  src/handlers/
    voice/synthesize.js    Polly → S3 presigned URL (sin auth propia, el authorizer de Cognito ya filtra)
  src/agent/               Lambdas Python
    classify.py             POST /notifications — Bedrock clasifica + push FCM inline, stateless
    train.py                POST /train — distila una regla del chat, no persiste nada

/landing                   Next.js 16 sitio estático (copia histórica, no es el que se usa — ver arriba)
```

---

## .env (gitignored — nunca commitear)

```
EXPO_PUBLIC_API_URL=https://8lmjsd9rc9.execute-api.us-east-1.amazonaws.com/dev
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_McNa9MqHh
EXPO_PUBLIC_COGNITO_CLIENT_ID=1ei1ta3vp0g2sbormecg1h2qkt
```

Ya no lleva usuario/contraseña — el login es real (`LoginScreen.tsx`), no hay nada que hardcodear.

---

## Endpoints del backend

| Método | Path | Qué hace |
|---|---|---|
| POST | `/notifications` | Clasifica una notificación (Bedrock) y empuja por FCM si corresponde — síncrono, sin DB. Body: `{ title, body, sourceApp, preferences, activeRules, fcmToken? }` |
| POST | `/train` | Distila un mensaje del chat "Entrenar" en una regla — no persiste, el cliente la guarda local. Body: `{ message, existingRules? }` |
| POST | `/voice/synthesize` | Texto → Polly → S3 presigned URL |

Todo lo demás (`/preferences`, `/rules`, `GET/DELETE /notifications`, `/devices`, etc.) se borró el 2026-08-25 — ahora da 404, la lógica equivalente es 100% local (`src/lib/storage/`).

---

## Flujos críticos

### Notificación llega → UI actualizada (síncrono, sin cola)

**Con la app abierta (foreground)**:
1. `PrioriaNotificationListener.onNotificationPosted()` ve que hay instancia de React activa (`NotificationModule.hasActiveReactInstance()`) → `NotificationModule.sendNotificationEvent()`
2. `DeviceEventEmitter` → `NotificationContext` agrega la notif localmente con un score heurístico instantáneo (`scoreLocally()`)
3. `classifyNotification()` (`src/services/classify.ts`) → `POST /notifications` con preferencias/reglas activas/fcmToken actuales → el Lambda responde el veredicto real de Bedrock en la misma request (~1-2s)
4. La UI se actualiza con el veredicto real, se persiste en AsyncStorage, y si superó el umbral y hay `fcmToken`, el Lambda ya mandó el push por FCM antes de responder

**Con la app cerrada/matada (2026-08-25, `PrioriaHeadlessTaskService`)**: si `hasActiveReactInstance()` da `false` (nadie abrió la app desde el último kill del proceso), el listener nativo arranca `PrioriaHeadlessTaskService` en vez de emitir el evento — este levanta un motor de JS headless (sin Activity, sin árbol de React montado) que corre `PrioriaNotificationTask` (`src/tasks/notificationTask.ts`, registrada en `index.ts` vía `AppRegistry.registerHeadlessTask`). Esa tarea lee el token/preferencias/reglas directo de `expo-secure-store`/AsyncStorage (sin hooks, `src/lib/authToken.ts` expone `getValidAccessToken()` compartido con `AuthContext`), clasifica igual que el camino foreground, y persiste el resultado — que `NotificationContext` va a levantar solo cuando la app se vuelva a abrir. Verificado end-to-end el 2026-08-25 con el proceso completamente matado (`am force-stop` + `cmd notification post`): la notificación de prueba quedó clasificada y visible en Historial sin que la app estuviera corriendo.

Android puede seguir matando el proceso completo en fabricantes agresivos (Xiaomi/Samsung/OnePlus) — por eso el onboarding también pide **exención de optimización de batería** (`NotificationModule.requestIgnoreBatteryOptimizations()`), re-pedible desde Ajustes → "Sin restricciones de batería".

### Widget tap → boost
1. `PrioriaWidgetProvider` click intent → `ACTION_WIDGET_BOOST` → `MainActivity.onNewIntent()`
2. Lee `last_backend_id` de SharedPreferences (en realidad guarda el id local del cliente, no un id de servidor — el nombre es legacy)
3. `NotificationModule.sendBoostEvent(id)` → `DeviceEventEmitter`
4. `NotificationContext` listener → `boostPriority()` → mutación local (AsyncStorage), sin llamada al backend

### Entrenamiento
1. Usuario escribe en TrainScreen → `POST /train` con `{ message, existingRules }`
2. `TrainAgentFunction` (Python) distila el mensaje en una regla y la devuelve — no la guarda
3. El cliente la persiste con `useRules().addRule(...)` (AsyncStorage) y la manda como parte de `activeRules` en cada clasificación futura

### Login / registro
1. `LoginScreen.tsx` — modo `login`: SRP contra Cognito. Modo `signup`: `userPool.signUp()` + validación de password policy en cliente. Modo `confirm`: código numérico que Cognito manda por email (`AutoVerifiedAttributes: [email]`, no es un link) → `confirmRegistration()` → auto-login.
2. Sesión (JWT + refresh token + email) en `expo-secure-store`, no AsyncStorage.
3. Refresh silencioso vía `CognitoRefreshToken`/`user.refreshSession()` cada ~50 min y también al volver a foreground (`AppState` listener) — nunca vuelve a pedir contraseña mientras el refresh token (30 días) sea válido.
4. `AjustesScreen` → "Cerrar sesión" limpia todo en `expo-secure-store` y fuerza vuelta a `LoginScreen`.

---

## Cosas importantes para no olvidar

1. **Python en SAM**: `sam build` necesita Python 3.13 en PATH. Usar siempre:
   `PATH="~/.local/share/mise/installs/python/3.13.14/bin:$PATH" sam build && sam deploy`

2. **Metro hot reload**: `adb shell input text` dispara reloads de Metro con bastante frecuencia en este proyecto (posiblemente el shortcut de hardware-keyboard "RR" de React Native, o Fast Refresh coincidiendo). Para escribir texto de forma confiable en un test con adb: tipear, esperar, y **verificar con `uiautomator dump` que el campo tiene exactamente el texto esperado antes de tocar "enviar"** — si hubo un reload a mitad de camino, los campos vuelven a estar vacíos y no hay error, simplemente no pasó nada. Para probar endpoints del backend en yendo por afuera de la UI, mejor un script `.mjs` con `amazon-cognito-identity-js` + `fetch` (colocado en la raíz del repo para que resuelva módulos, borrado después si tiene una contraseña real adentro).

3. **`NotificationModule.kt` no puede importar nada de Firebase** — compila siempre, a diferencia de `PrioriaFcmService.kt` que CI excluye sin `google-services.json`. Si hace falta hablar con FCM desde JS, la lógica Firebase-specific va en `PrioriaFcmService.kt` (o un módulo nuevo con el mismo patrón de exclusión condicional en `build.gradle`), nunca en `NotificationModule.kt`.

4. **Dependencia nativa nueva → build cache corrupto**: si se agrega un paquete Expo con módulo nativo (ej. `expo-secure-store`) y después de `npx expo install X && cd android && ./gradlew assembleDebug` la app crashea con `Cannot find native module 'X'` aunque Gradle liste la dependencia correctamente (`./gradlew :app:dependencies` la muestra), el problema son cachés de build nativo desactualizados, no el código. Fix: `rm -rf android/app/.cxx android/app/build android/build` y rebuildear desde cero (¬10 min). Pasó el 2026-08-25 con `expo-secure-store`.

5. **NotificationListenerService reingresa notificaciones activas al reconectar**: Android llama `onNotificationPosted()` para TODAS las notificaciones activas cada vez que el listener se reconecta (p. ej. en cada reinicio de la app), no solo para las nuevas. `PrioriaNotificationListener` trackea `forwardedKeys` (poblado desde `activeNotifications` en `onListenerConnected()`, limpiado en `onNotificationRemoved()`) para no duplicar ingestas. (fix: commit `27a838f`, 2026-08-24)

6. **Ícono adaptativo de Android — la zona visible NO es el 100% del canvas**: el círculo/máscara que realmente se ve en el launcher cubre solo 72dp de los 108dp del canvas (66.7%), no el canvas completo. El glifo debe medir ~65-70% de ESE círculo visible. Ver `assets/android-icon-foreground.png` (fix: commit `481d6e8`, 2026-08-24).

7. **Bedrock model ID**: `us.anthropic.claude-haiku-4-5-20251001-v1:0` (con el prefijo `us.` para cross-region inference). Si da error de acceso, verificar en Bedrock console → Model access.

8. **Prompt injection en `classify.py`**: el campo `notification` del prompt contiene texto de terceros (cualquier app puede generar una notificación) — el system prompt tiene una sección explícita de seguridad para que el modelo lo trate como dato, nunca como instrucción, y `_sanitize_verdict()` valida `label`/`category` contra un enum fijo server-side y fuerza `should_auto_read=false` salvo que `label == "critica"` ya validado — nunca confiar en que el modelo respetó el schema pedido solo porque se lo pediste.

9. **Notificación llegada con la app cerrada NO se procesaba** (fix 2026-08-25, `PrioriaHeadlessTaskService`): `NotificationModule.sendNotificationEvent()` siempre tuvo un `if (!reactContext.hasActiveReactInstance()) return` — sin instancia de React viva (app matada, no solo en background) era un no-op silencioso, la notificación nunca llegaba a clasificarse ni a guardarse, solo el widget se actualizaba con el score local heurístico (llamada nativa directa, no pasa por el bridge). Confirmado real con `am force-stop` + `cmd notification post`. Ver la sección "Notificación llega → UI actualizada" arriba para el flujo con la app cerrada. **Al debuggear esto**: `adb shell dumpsys activity processes | grep prioria` muestra que Android reinicia un proceso mínimo solo para el `NotificationListenerService` incluso después de `force-stop` (porque el sistema mantiene el binding) — ese proceso NO tiene instancia de React hasta que algo (el headless service) la pida explícitamente, así que `hasActiveReactInstance()` da `false` ahí como se espera. Para verificar que una tarea headless corrió de verdad: leer `prioria_notifications` directo de `/data/data/com.lorengrz.prioria/databases/RKStorage` (SQLite, tabla `catalystLocalStorage`) vía `adb exec-out run-as com.lorengrz.prioria cat <path> > local.db`.

---

## Testing en el emulador

- **Cuenta de Gmail logueada en el AVD**: `loloxdxd13@gmail.com` — NO es el email personal de Loren (`lorenzograizzaro55@gmail.com`, que es su cuenta real de Cognito). Para probar el flujo de notificaciones end-to-end, mandar los correos de prueba a `loloxdxd13@gmail.com`.
- **Navegar la UI por adb con certeza**: no estimar coordenadas de tap a ojo desde un screenshot — falla seguido. Usar `adb shell uiautomator dump /sdcard/window_dump.xml` y leer los `bounds="[x1,y1][x2,y2]"` reales del elemento antes de tocarlo, **re-dumpeando después de cualquier cambio de layout** (ej. un mensaje de error que aparece/desaparece corre todo lo de abajo).
- **Notification listener permission**: `adb shell dumpsys notification --noredact | grep -i prioria` para verificar, `adb shell cmd notification allow_listener com.lorengrz.prioria/com.lorengrz.prioria.PrioriaNotificationListener` para otorgar directo sin pasar por la UI de ajustes.
- **Leer SharedPreferences de un build debug**: `adb shell run-as com.lorengrz.prioria cat /data/data/com.lorengrz.prioria/shared_prefs/<archivo>.xml` — útil para confirmar que algo se cacheó bien (ej. el fcm_token) sin instrumentar la app.

---

## Estado del MVP (completado)

- [x] App Expo con 5 tabs: Inicio, Filtros, Chat (Entrenar), Historial, Ajustes
- [x] Cognito SRP — login y registro reales, sin credenciales hardcodeadas, refresh token en expo-secure-store
- [x] NotificationListenerService nativo → backend síncrono (Lambda + Bedrock, sin cola)
- [x] Widget Android con scoring local inmediato + update con veredicto del agente
- [x] FiltersScreen ↔ preferencias 100% locales (AsyncStorage vía PreferencesContext)
- [x] Historial: chips feedback, boost — mutaciones locales
- [x] TrainScreen: mensaje → regla distilada por Bedrock → persistida local, aplicada en clasificaciones futuras
- [x] AjustesScreen: voice settings → Polly, test de voz con expo-audio, cerrar sesión
- [x] TTS automática (expo-speech) para notificaciones críticas con autoRead
- [x] Widget tap → boost signal (100% local, ya no pega al backend)
- [x] FCM: el Lambda de clasificación pushea inline, sin registro de dispositivo server-side
- [x] Notificaciones con la app cerrada/matada: `PrioriaHeadlessTaskService` clasifica y persiste igual que en foreground, verificado con el proceso completamente matado
- [x] Exención de optimización de batería pedida en onboarding (re-pedible desde Ajustes)
- [x] CI: build automático en cada push, release `v1.0.<N>`, sin credenciales embebidas en el APK
- [x] Landing con botón de descarga del APK

## Pendiente / mejoras futuras

- [ ] Sacar las líneas viejas de usuario/contraseña del GitHub Secret `APP_ENV` (ya no se usan, pero conviene limpiar)
- [ ] Probar el circuito completo de registro (crear cuenta → código por email → confirmar) con un email real — se verificó la UI pero no se creó una cuenta de prueba real en el User Pool
- [ ] Polly TTS automática para críticas (hoy usa expo-speech como fallback; para Polly real necesitaría integrarse a `NotificationContext`)
- [ ] Feedback loop: hoy el aprendizaje es solo vía reglas explícitas (chat), no hay re-inyección de historial de boost/open al prompt del agente
- [ ] Theming claro/oscuro del sistema operativo (hoy solo Entrenar tenía paleta fija — revisar si sigue aplicando tras el refactor)
- [ ] Tests E2E
- [ ] Limpiar `strings.xml`'s `api_base_url` (sin uso desde que `PrioriaFcmService.kt` dejó de llamar al backend)
