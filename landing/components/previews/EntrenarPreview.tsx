import Icon from '../Icon';

export default function EntrenarPreview() {
  return (
    <div className="flex h-full w-full flex-col bg-train-background text-train-on-surface">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-train-surface-container-high px-4">
        <div className="flex items-center gap-1.5">
          <Icon name="shield_with_heart" filled className="text-train-primary" />
          <span className="text-base font-bold text-train-primary-container">Prioria</span>
        </div>
        <Icon name="more_vert" className="text-train-on-surface-variant" />
      </header>
      <div className="px-4 pt-3 text-center">
        <p className="text-sm font-bold">Chat de Entrenamiento IA</p>
        <p className="mt-1 text-[10px] text-train-on-surface-variant">
          Entrena a tu asistente explicando qué es crítico para vos.
        </p>
      </div>
      <main className="flex-1 space-y-3 overflow-hidden px-4 py-3">
        <div className="flex max-w-[85%] items-start gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-train-surface-container-high">
            <Icon name="psychology" filled className="text-xs text-train-primary" />
          </div>
          <div className="rounded-2xl rounded-tl-none border border-train-surface-container-high bg-train-surface-container p-2.5">
            <p className="text-[11px]">¡Hola! Decime qué notificaciones priorizar o silenciar.</p>
          </div>
        </div>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none bg-train-primary-container p-2.5">
          <p className="text-[11px] text-train-on-primary-container">
            Solo avisame de transferencias superiores a $50k
          </p>
        </div>
        <div className="flex max-w-[85%] items-start gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-train-surface-container-high">
            <Icon name="psychology" filled className="text-xs text-train-primary" />
          </div>
          <div className="rounded-2xl rounded-tl-none border border-train-surface-container-high bg-train-surface-container p-2.5">
            <p className="text-[11px]">
              Entendido. Transferencias por debajo de $50.000 se silencian y agrupan en tu
              resumen diario.
            </p>
          </div>
        </div>
      </main>
      <div className="shrink-0 border-t border-train-surface-container-high px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-train-surface-container-high bg-train-surface-container-low py-1.5 pl-3 pr-1">
          <span className="flex-1 text-[10px] text-train-on-surface-variant">
            Escribe una regla...
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-train-primary-container">
            <Icon name="send" filled className="text-xs text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
