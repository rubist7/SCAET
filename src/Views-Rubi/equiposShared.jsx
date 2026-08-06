import QRCode from 'react-qr-code'
import { AppIcon } from '../components/Sidebar'
import { formatShortDate, getEquipmentQrValue, statusClass, warrantyClass } from './equiposData'

export function EquipmentShell({ children }) {
  return <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">{children}</div>
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex max-w-full rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(status)}`}>
      {status}
    </span>
  )
}

export function WarrantyBadge({ warrantyEnd, compact = false }) {
  const label = warrantyEnd && warrantyEnd !== '-'
    ? `${compact ? 'Garantia ' : 'Vence '}${formatShortDate(warrantyEnd)}`
    : 'Sin garantia'

  return (
    <span className={`inline-flex max-w-full rounded-full px-3 py-1 text-xs font-extrabold ${warrantyClass(warrantyEnd)}`}>
      {label}
    </span>
  )
}

export function EquipmentPhoto({ equipment, size = 'md' }) {
  const sizes = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-40 w-full',
    preview: 'aspect-video h-auto w-full',
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
    yubikey: 'yubikey',
    telefono:'telefono',
    tarjeta:'tarjeta',
  }[equipment.photoKind ?? equipment.type?.toLowerCase()] ?? 'monitor'

  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e6ddcf] bg-[#f2ece0] text-[#201d31] ${sizes[size]}`}>
      {equipment.photoUrl ? (
        <img src={equipment.photoUrl} alt="" className={`h-full w-full ${size === 'preview' ? 'object-contain p-3' : 'object-cover'}`} />
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

export function Field({ label, name, value, onChange, placeholder, type = 'text', required = false, min, readOnly = false, error = '', inputRef, className = '' }) {
  return (
    <div className={className}>
      <label className="block">
        <span className="mb-2 block text-[11px] font-extrabold text-[#8d88a2]">{label}</span>
        <input
          ref={inputRef}
          name={name}
          type={type}
          min={min}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          aria-invalid={error ? 'true' : undefined}
          className={`h-11 w-full scroll-mt-28 rounded-xl border bg-[#f2ece0] px-4 text-sm font-bold text-[#2a263a] outline-none transition focus:bg-white focus:ring-2 read-only:text-[#8d88a2] ${error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : 'border-[#e2d9c9] focus:border-blue-300 focus:ring-blue-100'}`}
        />
      </label>
      {error && <p className="mt-1 text-xs font-bold text-rose-600" role="alert">{error}</p>}
    </div>
  )
}
