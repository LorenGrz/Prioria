import Icon from '../Icon';

export default function InicioPreview() {
  return (
    <div className="flex h-full w-full flex-col bg-background text-on-surface">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-outline-variant px-4">
        <div className="flex items-center gap-1.5">
          <Icon name="shield_with_heart" filled className="text-primary" />
          <span className="font-display text-base font-bold text-primary">Prioria</span>
        </div>
        <Icon name="sensors" className="text-on-surface-variant" />
      </header>
      <main className="flex-1 space-y-3 overflow-hidden px-4 py-3">
        <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low p-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-bold">Modo escucha activo</span>
          </div>
          <Icon name="waves" className="text-sm text-on-surface-variant" />
        </div>
        <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-white shadow-sm">
          <Icon name="voice_over_off" className="text-lg" />
          <span className="text-xs font-bold">Pausar Lectura de Voz</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex">
            <div className="w-1.5 bg-error" />
            <div className="flex-1 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-primary">Mercado Pago</span>
                <span className="rounded-full bg-error-container px-1.5 py-0.5 text-[9px] font-bold text-on-error-container">
                  CRÍTICA
                </span>
              </div>
              <p className="text-sm font-bold">Transferencia de $150.000</p>
              <p className="text-xs text-on-surface-variant">Has recibido un pago de Juan Pérez.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container p-3">
            <div>
              <p className="text-[10px] text-on-surface-variant">Ignoradas</p>
              <p className="text-2xl font-bold">45</p>
            </div>
            <Icon name="notifications_off" className="text-on-surface-variant" />
          </div>
          <div className="rounded-xl bg-primary-container p-3 text-on-primary-container">
            <Icon name="check_circle" filled className="text-sm" />
            <p className="mt-1 text-[10px] opacity-80">Leídas</p>
            <p className="text-lg font-bold">12</p>
          </div>
          <div className="rounded-xl bg-surface-container-highest p-3">
            <Icon name="pending" className="text-sm" />
            <p className="mt-1 text-[10px] text-on-surface-variant">Pendientes</p>
            <p className="text-lg font-bold">3</p>
          </div>
        </div>
      </main>
      <nav className="flex h-14 shrink-0 items-center justify-around border-t border-outline-variant bg-surface px-1">
        {[
          { icon: 'home', label: 'Inicio', active: true },
          { icon: 'tune', label: 'Filtros' },
          { icon: 'forum', label: 'Entrenar' },
          { icon: 'history', label: 'Historial' },
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
