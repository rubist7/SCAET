// Datos base del dashboard.
// Cuando Firestore ya tenga equipos/usuarios, cambia estos valores por datos reales.
const summaryCards = [
  { label: 'Total equipos', value: 0, color: 'text-blue-500', bubble: 'bg-blue-100' },
  { label: 'Asignados', value: 0, color: 'text-emerald-400', bubble: 'bg-emerald-100' },
  { label: 'Disponibles', value: 0, color: 'text-blue-400', bubble: 'bg-blue-100' },
  { label: 'Mantenimiento', value: 0, color: 'text-amber-400', bubble: 'bg-amber-100' },
  { label: 'Bajas', value: 0, color: 'text-rose-400', bubble: 'bg-rose-100' },
]

function EmptyTable({ title, actionLabel, columns, message }) {
  return (
    <section className="space-y-3">
      {/* Encabezado de cada tabla/resumen secundario. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-[#201d31]">{title}</h2>
        {actionLabel && (
          <button className="text-sm font-extrabold text-blue-500 hover:text-blue-600">
            {actionLabel}
          </button>
        )}
      </div>

      {/* Tabla vacia para mantener la estructura cuando aun no haya registros. */}
      <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-sm">
        <div className="grid bg-[#eee7d9] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-blue-300 sm:grid-cols-4">
          {columns.map((column) => (
            <span key={column} className="hidden sm:block">{column}</span>
          ))}
          <span className="sm:hidden">{title}</span>
        </div>
        <div className="flex min-h-28 items-center justify-center px-5 py-8 text-center">
          <p className="max-w-md text-sm font-bold text-[#8d88a2]">{message}</p>
        </div>
      </div>
    </section>
  )
}

function Dashboard() {
  return (
    <div className="space-y-8">
            <section className="space-y-5">
              <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">Resumen General</h1>

              {/* Tarjetas de metricas. Cambia summaryCards para actualizar los numeros. */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map((card) => (
                  <article key={card.label} className="relative overflow-hidden rounded-[1.35rem] bg-white px-6 py-5 shadow-sm">
                    <div className={`absolute -bottom-5 -right-5 h-20 w-20 rounded-full ${card.bubble}`} />
                    <p className="text-xs font-extrabold text-blue-300">{card.label}</p>
                    <p className={`mt-1 text-4xl font-extrabold leading-none ${card.color}`}>{card.value}</p>
                  </article>
                ))}
              </div>
            </section>

            <EmptyTable
              title="Últimos equipos registrados"
              actionLabel="Ver todos +"
              columns={['Equipo', 'Marca / Modelo', 'Área', 'Estado']}
              message="Aún no hay equipos registrados. Cuando agregues equipos, aparecerán aquí los últimos movimientos."
            />

            <EmptyTable
              title="Asignaciones temporales próximas a vencer"
              columns={['Equipo', 'Colaborador', 'Vence', 'Días restantes']}
              message="No hay asignaciones temporales próximas a vencer por ahora."
            />
          </div>
  )
}

export default Dashboard
