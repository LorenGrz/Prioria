import Icon from '../Icon';

const ITEMS = [
  {
    border: 'border-l-4 border-l-error',
    label: 'Crítico',
    labelColor: 'text-error',
    time: '14:20',
    title: 'Correo de Gerencia',
    body: 'Aprobación inmediata para el despacho del convoy A-42.',
    icon: 'mail',
  },
  {
    border: 'border-l-4 border-l-orange-500',
    label: 'Aviso',
    labelColor: 'text-orange-600',
    time: '13:45',
    title: 'WhatsApp: Logística',
    body: 'Cambio en la ruta de retorno por obras.',
    icon: 'chat',
  },
  {
    border: 'border-l-4 border-l-primary',
    label: 'Info',
    labelColor: 'text-primary',
    time: '11:10',
    title: 'Calendario: Reunión',
    body: 'Revisión semanal de equipos en 30 min.',
    icon: 'calendar_today',
  },
];

export default function HistorialPreview() {
  return (
    <div className="flex h-full w-full flex-col bg-background text-on-surface">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant px-4">
        <div className="flex items-center gap-1.5">
          <Icon name="shield_with_heart" filled className="text-primary" />
          <span className="font-display text-base font-bold text-primary">Prioria</span>
        </div>
        <Icon name="sensors" className="text-on-surface-variant" />
      </header>
      <main className="flex-1 space-y-2.5 overflow-hidden px-4 py-3">
        <p className="text-sm font-bold text-primary">Historial de Alertas</p>
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5 shadow-sm ${item.border}`}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-container-high">
                <Icon name={item.icon} className="text-xs text-primary" />
              </div>
              <span className={`text-[9px] font-bold uppercase ${item.labelColor}`}>{item.label}</span>
              <span className="text-[9px] text-on-surface-variant">• {item.time}</span>
            </div>
            <p className="text-xs font-bold">{item.title}</p>
            <p className="text-[10px] leading-tight text-on-surface-variant">{item.body}</p>
            <div className="mt-2 flex items-center justify-between border-t border-outline-variant pt-1.5">
              <div className="flex items-center gap-1 text-primary">
                <Icon name="play_circle" filled className="text-sm" />
                <span className="text-[10px] font-bold">Escuchar</span>
              </div>
              <div className="flex gap-1">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-outline">
                  <Icon name="thumb_up" className="text-[10px]" />
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-outline">
                  <Icon name="thumb_down" className="text-[10px]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>
      <nav className="flex h-14 shrink-0 items-center justify-around border-t border-outline-variant bg-surface px-1">
        {[
          { icon: 'home', label: 'Inicio' },
          { icon: 'tune', label: 'Filtros' },
          { icon: 'forum', label: 'Entrenar' },
          { icon: 'history', label: 'Historial', active: true },
          { icon: 'record_voice_over', label: 'Voz' },
        ].map((tab) => (
          <div
            key={tab.label}
            className={`flex flex-col items-center rounded-full px-2 py-1 ${tab.active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'}`}
          >
            <Icon name={tab.icon} filled={tab.active} className="text-base" />
            <span className="text-[8px] font-semibold">{tab.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
