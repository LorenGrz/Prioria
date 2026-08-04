import Icon from '../components/Icon';
import PhoneFrame from '../components/PhoneFrame';
import InicioPreview from '../components/previews/InicioPreview';
import HistorialPreview from '../components/previews/HistorialPreview';
import EntrenarPreview from '../components/previews/EntrenarPreview';

const FEATURES = [
  {
    icon: 'notifications_active',
    title: 'Intercepta, no reemplaza',
    body: 'Un NotificationListenerService en Android lee cada notificación apenas llega, sin depender de que el usuario abra la app.',
  },
  {
    icon: 'psychology',
    title: 'Un agente con contexto',
    body: 'Strands Agents SDK sobre Amazon Bedrock puntúa cada alerta combinando tus reglas explícitas, categorías habilitadas y sensibilidad configurada.',
  },
  {
    icon: 'record_voice_over',
    title: 'Lectura crítica en voz alta',
    body: 'Lo que cruza tu umbral de prioridad se lee automáticamente con Amazon Polly — manos libres, sin desviar la atención de la tarea.',
  },
  {
    icon: 'thumb_up',
    title: 'Aprende de tu feedback',
    body: 'Abrir una notificación es señal débil, marcarla importante es señal fuerte, abrir la app desde el widget la refuerza. Todo entrena al agente.',
  },
  {
    icon: 'tune',
    title: 'Control fino por categoría',
    body: 'Bancos, pagos, trabajo, seguridad, clientes, entregas — cada una con su propio interruptor y umbral de sensibilidad.',
  },
  {
    icon: 'forum',
    title: 'Entrená con lenguaje natural',
    body: '"Solo avisame de transferencias superiores a $50k" se convierte en una regla que el agente aplica de inmediato.',
  },
];

const STACK = [
  'Expo (React Native, Android-first)',
  'NativeWind + Material 3',
  'AWS Lambda (Node.js + Python)',
  'API Gateway + Amazon Cognito',
  'DynamoDB + SQS',
  'Strands Agents SDK + Amazon Bedrock',
  'Amazon Polly',
  'Firebase Cloud Messaging',
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pb-16 pt-20 text-center md:pt-28">
        <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-1.5">
          <Icon name="shield_with_heart" filled className="text-primary" />
          <span className="text-sm font-bold text-primary">Prioria</span>
        </div>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight text-primary md:text-6xl">
          Atención blindada para quien no puede mirar el celular todo el día
        </h1>
        <p className="max-w-2xl text-lg text-on-surface-variant">
          Prioria filtra tus notificaciones con un agente que aprende tu contexto, lee en voz
          alta lo crítico y te muestra lo importante en un widget — pensado para choferes,
          supervisores de logística y cualquiera que no pueda estar pendiente del teléfono.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://github.com/LorenGrz/Prioria"
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
          >
            <Icon name="code" />
            Ver el código
          </a>
          <a
            href="#features"
            className="flex items-center gap-2 rounded-xl border border-outline-variant px-6 py-3 font-bold text-primary transition-colors hover:bg-surface-container-low"
          >
            Cómo funciona
          </a>
        </div>
      </section>

      {/* Phone preview gallery */}
      <section className="bg-surface-container-low py-16">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-center gap-10 px-6">
          <PhoneFrame label="Inicio">
            <InicioPreview />
          </PhoneFrame>
          <PhoneFrame label="Historial">
            <HistorialPreview />
          </PhoneFrame>
          <PhoneFrame label="Entrenar (chat con el agente)">
            <EntrenarPreview />
          </PhoneFrame>
        </div>
        <p className="mx-auto mt-8 max-w-xl px-6 text-center text-sm text-on-surface-variant">
          Más pantallas en la app: Onboarding, Filtros y Voz — mismas 6 vistas del prototipo,
          llevadas a React Native con NativeWind.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-3 text-center font-display text-3xl font-bold text-primary">
          Cómo protege tu atención
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-on-surface-variant">
          Cada notificación pasa por el mismo circuito: interceptar, puntuar, y solo interrumpir
          si de verdad importa.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container">
                <Icon name={f.icon} className="text-on-primary-container" />
              </div>
              <h3 className="mb-2 font-bold text-on-surface">{f.title}</h3>
              <p className="text-sm text-on-surface-variant">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="bg-primary py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold">100% serverless en AWS</h2>
          <p className="mx-auto mb-10 max-w-2xl text-white/80">
            Sin servidores propios: ingesta, priorización, feedback y voz corren en Lambda,
            detrás de API Gateway, con Cognito para auth y DynamoDB como única fuente de verdad.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
        <div className="flex items-center gap-1.5">
          <Icon name="shield_with_heart" filled className="text-primary" />
          <span className="font-display font-bold text-primary">Prioria</span>
        </div>
        <p className="text-sm text-on-surface-variant">
          Proyecto de portfolio — Lorenzo Graizzaro.
        </p>
        <a
          href="mailto:lorenzograizzaro55@gmail.com"
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          lorenzograizzaro55@gmail.com
        </a>
      </footer>
    </main>
  );
}
