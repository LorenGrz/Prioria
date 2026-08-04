# Prioria

App Android que intercepta notificaciones del sistema, las prioriza con un agente de IA y muestra las críticas en un widget. Lectura de voz automática vía Amazon Polly.

## Qué hace

1. Un servicio nativo (`NotificationListenerService`) captura cada notificación y la envía al backend.
2. Un agente serverless (Strands Agents SDK + Bedrock Claude) analiza el contenido, las preferencias del usuario y las reglas aprendidas en el chat, y asigna un score de prioridad.
3. Si el score supera el umbral del usuario, la notificación se envía al widget vía FCM y se lee por voz (Amazon Polly, voces Lucía/Enrique).
4. El usuario refuerza el modelo con feedback explícito (👍/👎), apertura desde el widget, y conversación directa con el agente en la pantalla Entrenar.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo SDK 57 + React Native (Android-first) |
| Estilos | NativeWind (Tailwind para RN), tokens Material 3 |
| Navegación | React Navigation (stack + bottom tabs) |
| Auth | Amazon Cognito User Pool, SRP desde la app |
| Backend | AWS SAM — Lambda (Node 24 + Python 3.13), API Gateway HTTP, SQS, DynamoDB |
| Agente | Strands Agents SDK + Amazon Bedrock (Claude Haiku 4.5) |
| TTS | Amazon Polly (voces neurales `Lucia` y `Enrique`) |
| Push | FCM HTTP v1 desde Lambda |
| Landing | Next.js 16 (App Router, static export) → S3 + CloudFront |

## Estructura del repositorio

```
/               App Expo (raíz)
  App.tsx       Entry point
  src/
    screens/    6 pantallas (Onboarding, Inicio, Filtros, Historial, Entrenar, Voz)
    navigation/ RootNavigator + MainTabs
    components/ Icon, TopAppBar

/backend        Backend serverless (AWS SAM)
  template.yaml Cognito, DynamoDB ×3, SQS ×2, HTTP API, ~10 Lambdas
  src/handlers/ Lambdas Node.js (CRUD / API)
  src/agent/    Lambdas Python (Strands + Bedrock)

/landing        Sitio estático Next.js para portfolio
```

## Correr la app

```bash
npm install
npx expo start
# Escaneá el QR con Expo Go (Android o iPhone para probar la UI)
# Para el feature core (notificaciones + widget) se necesita un dev build nativo en Android
```

## Deployar el backend

Prerequisitos: AWS SAM CLI, Node 20+, Python 3.13, cuenta AWS con acceso a Bedrock habilitado, proyecto Firebase para FCM.

```bash
cd backend
npm install
sam build
sam deploy   # samconfig.toml ya configurado con el stack prioria-dev
```

Stack desplegado: `prioria-dev` en `us-east-1`.  
API URL: `https://8lmjsd9rc9.execute-api.us-east-1.amazonaws.com/dev`

## Pantallas

| Pantalla | Descripción |
|---|---|
| Onboarding | 4 pasos: bienvenida, permisos, preferencias, feature highlight |
| Inicio | Status de escucha, toggle voz, última notificación, resumen del día |
| Filtros | Sensibilidad IA (slider), categorías (switches), umbral de lectura |
| Historial | Lista con feedback 👍/👎, chips de filtro, escuchar notificación |
| Entrenar | Chat con el agente (paleta dark fija) |
| Voz | Selector Lucía/Enrique, idioma, velocidad, banner Amazon Polly |

## Links

- **Landing (portfolio):** https://d1c6xk2jegfebf.cloudfront.net
- **GitHub:** https://github.com/LorenGrz/Prioria
