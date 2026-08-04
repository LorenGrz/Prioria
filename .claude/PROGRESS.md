# Prioria — Contexto de avance

Checkpoint para no perder foco entre sesiones/agentes. Actualizar acá en hitos importantes, no en cada paso.

## Para el agente que retoma esto

Esta sesión (Cowork, sandbox sin acceso a AWS/Firebase/Android real) dejó
**todo el código escrito y verificado estáticamente** (tsc, cfn-lint, next
build), pero no pudo ejecutar nada que requiera credenciales o hardware:
no hay AWS CLI configurado, no hay cuenta de Firebase, no hay Android
Studio/emulador, no hay `sam` CLI instalado. Si el próximo agente tiene esos
permisos, el trabajo que sigue es en este orden:

1. **Deploy del backend** (`/backend`) — ver sección "Backend" abajo para
   prerequisitos exactos (Bedrock model access, secret de FCM, etc.) y
   correr `sam build && sam deploy --guided`.
2. **Conectar la app RN al backend real** — hoy (`/src/screens/*.tsx`) todas
   las pantallas usan `useState` local mockeado, no hay ningún `fetch`/SDK
   de Cognito todavía. Falta: cliente de Cognito (SRP) para login/signup,
   capa de API (`src/lib/api.ts` no existe aún — crearla), y reemplazar el
   estado local de cada pantalla por datos reales (preferencias, historial,
   entrenar).
3. **NotificationListenerService nativo** — esto requiere un dev build de
   Expo (`eas build` o prebuild local), no funciona en Expo Go. Es Android
   puro, hay que escribir el módulo nativo (Kotlin) que escucha
   notificaciones del sistema y las postea a `POST /notifications`.
4. **Widget de Android** — depende del punto 3 (necesita el dev build) y
   del push de FCM ya llegando (backend ya lo manda, falta el widget que lo
   consuma).
5. **Landing** (`/landing`) — deploy a S3+CloudFront cuando el usuario tenga
   el bucket/distribución armados (ver `landing/README.md`).

Nada de esto se puede validar sin las credenciales/entorno reales, así que
si el próximo agente tampoco los tiene, lo más útil es seguir en el mismo
plano que esta sesión: código, no ejecución.

## Qué es
App RN (Android-first) que intercepta notificaciones, un agente les asigna prioridad según contexto del usuario, y las importantes aparecen en un widget. Refuerzo: abrir = señal débil, marcar importante = señal fuerte, abrir la app brevemente desde el widget = señal media (sube el score de esa notificación puntual). Lectura de voz automática de críticas vía Amazon Polly.

## Stack decidido
- **Mobile**: Expo (SDK 57) + React Native, Android-only MVP (NotificationListenerService no existe en iOS ni en Expo Go — requiere dev build nativo)
- **Estilos**: NativeWind (Tailwind es el approach correcto para RN — confirmado con el usuario y ya migrado), tokens Material 3 tomados 1:1 de los 6 mockups HTML del usuario (paleta light para 5 pantallas + paleta dark fija solo para Entrenar, namespaced como `train-*` en tailwind.config.js para no chocar con la paleta light)
- **Navegación**: React Navigation — stack de onboarding + bottom tabs (Inicio, Filtros, Entrenar, Historial, Voz). Sin tab "Probar" (se sacó del mockup original a pedido).
- **Auth**: Amazon Cognito User Pool, email como username/key, SRP desde la app (nunca vemos password en texto plano). API Gateway HTTP API valida el JWT vía Cognito authorizer.
- **Backend**: 100% serverless AWS (cuenta propia del usuario, no la de workshop) — SAM, Lambda (Node.js para CRUD/API, Python para los dos Lambdas de agente porque Strands Agents SDK es Python-native), API Gateway, SQS, DynamoDB, S3 (clips de voz).
- **Agente**: Strands Agents SDK + Bedrock (mismo patrón que `LorenGrz/simple-agent` — revisar ese repo antes de deployar porque el SDK cambia rápido), sin reusar el ARN de permissions boundary de la cuenta de workshop.
- **TTS**: Amazon Polly — voces reales `Lucia` (neural) y `Enrique` (standard), mapeadas 1:1 a los nombres del mockup.
- **Push al widget**: FCM HTTP v1 directo desde Lambda (no Expo push service, porque igual se necesita dev build nativo por el NotificationListenerService). Decisión resuelta — antes estaba pendiente evaluar push vs polling.
- **Landing/portfolio**: Next.js 16 (App Router) + Tailwind, `output: 'export'`, sitio estático separado en `/landing`, pensado para CloudFront + S3 con OAC.

## Pantallas (las 6, portadas de HTML a RN/NativeWind este sprint)
1. Onboarding (4 steps: bienvenida, permisos, preferencias, feature highlight) — swiper horizontal con paginación manual, slider de umbral
2. Inicio — status escucha, toggle voz, última notificación, resumen del día (sin botón "Probar notificación", como se pidió)
3. Filtros — sensibilidad IA (slider), categorías (switches), umbral de lectura automática (radio)
4. Historial — lista con feedback thumb up/down, chips de filtro, expand/pause "Escuchar"
5. Entrenar — chat con el agente, paleta dark fija (`train-*`), input + burbujas
6. Voz — selector Lucía/Enrique, idioma, velocidad (slider), banner "Conectado a Amazon Polly"

## Mapa de archivos

```
/                       app Expo (raíz del repo)
  App.tsx               entry point, carga fuentes + NavigationContainer
  tailwind.config.js    tokens de diseño (light + train-*)
  src/
    components/Icon.tsx, TopAppBar.tsx
    navigation/RootNavigator.tsx, MainTabs.tsx
    screens/*.tsx        las 6 pantallas
    types/navigation.ts

/backend                SAM app
  template.yaml          Cognito, DynamoDB x3, SQS x2, HTTP API, ~10 Lambdas
  src/handlers/          Lambdas Node.js (CRUD/API)
  src/agent/             Lambdas Python (Strands + Bedrock): process_notification.py, train.py
  src/lib/                helpers compartidos (dynamo, auth, response, scoring)
  README.md               pasos de deploy exactos

/landing                 Next.js 16, sitio estático
  app/page.tsx            landing completo
  components/previews/    recreaciones estáticas de 3 pantallas para el portfolio
  README.md               deploy a S3+CloudFront
```

## Stack AWS desplegado (2026-08-04)

Stack: `prioria-dev` — `us-east-1`

| Output | Valor |
|--------|-------|
| ApiUrl | `https://8lmjsd9rc9.execute-api.us-east-1.amazonaws.com/dev` |
| UserPoolId | `us-east-1_McNa9MqHh` |
| UserPoolClientId | `1ei1ta3vp0g2sbormecg1h2qkt` |
| VoiceClipsBucketName | `prioria-voice-clips-dev-493735739644` |
| NotificationsTableName | `prioria-notifications-dev` |

FCM secret placeholder: `arn:aws:secretsmanager:us-east-1:493735739644:secret:prioria/fcm-service-account-nyyPiB`  
→ Reemplazar con el JSON real del service account de Firebase cuando se cree el proyecto.

Bedrock: necesita completar el formulario de uso de Anthropic en la consola AWS → Bedrock → Model access → Request access para `us.anthropic.claude-haiku-4-5-20251001-v1:0`.

Para redesplegar: `cd backend && sam build && sam deploy` (samconfig.toml ya configurado).

BedrockModelId actualizado: `us.anthropic.claude-haiku-4-5-20251001-v1:0` (claude-3-5-haiku era EOL).

## Landing desplegada (2026-08-04)

- **Bucket S3**: `prioria-landing-493735739644` (us-east-1, acceso público bloqueado)
- **CloudFront distribution**: `E27GXNA3NNHD70`
- **URL**: `https://d1c6xk2jegfebf.cloudfront.net` (tarda ~15 min en estar activa tras la primera creación)
- **OAC**: `ESSX2B90LB8WF`

Para redesplegar la landing:
```bash
cd landing && npm run build
aws s3 sync out/ s3://prioria-landing-493735739644 --delete
aws cloudfront create-invalidation --distribution-id E27GXNA3NNHD70 --paths "/*"
```

## Estado actual
- [x] Scaffold Expo + push a GitHub (LorenGrz/Prioria)
- [x] NativeWind instalado y configurado (babel.config.js, metro.config.js, global.css, nativewind-env.d.ts)
- [x] Tokens de diseño portados a tailwind.config.js (paleta light + `train-*` para Entrenar, spacing, borderRadius, fontFamily, fontSize — normalicé algunas inconsistencias menores entre mockups, ej. headline-lg-mobile)
- [x] Fuentes: Plus Jakarta Sans + Atkinson Hyperlegible Next vía @expo-google-fonts, cargadas en App.tsx con gate de splash screen
- [x] Navegación: RootNavigator (stack Onboarding→Main) + MainTabs (5 tabs con pill activo estilo mockup)
- [x] Las 6 pantallas construidas en src/screens/, interactivas (useState local, sin backend conectado todavía)
- [x] tsc --noEmit limpio (tsconfig.json de la raíz excluye /backend y /landing a propósito, cada uno tiene su propio toolchain); sanity build con Metro no se pudo correr completo en este sandbox (permisos de escritura en la carpeta `dist` del mount de Windows) — falta correr `expo start` real en la máquina del usuario para probar en dispositivo/emulador
- [x] Backend AWS scaffolded en /backend: template.yaml (SAM) con Cognito, 3 tablas DynamoDB (Users/Notifications/Rules), 2 colas SQS (notifications + push, con DLQ), HTTP API con Cognito authorizer, ~10 Lambdas. Válido según cfn-lint (0 errores, solo warning de runtime ya corregido a nodejs24.x). Falta: `sam deploy` real (requiere cuenta AWS, acceso a modelo Bedrock habilitado, secret de FCM en Secrets Manager) — ver `backend/README.md` para los comandos exactos y qué parámetros pasar (`FcmServiceAccountSecretArn`, `FcmProjectId`)
- [x] Landing en /landing: Next.js 16 + Tailwind, hero + galería de 3 phone-frames (Inicio/Historial/Entrenar) + features + stack + footer. Build y export estático verificados (npm install + next build corrieron limpio, `out/` generado, 848K)
- [ ] Theming claro/oscuro a nivel de sistema operativo (fuera de scope por ahora — solo Entrenar tiene paleta fija distinta)
- [ ] Conectar la app RN al backend real — falta cliente de Cognito (SRP, ej. `amazon-cognito-identity-js` o Amplify Auth), capa de API para llamar a los endpoints de `/backend`, y reemplazar el estado local mockeado de cada pantalla
- [ ] NotificationListenerService nativo (requiere dev build, no Expo Go — módulo Kotlin que escucha notificaciones y las postea a `POST /notifications`)
- [ ] Widget de Android (consumir el push de FCM que el backend ya manda; el widget en sí no está construido)
- [ ] Retraining real con el historial de feedback (hoy el agente solo lee RulesTable como contexto fuerte; feedback/open/boost quedan guardados en NotificationsTable pero no se re-inyectan al prompt todavía — ver nota en `backend/README.md`)

## Notas técnicas
- Mapeo de íconos: mockups usan Material Symbols (web), RN usa `MaterialCommunityIcons` de @expo/vector-icons — hay un mapeo manual en `src/components/Icon.tsx` y por pantalla, verificado contra el glyph map real del paquete instalado (no debería haber íconos en blanco). Si se agregan pantallas nuevas, correr el mismo tipo de chequeo contra `node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json` antes de asumir que un nombre de ícono existe.
- El mount de Windows (`C:\Users\loren\proyects\Prioria`) tiene un bug intermitente de permisos al borrar/renombrar archivos dentro de `node_modules` una vez creados (EPERM/ENOTEMPTY) — si un `npm install` falla así, no es el código: probar de nuevo, o instalar en un scratch dir (ej. `/tmp`) y copiar/verificar desde ahí, como se hizo para validar `/landing` en esta sesión.
- Backend usa dos runtimes a propósito: Node 24.x para todo lo CRUD/API (esbuild bundlea cada handler), Python 3.13 solo para `process_notification.py` y `train.py` (Strands SDK). No mezclar — si se agrega lógica de agente nueva, va en Python; todo lo demás en Node.
- `backend/README.md` y `landing/README.md` tienen los comandos de deploy exactos, no hace falta reconstruirlos de memoria.
