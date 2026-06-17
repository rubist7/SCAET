import { useState } from 'react'
import QRCode from 'react-qr-code'
import AppSidebar, { AppIcon } from '../components/Sidebar'
import { formatShortDate, getEquipmentQrValue, statusClass, warrantyClass } from './equiposData'

export function EquipmentShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f6f2ec] font-sans text-[#2a263a]">
      <div className="mx-auto flex min-h-screen max-w-[1920px] bg-[#f6f2ec]">
        <AppSidebar isOpen={sidebarOpen} activePage="Equipos" />

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-[#201d31]/30 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#ece7df] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-[#6f6a85] shadow-sm lg:hidden"
                aria-label="Abrir menu"
              >
                <AppIcon name="menu" />
              </button>
              <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.32em] text-[#8d88a2] sm:text-sm">
                Inventario de equipos
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden rounded-full bg-violet-50 px-5 py-2 text-sm font-extrabold text-violet-500 sm:inline-flex">
                Administrador
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-violet-300 bg-violet-50 text-xs font-extrabold text-violet-500">
                JE
              </span>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(status)}`}>
      {status}
    </span>
  )
}

export function WarrantyBadge({ warrantyEnd, compact = false }) {
  const label = warrantyEnd && warrantyEnd !== '-'
    ? `${compact ? 'Garantia ' : 'Vence '}${formatShortDate(warrantyEnd)}`
    : 'Sin garantia'

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${warrantyClass(warrantyEnd)}`}>
      {label}
    </span>
  )
}

export function EquipmentPhoto({ equipment, size = 'md' }) {
  const sizes = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-40 w-full',
  }
  const iconBoxClass = size === 'lg' ? 'h-20 w-24' : 'h-8 w-8'
  const iconClass = size === 'lg' ? 'h-10 w-10' : 'h-5 w-5'
  const iconName = {
    laptop: 'laptop',
    ipad: 'tablet',
    tablet: 'tablet',
    celular: 'tablet',
    keyboard: 'keyboard',
    mouse: 'mouse',
    desktop: 'monitor',
    computadora: 'monitor',
    monitor: 'monitor',
  }[equipment.photoKind ?? equipment.type?.toLowerCase()] ?? 'monitor'

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e6ddcf] bg-[#f2ece0] text-[#201d31] ${sizes[size]}`}>
      {equipment.photoUrl ? (
        <img src={equipment.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className={`flex items-center justify-center rounded-xl bg-white/70 ${iconBoxClass}`}>
          <AppIcon name={iconName} className={iconClass} />
        </div>
      )}
    </div>
  )
}

export function QrCode({ equipment, value, size = 'md' }) {
  const qrValue = value || (equipment ? getEquipmentQrValue(equipment) : 'SCAET-PENDIENTE')
  const sizeClass = size === 'lg' ? 'h-36 w-36 p-3' : 'h-12 w-12 p-1.5'
  const qrSize = size === 'lg' ? 120 : 40

  return (
    <div className={`flex items-center justify-center rounded-lg bg-white ${sizeClass}`}>
      <QRCode value={qrValue} size={qrSize} bgColor="#ffffff" fgColor="#201d31" level="M" />
    </div>
  )
}

export function Field({ label, name, value, onChange, placeholder, type = 'text', required = false, min, readOnly = false, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">{label}</span>
      <input
        name={name}
        type={type}
        min={min}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className="h-11 w-full rounded-xl border border-[#e2d9c9] bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 read-only:text-[#8d88a2]"
      />
    </label>
  )
}
