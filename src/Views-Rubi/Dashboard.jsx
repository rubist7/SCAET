import { useState } from 'react'
import AppSidebar, { AppIcon } from '../components/Sidebar'

// Datos base del dashboard.
// Cuando Firestore ya tenga equipos/usuarios, cambia estos valores por datos reales.
const summaryCards = [
  { label: 'Total equipos', value: 0, color: 'text-violet-500', bubble: 'bg-violet-100' },
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
          <button className="text-sm font-extrabold text-violet-500 hover:text-violet-600">
            {actionLabel}
          </button>
        )}
      </div>

      {/* Tabla vacia para mantener la estructura cuando aun no haya registros. */}
      <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-sm">
        <div className="grid bg-[#eee7d9] px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-violet-300 sm:grid-cols-4">
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f6f2ec] font-sans text-[#2a263a]">
      {/* Layout principal: sidebar en laptop/iPad, drawer simple en movil. */}
      <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#f6f2ec]">
        <AppSidebar isOpen={sidebarOpen} activePage="Dashboard" />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-[#201d31]/30 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1">
          {/* Topbar: titulo de pagina y perfil. */}
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#ece7df] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-100 bg-white text-[#6f6a85] shadow-sm lg:hidden"
                aria-label="Abrir menú"
              >
                <AppIcon name="menu" />
              </button>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.32em] text-[#8d88a2] sm:text-sm">
                Inventario de los equipos
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-violet-50 px-5 py-2 text-sm font-extrabold text-violet-500 sm:inline-flex">
                Administrador
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-violet-300 bg-violet-50 text-xs font-extrabold text-violet-500">
                JE
              </span>
            </div>
          </header>

          {/* Contenido del dashboard: todos los datos estan en cero hasta conectar la base. */}
          <div className="space-y-8 px-4 py-7 sm:px-6 lg:px-8">
            <section className="space-y-5">
              <h1 className="text-2xl font-extrabold text-[#201d31] sm:text-3xl">Resumen general</h1>

              {/* Tarjetas de metricas. Cambia summaryCards para actualizar los numeros. */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map((card) => (
                  <article key={card.label} className="relative overflow-hidden rounded-[1.35rem] bg-white px-6 py-5 shadow-sm">
                    <div className={`absolute -bottom-5 -right-5 h-20 w-20 rounded-full ${card.bubble}`} />
                    <p className="text-xs font-extrabold text-violet-300">{card.label}</p>
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
        </main>
      </div>
    </div>
  )
}

export default Dashboard
